import { Button, Card, CardHeader, DataTable, EmptyState } from "@pacd/ui";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";

import { apiClient } from "../lib/api-client";

const control="interactive-control type-body min-h-10 rounded-lg border border-[var(--border)] bg-white px-3 text-[var(--ink)] focus:outline-none focus:ring-2 focus:ring-[var(--navy-500)]";

export function TagControls(){
  const client=useQueryClient(),config=useQuery({queryKey:["config"],queryFn:apiClient.config});
  const create=useMutation({mutationFn:apiClient.createWorkTag,onSuccess:async()=>{await client.invalidateQueries({queryKey:["config"]});}});
  function submit(event:FormEvent<HTMLFormElement>){event.preventDefault();const form=event.currentTarget;create.mutate(String(new FormData(form).get("name")),{onSuccess:()=>form.reset()});}
  return <Card><CardHeader title="Task tags"/><form className="flex flex-wrap items-end gap-3 p-5" onSubmit={submit}>
    <label className="type-label grid gap-1.5"><span>Tag name</span><input className={control} name="name" required/></label>
    <Button disabled={create.isPending} type="submit">Add tag</Button>
    {create.error?<p className="type-body text-[var(--danger)]" role="alert">{create.error.message}</p>:null}
  </form><div className="flex flex-wrap gap-2 px-5 pb-5">{config.data?.workTags.map(t=><span className="rounded-md border border-[var(--border)] px-3 py-1 type-label" key={t.id}>{t.name}</span>)}</div></Card>;
}

export function AdminVisibilityControls(){
  const client=useQueryClient(),users=useQuery({queryKey:["users","visibility"],queryFn:()=>apiClient.users()});
  const admins=users.data?.data.filter(u=>u.role==="ADMIN")??[];
  const [viewer,setViewer]=useState("");const selected=viewer||admins[0]?.id||"";
  const grants=useQuery({queryKey:["admin-visibility",selected],queryFn:()=>apiClient.adminVisibility(selected),enabled:Boolean(selected)});
  const change=useMutation({mutationFn:({targetSub,enabled}:{targetSub:string;enabled:boolean})=>apiClient.setAdminVisibility(selected,{targetSub,enabled}),onSuccess:async()=>{await client.invalidateQueries({queryKey:["admin-visibility",selected]});await client.invalidateQueries({queryKey:["dashboard"]});}});
  return <Card><CardHeader title="Admin access to other Admins"/><div className="space-y-4 p-5">
    <p className="type-body text-[var(--muted)]">Admins see employee work by default. Grant access here when one Admin needs to see another Admin's work, claims and requests.</p>
    <label className="type-label grid max-w-sm gap-1.5"><span>Viewing Admin</span><select className={control} onChange={e=>setViewer(e.target.value)} value={selected}>{admins.map(u=><option key={u.id} value={u.id}>{u.displayName} ({u.username})</option>)}</select></label>
    {admins.length<2?<EmptyState title="Two Admins needed" description="Create another Admin to assign cross-Admin visibility."/>:<DataTable caption="Admin visibility" rows={admins.filter(u=>u.id!==selected)} getRowKey={u=>u.id} columns={[
      {key:"admin",header:"Other Admin",render:u=>`${u.displayName} (${u.username})`},
      {key:"access",header:"Access",render:u=><label className="inline-flex items-center gap-2"><input checked={grants.data?.includes(u.id)??false} disabled={change.isPending||grants.isPending} onChange={e=>change.mutate({targetSub:u.id,enabled:e.target.checked})} type="checkbox"/><span>Can view</span></label>},
    ]}/>}
    {change.error?<p className="type-body text-[var(--danger)]" role="alert">{change.error.message}</p>:null}
  </div></Card>;
}
