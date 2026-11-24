import type { Principal } from "@pacd/contracts";
import { Button, Card, CardHeader, DataTable, EmptyState, StatusBadge } from "@pacd/ui";
import { useQuery } from "@tanstack/react-query";
import { lazy, Suspense } from "react";

import { apiClient } from "../lib/api-client";

const WorkTrendChart=lazy(()=>import("../components/charts").then(module=>({default:module.WorkTrendChart})));
const ProjectMixChart=lazy(()=>import("../components/charts").then(module=>({default:module.ProjectMixChart})));

export function DatabaseDashboard({ principal,liveConnected }: { principal:Principal;liveConnected:boolean }) {
  const summary=useQuery({queryKey:["dashboard",principal.id,principal.policyVersion],queryFn:apiClient.dashboard,refetchInterval:false});
  const projects=useQuery({queryKey:["projects","dashboard"],queryFn:()=>apiClient.projects()});
  const activities=useQuery({queryKey:["activities","dashboard"],queryFn:()=>apiClient.activities()});
  const claims=useQuery({queryKey:["claims","dashboard"],queryFn:()=>apiClient.claims(),enabled:principal.role!=="USER"});
  const requests=useQuery({queryKey:["requests","dashboard"],queryFn:()=>apiClient.requests(),enabled:principal.role!=="USER"});
  const refresh=()=>{void summary.refetch();void projects.refetch();void activities.refetch();void claims.refetch();void requests.refetch();};
  if(summary.error)return <EmptyState title="Dashboard unavailable" description={summary.error.message}/>;
  const data=summary.data;
  return <div className="dashboard-stack space-y-5">
    <header className="flex flex-wrap items-end justify-between gap-4"><div><p className="type-body font-medium text-[var(--muted)]">{principal.displayName}</p><h1 className="type-page-title mt-1 text-[var(--navy-950)]">Overview</h1></div><div className="flex items-center gap-3"><span className="type-caption text-[var(--muted)]" role="status">{liveConnected?"Live updates connected":"Live updates disconnected"}</span><Button onClick={refresh} variant="secondary">Refresh</Button></div></header>
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {[{label:"Pending Claims",value:data?.pendingClaims??0},{label:"Pending Requests",value:data?.pendingRequests??0},{label:"Active Projects",value:data?.activeProjects??0},{label:"Blocked Work",value:data?.blockedWork??0}].map(item=><Card className="p-4" key={item.label}><p className="type-body text-[var(--muted)]">{item.label}</p><p className="type-metric mt-2 text-[var(--navy-950)]">{item.value}</p></Card>)}
    </div>
    {data?<div className="grid gap-5 xl:grid-cols-[1.25fr_0.75fr]"><Suspense fallback={<Card className="min-h-80"/>}><WorkTrendChart data={data.workTrend}/></Suspense><Suspense fallback={<Card className="min-h-80"/>}><ProjectMixChart data={data.projectMix}/></Suspense></div>:null}
    {principal.role!=="USER"&&data?<Card><CardHeader title="Employee summary"/><DataTable caption="Employee summary" rows={data.employees} getRowKey={r=>r.id} columns={[
      {key:"name",header:"Employee",render:r=>r.name},{key:"task",header:"Current task",render:r=>r.currentTask??"Not set"},{key:"tasks",header:"Open tasks",render:r=>r.currentTasks},
      {key:"claims",header:"Pending claims",render:r=>r.pendingClaims},{key:"requests",header:"Pending requests",render:r=>r.pendingRequests},
    ]}/></Card>:null}
    {principal.role!=="USER"?<div className="grid gap-5 xl:grid-cols-2">
      <Card><CardHeader title="Claims needing attention"/>{claims.data?.data.filter(c=>["SUBMITTED","UNDER_REVIEW","NEEDS_INFO"].includes(c.status)).length?<DataTable caption="Pending claims" rows={claims.data.data.filter(c=>["SUBMITTED","UNDER_REVIEW","NEEDS_INFO"].includes(c.status))} getRowKey={c=>c.id} columns={[{key:"employee",header:"Employee",render:c=>c.ownerName},{key:"type",header:"Type",render:c=>c.claimType},{key:"status",header:"Status",render:c=>c.status}]}/>:<EmptyState title="No pending claims" description="Submitted claims will appear here."/>}</Card>
      <Card><CardHeader title="Requests needing attention"/>{requests.data?.data.filter(r=>["SUBMITTED","IN_REVIEW","NEEDS_INFO"].includes(r.status)).length?<DataTable caption="Pending requests" rows={requests.data.data.filter(r=>["SUBMITTED","IN_REVIEW","NEEDS_INFO"].includes(r.status))} getRowKey={r=>r.id} columns={[{key:"employee",header:"Employee",render:r=>r.ownerName},{key:"request",header:"Request",render:r=>r.title},{key:"status",header:"Status",render:r=>r.status}]}/>:<EmptyState title="No pending requests" description="Submitted requests will appear here."/>}</Card>
    </div>:null}
    <Card><CardHeader title="Project timeline"/>{projects.data?.data.length?<DataTable caption="Project timeline" rows={projects.data.data} getRowKey={r=>r.id} columns={[{key:"project",header:"Project",render:r=><><p className="font-medium">{r.name}</p><p className="type-caption text-[var(--muted)]">{r.code}</p></>},{key:"start",header:"Start",render:r=>r.startDate},{key:"end",header:"Planned end",render:r=>r.plannedEndDate??"Not set"},{key:"owner",header:"Owner",render:r=>r.ownerName},{key:"members",header:"Members",render:r=>r.memberCount},{key:"status",header:"Status",render:r=><StatusBadge label={r.status} tone={r.status==="ACTIVE"?"success":"info"}/>}]}/>:<EmptyState title="No projects" description="Create a project from the Projects tab."/>}</Card>
    <Card><CardHeader title="Recent activity"/>{activities.data?.data.length?<DataTable caption="Recent activity" rows={activities.data.data} getRowKey={r=>r.id} columns={[{key:"activity",header:"Activity",render:r=><><p className="font-medium">{r.title}</p><p className="type-caption text-[var(--muted)]">{r.projectName}</p></>},{key:"employee",header:"Employee",render:r=>r.ownerName},{key:"date",header:"Date",render:r=>r.activityDate},{key:"status",header:"Status",render:r=><StatusBadge label={r.status} tone={r.status==="BLOCKED"?"warning":"info"}/>}]}/>:<EmptyState title="No activity" description="Create a work update from the Work tab."/>}</Card>
  </div>;
}
