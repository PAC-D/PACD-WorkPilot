import type { Principal } from "@pacd/contracts";
import { Button, Card, CardHeader, DataTable, EmptyState, StatusBadge } from "@pacd/ui";
import { useQuery } from "@tanstack/react-query";
import { lazy, Suspense } from "react";

import { apiClient } from "../lib/api-client";

const WorkTrendChart=lazy(()=>import("../components/charts").then(module=>({default:module.WorkTrendChart})));
const ProjectMixChart=lazy(()=>import("../components/charts").then(module=>({default:module.ProjectMixChart})));

export function DatabaseDashboard({ principal }: { principal:Principal }) {
  const summary=useQuery({queryKey:["dashboard",principal.id,principal.policyVersion],queryFn:apiClient.dashboard,refetchInterval:false});
  const projects=useQuery({queryKey:["projects","dashboard"],queryFn:()=>apiClient.projects()});
  const activities=useQuery({queryKey:["activities","dashboard"],queryFn:()=>apiClient.activities()});
  const refresh=()=>{void summary.refetch();void projects.refetch();void activities.refetch();};
  if(summary.error)return <EmptyState title="Dashboard unavailable" description={summary.error.message}/>;
  const data=summary.data;
  return <div className="dashboard-stack space-y-5">
    <header className="flex flex-wrap items-end justify-between gap-4"><div><p className="type-body font-medium text-[var(--muted)]">{principal.displayName}</p><h1 className="type-page-title mt-1 text-[var(--navy-950)]">PACD WorkPilot</h1><p className="type-body mt-1 text-[var(--muted)]">Live data from the local PostgreSQL API.</p></div><Button onClick={refresh} variant="secondary">Refresh data</Button></header>
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {[{label:"Pending Claims",value:data?.pendingClaims??0},{label:"Pending Requests",value:data?.pendingRequests??0},{label:"Active Projects",value:data?.activeProjects??0},{label:"Blocked Work",value:data?.blockedWork??0}].map(item=><Card className="p-4" key={item.label}><p className="type-body text-[var(--muted)]">{item.label}</p><p className="type-metric mt-2 text-[var(--navy-950)]">{item.value}</p></Card>)}
    </div>
    {data?<div className="grid gap-5 xl:grid-cols-[1.25fr_0.75fr]"><Suspense fallback={<Card className="min-h-80"/>}><WorkTrendChart data={data.workTrend} description="Last 30 days from authorized database records"/></Suspense><Suspense fallback={<Card className="min-h-80"/>}><ProjectMixChart data={data.projectMix}/></Suspense></div>:null}
    <Card><CardHeader title="Project timeline" description="Authorized database projects"/>{projects.data?.data.length?<DataTable caption="Project timeline" rows={projects.data.data} getRowKey={r=>r.id} columns={[{key:"project",header:"Project",render:r=><><p className="font-medium">{r.name}</p><p className="type-caption text-[var(--muted)]">{r.code}</p></>},{key:"start",header:"Start",render:r=>r.startDate},{key:"end",header:"Planned end",render:r=>r.plannedEndDate??"Not set"},{key:"owner",header:"Owner",render:r=>r.ownerName},{key:"members",header:"Members",render:r=>r.memberCount},{key:"status",header:"Status",render:r=><StatusBadge label={r.status} tone={r.status==="ACTIVE"?"success":"info"}/>}]}/>:<EmptyState title="No projects" description="Create a project from the Projects tab."/>}</Card>
    <Card><CardHeader title="Recent activity" description="Latest authorized work records"/>{activities.data?.data.length?<DataTable caption="Recent activity" rows={activities.data.data} getRowKey={r=>r.id} columns={[{key:"activity",header:"Activity",render:r=><><p className="font-medium">{r.title}</p><p className="type-caption text-[var(--muted)]">{r.projectName}</p></>},{key:"employee",header:"Employee",render:r=>r.ownerName},{key:"date",header:"Date",render:r=>r.activityDate},{key:"status",header:"Status",render:r=><StatusBadge label={r.status} tone={r.status==="BLOCKED"?"warning":"info"}/>}]}/>:<EmptyState title="No activity" description="Create a work update from the Work tab."/>}</Card>
  </div>;
}
