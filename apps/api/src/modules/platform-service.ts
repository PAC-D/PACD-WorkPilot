import { createHash, randomUUID } from "node:crypto";

import type {
  Account, Activity, AssignProjectMemberInput, AuditRecord, Claim, ClaimTransitionInput, CreateActivityInput,
  CreateClaimInput, CreateLocalAccountInput, CreateProjectInput, CreateRequestInput, DashboardSummary, Department,
  Principal, Project, RequestTransitionInput, UpsertDepartmentInput, WorkRequest,
} from "@pacd/contracts";
import type { Pool, PoolClient } from "pg";

import { CursorCodec } from "../common/cursor.ts";

export interface Page<T> { data: ReadonlyArray<T>; page: { hasMore: boolean; limit: number; nextCursor: string | null } }
export class DomainError extends Error { readonly code: "FORBIDDEN" | "CONFLICT" | "NOT_FOUND"; constructor(code: "FORBIDDEN" | "CONFLICT" | "NOT_FOUND", message: string) { super(message); this.code=code; } }

type MutationResult<T> = { action?:string; data: T; entityId: string; eventType: string; resourceType: string; scope: string; version: number };

const userPermissions = ["work.create.own", "work.read.own", "work.edit.own", "projects.read.assigned", "projects.request_join", "claims.create.own", "claims.read.own", "claims.edit.own", "requests.create.own", "requests.read.own"] as const;
const adminPermissions = ["dashboard.read.scope", "users.read.scope", "work.read.scope", "claims.read.scope", "requests.read.scope"] as const;
const superPermissions = [
  ...userPermissions, "work.read.scope", "projects.manage", "projects.assign", "claims.read.scope", "claims.edit.scope",
  "claims.review.scope", "claims.approve.scope", "claims.mark_paid.scope", "requests.read.scope", "requests.review.scope",
  "users.read.scope", "users.manage", "roles.manage", "settings.manage", "audit.read", "dashboard.read.scope", "reports.export.scope",
] as const;

function iso(value: Date | string): string { return value instanceof Date ? value.toISOString() : new Date(value).toISOString(); }
function date(value: Date | string | null): string | null { return value === null ? null : value instanceof Date ? value.toISOString().slice(0, 10) : String(value).slice(0, 10); }
function has(actor: Principal, permission: Principal["permissions"][number]): boolean { return actor.permissions.includes(permission); }
function requirePermission(actor: Principal, permission: Principal["permissions"][number]) { if (!has(actor, permission)) throw new DomainError("FORBIDDEN", "Access denied"); }

export class PlatformService {
  private readonly pool:Pool;
  private readonly cursors:CursorCodec;
  constructor(pool: Pool, cursors: CursorCodec) { this.pool=pool; this.cursors=cursors; }

  private cursor(actor: Principal, resource: string, cursor?: string | null): ReadonlyArray<string> | null {
    return cursor ? this.cursors.decode(cursor, { policyVersion: actor.policyVersion, resource, viewer: actor.id }) : null;
  }

  private page<T>(actor: Principal, resource: string, limit: number, rows: ReadonlyArray<T>, sort: (row: T) => ReadonlyArray<string>): Page<T> {
    const hasMore = rows.length > limit;
    const data = rows.slice(0, limit);
    const last = data.at(-1);
    return { data, page: { hasMore, limit, nextCursor: hasMore && last ? this.cursors.encode({ policyVersion: actor.policyVersion, resource, sort: sort(last), viewer: actor.id }) : null } };
  }

  async listDepartments(): Promise<ReadonlyArray<Department>> {
    const result = await this.pool.query<{ department_id: string; name: string }>("SELECT department_id, name FROM departments WHERE is_active = true ORDER BY name, department_id");
    return result.rows.map((row) => ({ id: row.department_id, name: row.name }));
  }

  async upsertDepartment(actor: Principal, id: string, input: UpsertDepartmentInput, key: string, requestId: string): Promise<Department> {
    requirePermission(actor, "settings.manage");
    return this.mutate(actor, `/config/departments/${id}`, key, input, requestId, async (client) => {
      await client.query(`INSERT INTO departments (department_id,name) VALUES ($1,$2)
        ON CONFLICT (department_id) DO UPDATE SET name=EXCLUDED.name,is_active=true,updated_at=now(),version=departments.version+1`, [id, input.name]);
      const data = { id, name: input.name };
      return { data, entityId:id, eventType:"CONFIG_CHANGED", resourceType:"department", scope:"ALL", version:1 };
    });
  }

  async listAccounts(actor: Principal, limit: number, cursor?: string | null): Promise<Page<Account>> {
    requirePermission(actor, "users.read.scope");
    const resource = "accounts"; const sort = this.cursor(actor, resource, cursor);
    const result = await this.pool.query<{
      account_sub: string; created_at: Date; department_id: string | null; department_name: string | null; display_name: string;
      email: string | null; employee_code: string; role: Account["role"]; status: Account["status"]; username: string; version: number;
    }>(`SELECT a.account_sub, a.created_at, a.department_id, d.name AS department_name, a.display_name, a.email,
              a.employee_code, a.role, a.status, a.username, a.version
         FROM accounts a LEFT JOIN departments d ON d.department_id = a.department_id
        WHERE ($1::timestamptz IS NULL OR (a.created_at, a.account_sub) < ($1::timestamptz, $2::text))
        ORDER BY a.created_at DESC, a.account_sub DESC LIMIT $3`, [sort?.[0] ?? null, sort?.[1] ?? null, limit + 1]);
    const rows = result.rows.map((row): Account => ({ createdAt: iso(row.created_at), departmentId: row.department_id, departmentName: row.department_name, displayName: row.display_name, email: row.email, employeeCode: row.employee_code, id: row.account_sub, role: row.role, status: row.status, username: row.username, version: row.version }));
    return this.page(actor, resource, limit, rows, (row) => [row.createdAt, row.id]);
  }

  async createLocalAccount(actor: Principal, input: CreateLocalAccountInput, key: string, requestId: string): Promise<Account> {
    if (actor.role !== "SUPER_ADMIN") throw new DomainError("FORBIDDEN", "Access denied");
    return this.mutate(actor, "/users", key, input, requestId, async (client) => {
      const id = `local-${input.username}`;
      const result = await client.query<{ created_at: Date; version: number }>(`INSERT INTO accounts
        (account_sub, employee_code, username, display_name, email, department_id, role)
        VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING created_at, version`, [id, input.employeeCode, input.username, input.displayName, input.email ?? null, input.departmentId, input.role]);
      const permissions = input.role === "USER" ? userPermissions : input.role === "ADMIN" ? adminPermissions : superPermissions;
      for (const permission of permissions) await client.query(`INSERT INTO account_grants
        (grant_id, account_sub, permission, scope, scope_ids, created_by) VALUES ($1,$2,$3,$4,$5,$6)`,
        [`grant-${randomUUID()}`, id, permission, input.role === "USER" ? "OWN" : "ALL", input.role === "USER" ? [] : ["ALL"], actor.id]);
      const department = await client.query<{ name: string }>("SELECT name FROM departments WHERE department_id=$1", [input.departmentId]);
      const data: Account = { createdAt: iso(result.rows[0]!.created_at), departmentId: input.departmentId, departmentName: department.rows[0]?.name ?? null, displayName: input.displayName, email: input.email ?? null, employeeCode: input.employeeCode, id, role: input.role, status: "ACTIVE", username: input.username, version: result.rows[0]!.version };
      return { data, entityId: id, eventType: "USER_GRANTS_CHANGED", resourceType: "account", scope: "ALL", version: data.version };
    });
  }

  async listProjects(actor: Principal, limit: number, cursor?: string | null): Promise<Page<Project>> {
    const canReadAll = actor.role !== "USER" && has(actor, "dashboard.read.scope");
    if (!canReadAll) requirePermission(actor, "projects.read.assigned");
    const resource = "projects"; const sort = this.cursor(actor, resource, cursor);
    const result = await this.pool.query<{
      actual_end_date: Date | null; code: string; description: string; member_count: string; name: string; owner_name: string; owner_sub: string;
      planned_end_date: Date | null; project_id: string; start_date: Date; status: Project["status"]; version: number;
    }>(`SELECT p.*, a.display_name AS owner_name, count(pm.membership_id)::text AS member_count
         FROM projects p JOIN accounts a ON a.account_sub=p.owner_sub
         LEFT JOIN project_memberships pm ON pm.project_id=p.project_id AND pm.removed_at IS NULL
        WHERE ($1::boolean OR p.owner_sub=$2 OR EXISTS (SELECT 1 FROM project_memberships x WHERE x.project_id=p.project_id AND x.account_sub=$2 AND x.removed_at IS NULL))
          AND ($3::date IS NULL OR (p.start_date,p.project_id)<($3::date,$4::text))
        GROUP BY p.project_id,a.display_name ORDER BY p.start_date DESC,p.project_id DESC LIMIT $5`, [canReadAll, actor.id, sort?.[0] ?? null, sort?.[1] ?? null, limit + 1]);
    const rows = result.rows.map((r): Project => ({ actualEndDate: date(r.actual_end_date), code:r.code, description:r.description, id:r.project_id, memberCount:Number(r.member_count), name:r.name, ownerName:r.owner_name, ownerSub:r.owner_sub, plannedEndDate:date(r.planned_end_date), startDate:date(r.start_date)!, status:r.status, version:r.version }));
    return this.page(actor, resource, limit, rows, (row) => [row.startDate,row.id]);
  }

  async createProject(actor: Principal, input: CreateProjectInput, key: string, requestId: string): Promise<Project> {
    requirePermission(actor,"projects.manage");
    return this.mutate(actor,"/projects",key,input,requestId,async(client)=>{
      const id=`prj_${randomUUID()}`;
      const result=await client.query<{version:number}>(`INSERT INTO projects (project_id,code,name,owner_sub,description,start_date,planned_end_date,status,created_by) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING version`,[id,input.code,input.name,input.ownerSub,input.description,input.startDate,input.plannedEndDate??null,input.status,actor.id]);
      const owner=await client.query<{display_name:string}>("SELECT display_name FROM accounts WHERE account_sub=$1",[input.ownerSub]);
      const data:Project={actualEndDate:null,code:input.code,description:input.description,id,memberCount:0,name:input.name,ownerName:owner.rows[0]?.display_name??input.ownerSub,ownerSub:input.ownerSub,plannedEndDate:input.plannedEndDate??null,startDate:input.startDate,status:input.status,version:result.rows[0]!.version};
      return {data,entityId:id,eventType:"PROJECT_CHANGED",resourceType:"project",scope:"ALL",version:data.version};
    });
  }

  async assignProjectMember(actor:Principal,projectId:string,input:AssignProjectMemberInput,key:string,requestId:string){
    requirePermission(actor,"projects.assign"); return this.mutate(actor,`/projects/${projectId}/members`,key,input,requestId,async(client)=>{
      const id=`mem_${randomUUID()}`; await client.query("INSERT INTO project_memberships (membership_id,project_id,account_sub,assigned_at,assigned_by,due_date) VALUES ($1,$2,$3,now(),$4,$5)",[id,projectId,input.accountSub,actor.id,input.dueDate??null]);
      const data={accountSub:input.accountSub,id,projectId}; return {action:"project.member_assigned",data,entityId:projectId,eventType:"PROJECT_CHANGED",resourceType:"project",scope:`project:${projectId}`,version:1};
    });
  }

  async listActivities(actor:Principal,limit:number,cursor?:string|null):Promise<Page<Activity>>{
    const all=has(actor,"work.read.scope"); if(!all) requirePermission(actor,"work.read.own"); const resource="activities"; const sort=this.cursor(actor,resource,cursor);
    const result=await this.pool.query<{activity_date:Date;activity_id:string;category_id:string;display_name:string;project_id:string;project_name:string;status:Activity["status"];time_spent_minutes:number|null;title:string;user_sub:string;version:number}>(`SELECT x.*,p.name project_name,a.display_name FROM activities x JOIN projects p ON p.project_id=x.project_id JOIN accounts a ON a.account_sub=x.user_sub WHERE ($1::boolean OR x.user_sub=$2) AND ($3::date IS NULL OR (x.activity_date,x.activity_id)<($3::date,$4::text)) ORDER BY x.activity_date DESC,x.activity_id DESC LIMIT $5`,[all,actor.id,sort?.[0]??null,sort?.[1]??null,limit+1]);
    const rows=result.rows.map((r):Activity=>({activityDate:date(r.activity_date)!,categoryId:r.category_id,id:r.activity_id,ownerName:r.display_name,projectId:r.project_id,projectName:r.project_name,status:r.status,timeSpentMinutes:r.time_spent_minutes,title:r.title,userSub:r.user_sub,version:r.version}));
    return this.page(actor,resource,limit,rows,(row)=>[row.activityDate,row.id]);
  }

  async createActivity(actor:Principal,input:CreateActivityInput,key:string,requestId:string):Promise<Activity>{
    requirePermission(actor,"work.create.own");
    return this.mutate(actor,"/activities",key,input,requestId,async(client)=>{
      const allowed=await client.query("SELECT 1 FROM projects p WHERE p.project_id=$1 AND (p.owner_sub=$2 OR EXISTS (SELECT 1 FROM project_memberships m WHERE m.project_id=p.project_id AND m.account_sub=$2 AND m.removed_at IS NULL))",[input.projectId,actor.id]);
      if(!allowed.rowCount) throw new DomainError("FORBIDDEN","Project assignment required");
      const id=`act_${randomUUID()}`, updateId=`upd_${randomUUID()}`;
      const result=await client.query<{version:number}>(`INSERT INTO activities (activity_id,project_id,user_sub,title,category_id,activity_date,status,time_spent_minutes,created_by) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$3) RETURNING version`,[id,input.projectId,actor.id,input.title,input.categoryId,input.activityDate,input.status,input.timeSpentMinutes??null]);
      await client.query("INSERT INTO activity_updates (update_id,activity_id,author_sub,notes,to_status) VALUES ($1,$2,$3,$4,$5)",[updateId,id,actor.id,input.notes,input.status]);
      const p=await client.query<{name:string}>("SELECT name FROM projects WHERE project_id=$1",[input.projectId]);
      const data:Activity={activityDate:input.activityDate,categoryId:input.categoryId,id,ownerName:actor.displayName,projectId:input.projectId,projectName:p.rows[0]?.name??input.projectId,status:input.status,timeSpentMinutes:input.timeSpentMinutes??null,title:input.title,userSub:actor.id,version:result.rows[0]!.version};
      return {data,entityId:id,eventType:"ACTIVITY_CHANGED",resourceType:"activity",scope:`user:${actor.id}`,version:data.version};
    });
  }

  async listClaims(actor:Principal,limit:number,cursor?:string|null):Promise<Page<Claim>>{
    const all=has(actor,"claims.read.scope"); if(!all) requirePermission(actor,"claims.read.own"); const resource="claims"; const sort=this.cursor(actor,resource,cursor);
    const result=await this.pool.query<{amount_minor:string;claim_id:string;claim_type:string;created_at:Date;currency:"BDT";display_name:string;memo:string;period_month:string;status:Claim["status"];user_sub:string;version:number}>(`SELECT c.*,a.display_name FROM claims c JOIN accounts a ON a.account_sub=c.user_sub WHERE ($1::boolean OR c.user_sub=$2) AND ($3::timestamptz IS NULL OR (c.created_at,c.claim_id)<($3::timestamptz,$4::text)) ORDER BY c.created_at DESC,c.claim_id DESC LIMIT $5`,[all,actor.id,sort?.[0]??null,sort?.[1]??null,limit+1]);
    const rows=result.rows.map((r):Claim=>({amountMinor:Number(r.amount_minor),claimType:r.claim_type,createdAt:iso(r.created_at),currency:r.currency,id:r.claim_id,memo:r.memo,ownerName:r.display_name,periodMonth:r.period_month,status:r.status,userSub:r.user_sub,version:r.version}));
    return this.page(actor,resource,limit,rows,(row)=>[row.createdAt,row.id]);
  }

  async createClaim(actor:Principal,input:CreateClaimInput,key:string,requestId:string):Promise<Claim>{
    requirePermission(actor,"claims.create.own"); return this.mutate(actor,"/claims",key,input,requestId,async(client)=>{
      const id=`clm_${randomUUID()}`; const dept=await client.query<{department_id:string}>("SELECT department_id FROM accounts WHERE account_sub=$1",[actor.id]); if(!dept.rows[0]?.department_id) throw new DomainError("CONFLICT","Department required");
      const result=await client.query<{created_at:Date;version:number}>(`INSERT INTO claims (claim_id,user_sub,department_id,claim_type,period_month,amount_minor,memo,status,created_by) VALUES ($1,$2,$3,$4,$5,$6,$7,'DRAFT',$2) RETURNING created_at,version`,[id,actor.id,dept.rows[0].department_id,input.claimType,input.periodMonth,input.amountMinor,input.memo]);
      const data:Claim={amountMinor:input.amountMinor,claimType:input.claimType,createdAt:iso(result.rows[0]!.created_at),currency:"BDT",id,memo:input.memo,ownerName:actor.displayName,periodMonth:input.periodMonth,status:"DRAFT",userSub:actor.id,version:result.rows[0]!.version};
      return {data,entityId:id,eventType:"CLAIM_CHANGED",resourceType:"claim",scope:`user:${actor.id}`,version:data.version};
    });
  }

  async submitClaim(actor:Principal,id:string,version:number,key:string,requestId:string):Promise<Claim>{
    requirePermission(actor,"claims.edit.own"); return this.mutate(actor,`/claims/${id}/submit`,key,{version},requestId,async(client)=>{
      const result=await client.query<{amount_minor:string;claim_type:string;created_at:Date;currency:"BDT";memo:string;period_month:string;status:Claim["status"];user_sub:string;version:number}>(`UPDATE claims SET status='SUBMITTED',submitted_at=now(),updated_at=now(),version=version+1 WHERE claim_id=$1 AND user_sub=$2 AND version=$3 AND status IN ('DRAFT','NEEDS_INFO') RETURNING *`,[id,actor.id,version]);
      const row=result.rows[0]; if(!row) throw new DomainError("CONFLICT","Claim changed or cannot be submitted"); const data:Claim={amountMinor:Number(row.amount_minor),claimType:row.claim_type,createdAt:iso(row.created_at),currency:row.currency,id,memo:row.memo,ownerName:actor.displayName,periodMonth:row.period_month,status:row.status,userSub:row.user_sub,version:row.version};
      return {action:"claim.submitted",data,entityId:id,eventType:"CLAIM_CHANGED",resourceType:"claim",scope:`user:${actor.id}`,version:data.version};
    });
  }

  async reviewClaim(actor:Principal,id:string,input:ClaimTransitionInput,key:string,requestId:string):Promise<Claim>{
    const permission=input.toStatus==="APPROVED"?"claims.approve.scope":input.toStatus==="PAID"?"claims.mark_paid.scope":"claims.review.scope"; requirePermission(actor,permission);
    return this.mutate(actor,`/claims/${id}/review`,key,input,requestId,async(client)=>{
      const current=await client.query<{status:Claim["status"];user_sub:string}>("SELECT status,user_sub FROM claims WHERE claim_id=$1 FOR UPDATE",[id]); const before=current.rows[0]; if(!before) throw new DomainError("NOT_FOUND","Claim not found"); if(before.user_sub===actor.id) throw new DomainError("FORBIDDEN","Self-approval is not allowed");
      const allowedFrom:Record<ClaimTransitionInput["toStatus"],ReadonlyArray<Claim["status"]>>={UNDER_REVIEW:["SUBMITTED"],NEEDS_INFO:["SUBMITTED","UNDER_REVIEW"],APPROVED:["SUBMITTED","UNDER_REVIEW"],REJECTED:["SUBMITTED","UNDER_REVIEW"],PAID:["APPROVED"]};if(!allowedFrom[input.toStatus].includes(before.status))throw new DomainError("CONFLICT","Claim transition is not allowed");
      if(["NEEDS_INFO","REJECTED"].includes(input.toStatus)&&!input.reason) throw new DomainError("CONFLICT","A reason is required");
      const updated=await client.query<{amount_minor:string;claim_type:string;created_at:Date;currency:"BDT";memo:string;period_month:string;status:Claim["status"];user_sub:string;version:number}>("UPDATE claims SET status=$1,updated_at=now(),version=version+1 WHERE claim_id=$2 AND version=$3 RETURNING *",[input.toStatus,id,input.version]); const row=updated.rows[0]; if(!row) throw new DomainError("CONFLICT","Claim version is stale");
      await client.query("INSERT INTO claim_reviews (review_id,claim_id,actor_sub,from_status,to_status,reason,policy_version) VALUES ($1,$2,$3,$4,$5,$6,$7)",[`rev_${randomUUID()}`,id,actor.id,before.status,input.toStatus,input.reason??null,actor.policyVersion]); const owner=await client.query<{display_name:string}>("SELECT display_name FROM accounts WHERE account_sub=$1",[row.user_sub]);
      const data:Claim={amountMinor:Number(row.amount_minor),claimType:row.claim_type,createdAt:iso(row.created_at),currency:row.currency,id,memo:row.memo,ownerName:owner.rows[0]?.display_name??row.user_sub,periodMonth:row.period_month,status:row.status,userSub:row.user_sub,version:row.version}; return {action:"claim.reviewed",data,entityId:id,eventType:"CLAIM_CHANGED",resourceType:"claim",scope:"ALL",version:data.version};
    });
  }

  async listRequests(actor:Principal,limit:number,cursor?:string|null):Promise<Page<WorkRequest>>{
    const all=has(actor,"requests.read.scope"); if(!all) requirePermission(actor,"requests.read.own"); const resource="requests"; const sort=this.cursor(actor,resource,cursor);
    const result=await this.pool.query<{created_at:Date;display_name:string;reason:string;request_id:string;request_type:WorkRequest["requestType"];requester_sub:string;status:WorkRequest["status"];title:string;version:number}>(`SELECT r.*,a.display_name FROM requests r JOIN accounts a ON a.account_sub=r.requester_sub WHERE ($1::boolean OR r.requester_sub=$2) AND ($3::timestamptz IS NULL OR (r.created_at,r.request_id)<($3::timestamptz,$4::text)) ORDER BY r.created_at DESC,r.request_id DESC LIMIT $5`,[all,actor.id,sort?.[0]??null,sort?.[1]??null,limit+1]);
    const rows=result.rows.map((r):WorkRequest=>({createdAt:iso(r.created_at),id:r.request_id,ownerName:r.display_name,reason:r.reason,requestType:r.request_type,requesterSub:r.requester_sub,status:r.status,title:r.title,version:r.version}));
    return this.page(actor,resource,limit,rows,(row)=>[row.createdAt,row.id]);
  }

  async createRequest(actor:Principal,input:CreateRequestInput,key:string,requestId:string):Promise<WorkRequest>{
    requirePermission(actor,"requests.create.own"); return this.mutate(actor,"/requests",key,input,requestId,async(client)=>{
      const id=`req_${randomUUID()}`; const dept=await client.query<{department_id:string}>("SELECT department_id FROM accounts WHERE account_sub=$1",[actor.id]); if(!dept.rows[0]?.department_id) throw new DomainError("CONFLICT","Department required");
      const result=await client.query<{created_at:Date;version:number}>(`INSERT INTO requests (request_id,requester_sub,department_id,request_type,title,reason,status) VALUES ($1,$2,$3,$4,$5,$6,'DRAFT') RETURNING created_at,version`,[id,actor.id,dept.rows[0].department_id,input.requestType,input.title,input.reason]);
      const data:WorkRequest={createdAt:iso(result.rows[0]!.created_at),id,ownerName:actor.displayName,reason:input.reason,requestType:input.requestType,requesterSub:actor.id,status:"DRAFT",title:input.title,version:result.rows[0]!.version};
      return {data,entityId:id,eventType:"REQUEST_CHANGED",resourceType:"request",scope:`user:${actor.id}`,version:data.version};
    });
  }

  async submitRequest(actor:Principal,id:string,version:number,key:string,requestId:string):Promise<WorkRequest>{
    requirePermission(actor,"requests.create.own"); return this.mutate(actor,`/requests/${id}/submit`,key,{version},requestId,async(client)=>{
      const result=await client.query<{created_at:Date;reason:string;request_type:WorkRequest["requestType"];requester_sub:string;status:WorkRequest["status"];title:string;version:number}>("UPDATE requests SET status='SUBMITTED',submitted_at=now(),updated_at=now(),version=version+1 WHERE request_id=$1 AND requester_sub=$2 AND version=$3 AND status IN ('DRAFT','NEEDS_INFO') RETURNING *",[id,actor.id,version]); const row=result.rows[0]; if(!row) throw new DomainError("CONFLICT","Request changed or cannot be submitted");
      const data:WorkRequest={createdAt:iso(row.created_at),id,ownerName:actor.displayName,reason:row.reason,requestType:row.request_type,requesterSub:row.requester_sub,status:row.status,title:row.title,version:row.version}; return {action:"request.submitted",data,entityId:id,eventType:"REQUEST_CHANGED",resourceType:"request",scope:`user:${actor.id}`,version:data.version};
    });
  }

  async reviewRequest(actor:Principal,id:string,input:RequestTransitionInput,key:string,requestId:string):Promise<WorkRequest>{
    requirePermission(actor,"requests.review.scope"); return this.mutate(actor,`/requests/${id}/review`,key,input,requestId,async(client)=>{
      const current=await client.query<{status:WorkRequest["status"];requester_sub:string}>("SELECT status,requester_sub FROM requests WHERE request_id=$1 FOR UPDATE",[id]);const before=current.rows[0];if(!before)throw new DomainError("NOT_FOUND","Request not found");if(before.requester_sub===actor.id&&["APPROVED","FULFILLED"].includes(input.toStatus))throw new DomainError("FORBIDDEN","Self-approval is not allowed");if(["NEEDS_INFO","REJECTED"].includes(input.toStatus)&&!input.reason)throw new DomainError("CONFLICT","A reason is required");
      const allowedFrom:Record<RequestTransitionInput["toStatus"],ReadonlyArray<WorkRequest["status"]>>={IN_REVIEW:["SUBMITTED"],NEEDS_INFO:["SUBMITTED","IN_REVIEW"],APPROVED:["SUBMITTED","IN_REVIEW"],REJECTED:["SUBMITTED","IN_REVIEW"],FULFILLED:["APPROVED"],CLOSED:["FULFILLED"]};if(!allowedFrom[input.toStatus].includes(before.status))throw new DomainError("CONFLICT","Request transition is not allowed");
      const updated=await client.query<{created_at:Date;reason:string;request_type:WorkRequest["requestType"];requester_sub:string;status:WorkRequest["status"];title:string;version:number}>("UPDATE requests SET status=$1,updated_at=now(),version=version+1 WHERE request_id=$2 AND version=$3 RETURNING *",[input.toStatus,id,input.version]);const row=updated.rows[0];if(!row)throw new DomainError("CONFLICT","Request version is stale");await client.query("INSERT INTO request_reviews (review_id,request_id,actor_sub,from_status,to_status,reason) VALUES ($1,$2,$3,$4,$5,$6)",[`rev_${randomUUID()}`,id,actor.id,before.status,input.toStatus,input.reason??null]);const owner=await client.query<{display_name:string}>("SELECT display_name FROM accounts WHERE account_sub=$1",[row.requester_sub]);const data:WorkRequest={createdAt:iso(row.created_at),id,ownerName:owner.rows[0]?.display_name??row.requester_sub,reason:row.reason,requestType:row.request_type,requesterSub:row.requester_sub,status:row.status,title:row.title,version:row.version};return {action:"request.reviewed",data,entityId:id,eventType:"REQUEST_CHANGED",resourceType:"request",scope:"ALL",version:data.version};
    });
  }

  async listAudit(actor:Principal,limit:number,cursor?:string|null):Promise<Page<AuditRecord>>{
    requirePermission(actor,"audit.read"); const resource="audit"; const sort=this.cursor(actor,resource,cursor);
    const result=await this.pool.query<{action:string;actor_sub:string;audit_id:string;occurred_at:Date;resource_id:string;resource_type:string}>(`SELECT audit_id,actor_sub,action,resource_type,resource_id,occurred_at FROM audit_records WHERE ($1::timestamptz IS NULL OR (occurred_at,audit_id)<($1::timestamptz,$2::text)) ORDER BY occurred_at DESC,audit_id DESC LIMIT $3`,[sort?.[0]??null,sort?.[1]??null,limit+1]);
    const rows=result.rows.map((r):AuditRecord=>({action:r.action,actorSub:r.actor_sub,id:r.audit_id,occurredAt:iso(r.occurred_at),resourceId:r.resource_id,resourceType:r.resource_type}));
    return this.page(actor,resource,limit,rows,(row)=>[row.occurredAt,row.id]);
  }

  async dashboard(actor:Principal):Promise<DashboardSummary>{
    const all=has(actor,"dashboard.read.scope");
    const result=await this.pool.query<{active_projects:string;blocked_work:string;pending_claims:string;pending_requests:string}>(`SELECT
      (SELECT count(*) FROM projects p WHERE p.status='ACTIVE' AND ($1::boolean OR p.owner_sub=$2 OR EXISTS (SELECT 1 FROM project_memberships m WHERE m.project_id=p.project_id AND m.account_sub=$2 AND m.removed_at IS NULL)))::text active_projects,
      (SELECT count(*) FROM activities WHERE status='BLOCKED' AND ($1::boolean OR user_sub=$2))::text blocked_work,
      (SELECT count(*) FROM claims WHERE status IN ('SUBMITTED','UNDER_REVIEW','NEEDS_INFO') AND ($1::boolean OR user_sub=$2))::text pending_claims,
      (SELECT count(*) FROM requests WHERE status IN ('SUBMITTED','IN_REVIEW','NEEDS_INFO') AND ($1::boolean OR requester_sub=$2))::text pending_requests`,[all,actor.id]);
    const trend=await this.pool.query<{bucket_label:string;completed:string;updates:string}>(`SELECT to_char(d.bucket_date,'Mon DD') AS bucket_label,count(a.activity_id)::text AS updates,count(a.activity_id) FILTER (WHERE a.status='COMPLETED')::text AS completed FROM generate_series(current_date-interval '29 days',current_date,interval '1 day') AS d(bucket_date) LEFT JOIN activities a ON a.activity_date=d.bucket_date::date AND ($1::boolean OR a.user_sub=$2) GROUP BY d.bucket_date ORDER BY d.bucket_date`,[all,actor.id]);
    const mix=await this.pool.query<{count:string;name:string}>("SELECT p.status name,count(*)::text count FROM projects p WHERE ($1::boolean OR p.owner_sub=$2 OR EXISTS (SELECT 1 FROM project_memberships m WHERE m.project_id=p.project_id AND m.account_sub=$2 AND m.removed_at IS NULL)) GROUP BY p.status ORDER BY p.status",[all,actor.id]);
    const counts=result.rows[0]!;
    return {activeProjects:Number(counts.active_projects),blockedWork:Number(counts.blocked_work),pendingClaims:Number(counts.pending_claims),pendingRequests:Number(counts.pending_requests),projectMix:mix.rows.map(r=>({count:Number(r.count),name:r.name})),workTrend:trend.rows.map(r=>({completed:Number(r.completed),day:r.bucket_label,updates:Number(r.updates)}))};
  }

  private async mutate<T,I>(actor:Principal,route:string,key:string,input:I,requestId:string,action:(client:PoolClient)=>Promise<MutationResult<T>>):Promise<T>{
    if(!key) throw new DomainError("CONFLICT","Idempotency-Key is required"); const hash=createHash("sha256").update(JSON.stringify(input)).digest("hex"); const client=await this.pool.connect();
    try{ await client.query("BEGIN"); const existing=await client.query<{request_hash:string;response_body:T}>("SELECT request_hash,response_body FROM idempotency_records WHERE actor_sub=$1 AND route=$2 AND idempotency_key=$3 FOR UPDATE",[actor.id,route,key]);
      if(existing.rows[0]){ if(existing.rows[0].request_hash!==hash) throw new DomainError("CONFLICT","Idempotency key was reused with a different request"); await client.query("COMMIT"); return existing.rows[0].response_body; }
      const result=await action(client); const auditId=`aud_${randomUUID()}`,eventId=`evt_${randomUUID()}`;
      await client.query("INSERT INTO audit_records (audit_id,actor_sub,action,resource_type,resource_id,new_state,request_id,permission_policy_version) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)",[auditId,actor.id,result.action??`${result.resourceType}.created`,result.resourceType,result.entityId,JSON.stringify(result.data),requestId,actor.policyVersion]);
      await client.query("INSERT INTO outbox_events (event_id,event_type,entity_id,scope,entity_version) VALUES ($1,$2,$3,$4,$5)",[eventId,result.eventType,result.entityId,result.scope,result.version]);
      await client.query("INSERT INTO idempotency_records (actor_sub,route,idempotency_key,request_hash,response_status,response_body,expires_at) VALUES ($1,$2,$3,$4,201,$5,now()+interval '24 hours')",[actor.id,route,key,hash,JSON.stringify(result.data)]);
      await client.query("COMMIT"); return result.data;
    }catch(error){await client.query("ROLLBACK"); if(error instanceof DomainError) throw error; if((error as {code?:string}).code==="23505") throw new DomainError("CONFLICT","A record with this value already exists"); throw error;}finally{client.release();}
  }
}
