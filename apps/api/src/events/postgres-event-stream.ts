import { entityChangedSchema, type EntityChanged } from "@pacd/contracts";
import type { Pool, PoolClient } from "pg";

type Send=(event:EntityChanged)=>void;
type Subscriber={send:Send;close:()=>void};

export class PostgresEventStream{
  private readonly pool:Pool;
  private listener:PoolClient|null=null;
  private readonly subscribers=new Map<string,Set<Subscriber>>();
  private reconnectTimer:NodeJS.Timeout|null=null;
  private stopping=false;
  constructor(pool:Pool){this.pool=pool;}
  async start():Promise<void>{
    const client=await this.pool.connect();
    try{await client.query("LISTEN workpilot_events");client.on("notification",message=>{if(message.channel==="workpilot_events"&&message.payload)void this.dispatch(message.payload).catch(()=>undefined);});client.on("error",()=>this.lost(client));client.on("end",()=>this.lost(client));this.listener=client;}
    catch(error){client.release();throw error;}
  }
  isConnected():boolean{return this.listener!==null;}
  private lost(client:PoolClient):void{
    if(this.listener!==client)return;this.listener=null;
    for(const listeners of this.subscribers.values())for(const subscriber of listeners)subscriber.close();
    this.subscribers.clear();
    try{client.release(true);}catch{ /* connection already removed */ }
    this.scheduleReconnect();
  }
  private scheduleReconnect():void{
    if(this.stopping||this.reconnectTimer)return;
    this.reconnectTimer=setTimeout(()=>{this.reconnectTimer=null;void this.start().catch(()=>this.scheduleReconnect());},2000);
  }
  async stop():Promise<void>{
    this.stopping=true;if(this.reconnectTimer){clearTimeout(this.reconnectTimer);this.reconnectTimer=null;}
    if(this.listener){const client=this.listener;this.listener=null;await client.query("UNLISTEN workpilot_events").catch(()=>undefined);client.release();}
    for(const listeners of this.subscribers.values())for(const subscriber of listeners)subscriber.close();
    this.subscribers.clear();
  }
  subscribe(viewerSub:string,send:Send,close:()=>void):()=>void{
    const subscriber={send,close};const listeners=this.subscribers.get(viewerSub)??new Set<Subscriber>();listeners.add(subscriber);this.subscribers.set(viewerSub,listeners);
    return ()=>{listeners.delete(subscriber);if(!listeners.size)this.subscribers.delete(viewerSub);};
  }
  private async dispatch(payload:string):Promise<void>{
    let raw:unknown;try{raw=JSON.parse(payload);}catch{return;}
    if(!raw||typeof raw!=="object")return;
    const object=raw as Record<string,unknown>;
    const occurredAt=typeof object.occurredAt==="string"?new Date(object.occurredAt).toISOString():"";
    const parsed=entityChangedSchema.safeParse({...object,occurredAt});if(!parsed.success)return;
    const event=parsed.data;
    const viewerIds=[...this.subscribers.keys()];if(!viewerIds.length)return;
    let allowed:ReadonlyArray<string>=[];
    if(event.type==="CONFIG_CHANGED"){
      const result=await this.pool.query<{account_sub:string}>("SELECT account_sub FROM accounts WHERE account_sub=ANY($1::text[]) AND status='ACTIVE'",[viewerIds]);allowed=result.rows.map(row=>row.account_sub);
    }else if(event.type==="USER_GRANTS_CHANGED"){
      allowed=viewerIds.filter(id=>id===event.entityId);
    }else{
      const ownerQuery=event.type==="ACTIVITY_CHANGED"?"SELECT user_sub owner_sub FROM activities WHERE activity_id=$1":event.type==="CLAIM_CHANGED"?"SELECT user_sub owner_sub FROM claims WHERE claim_id=$1":event.type==="REQUEST_CHANGED"?"SELECT requester_sub owner_sub FROM requests WHERE request_id=$1":"SELECT owner_sub FROM projects WHERE project_id=$1";
      const owner=(await this.pool.query<{owner_sub:string}>(ownerQuery,[event.entityId])).rows[0]?.owner_sub;if(!owner)return;
      const permission=event.type==="ACTIVITY_CHANGED"?"work.read.scope":event.type==="CLAIM_CHANGED"?"claims.read.scope":event.type==="REQUEST_CHANGED"?"requests.read.scope":"dashboard.read.scope";
      const result=await this.pool.query<{account_sub:string}>(`SELECT a.account_sub FROM accounts a WHERE a.account_sub=ANY($1::text[]) AND a.status='ACTIVE' AND (
        a.account_sub=$2 OR can_access_account(a.account_sub,$2,$3) OR can_access_account(a.account_sub,$2,'dashboard.read.scope')
        ${event.type==="PROJECT_CHANGED"?"OR ((a.role='USER' OR can_view_account(a.account_sub,$2)) AND EXISTS (SELECT 1 FROM project_memberships m WHERE m.project_id=$4 AND m.account_sub=a.account_sub AND m.removed_at IS NULL))":""}
      )`,event.type==="PROJECT_CHANGED"?[viewerIds,owner,permission,event.entityId]:[viewerIds,owner,permission]);
      allowed=result.rows.map(row=>row.account_sub);
    }
    for(const id of allowed)for(const subscriber of this.subscribers.get(id)??[])try{subscriber.send(event);}catch{subscriber.close();}
  }
}
