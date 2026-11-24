import type { Activity, Principal, Project, ProjectStatus, ActivityStatus } from "@pacd/contracts";
import { Button, Card, CardHeader, DataTable, EmptyState, Pagination, StatusBadge } from "@pacd/ui";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";

import { apiClient } from "../lib/api-client";

const control="interactive-control type-body min-h-10 rounded-lg border border-[var(--border)] bg-white px-3 text-[var(--ink)] focus:outline-none focus:ring-2 focus:ring-[var(--navy-500)]";
const projectStatuses:ReadonlyArray<ProjectStatus>=["PLANNED","ACTIVE","ON_HOLD","COMPLETED","ARCHIVED"];
const taskStatuses:ReadonlyArray<ActivityStatus>=["PLANNED","IN_PROGRESS","BLOCKED","COMPLETED"];
const taskLabel:Record<ActivityStatus,string>={PLANNED:"Upcoming",IN_PROGRESS:"Ongoing",BLOCKED:"Blocked",COMPLETED:"Completed"};
function Field({label,children}:{label:string;children:React.ReactNode}){return <label className="type-label grid gap-1.5 text-[var(--muted)]"><span>{label}</span>{children}</label>;}
function ErrorMessage({error}:{error:Error|null}){return error?<p role="alert" className="type-body text-[var(--danger)]">{error.message}</p>:null;}
function today(){return new Date().toISOString().slice(0,10);}

function usePage<T>(key:string,load:(cursor:string|null)=>Promise<{data:ReadonlyArray<T>;page:{nextCursor:string|null;hasMore:boolean}}>){
  const [cursor,setCursor]=useState<string|null>(null),[history,setHistory]=useState<ReadonlyArray<string|null>>([]);
  const query=useQuery({queryKey:[key,cursor],queryFn:()=>load(cursor),refetchInterval:false});
  return {query,canPrevious:history.length>0,next(){const value=query.data?.page.nextCursor;if(value){setHistory(v=>[...v,cursor]);setCursor(value);}},previous(){setCursor(history.at(-1)??null);setHistory(v=>v.slice(0,-1));}};
}

function ProjectForm({project,principal,onDone}:{project?:Project;principal:Principal;onDone:()=>void}){
  const owners=useQuery({queryKey:["users","project-form"],queryFn:()=>apiClient.users(),enabled:principal.role==="SUPER_ADMIN"&&!project});
  const save=useMutation({mutationFn:(input:Parameters<typeof apiClient.createProject>[0]|Parameters<typeof apiClient.updateProject>[1])=>project?apiClient.updateProject(project.id,input as Parameters<typeof apiClient.updateProject>[1]):apiClient.createProject(input as Parameters<typeof apiClient.createProject>[0]),onSuccess:onDone});
  function submit(event:FormEvent<HTMLFormElement>){event.preventDefault();const form=event.currentTarget,f=new FormData(form);
    const common={name:String(f.get("name")),description:String(f.get("description")),startDate:String(f.get("startDate")),plannedEndDate:String(f.get("plannedEndDate"))||null,status:String(f.get("status")) as ProjectStatus};
    if(project)save.mutate({...common,actualEndDate:String(f.get("actualEndDate"))||null,version:project.version});
    else save.mutate({...common,ownerSub:principal.role==="SUPER_ADMIN"?String(f.get("ownerSub"))||principal.id:principal.id},{onSuccess:()=>form.reset()});
  }
  return <form className="grid gap-4 p-5 md:grid-cols-3" onSubmit={submit}>
    <Field label="Project name"><input className={control} defaultValue={project?.name} name="name" required/></Field>
    {principal.role==="SUPER_ADMIN"&&!project?<Field label="Owner"><select className={control} name="ownerSub" required>{owners.data?.data.map(u=><option key={u.id} value={u.id}>{u.displayName} ({u.username})</option>)}</select></Field>:null}
    <Field label="Start date"><input className={control} defaultValue={project?.startDate??today()} name="startDate" required type="date"/></Field>
    <Field label="Approximate end"><input className={control} defaultValue={project?.plannedEndDate??""} name="plannedEndDate" type="date"/></Field>
    {project?<Field label="Completion date"><input className={control} defaultValue={project.actualEndDate??""} name="actualEndDate" type="date"/></Field>:null}
    <Field label="Status"><select className={control} defaultValue={project?.status??"ACTIVE"} name="status">{projectStatuses.map(s=><option key={s} value={s}>{s.replaceAll("_"," ")}</option>)}</select></Field>
    <Field label="Notes"><textarea className={control} defaultValue={project?.description} name="description"/></Field>
    <div className="md:col-span-3"><ErrorMessage error={save.error}/><Button disabled={save.isPending} type="submit">{save.isPending?"Saving...":project?"Save project":"Create project"}</Button></div>
  </form>;
}

export function SimpleProjectsPage({principal}:{principal:Principal}){
  const [assignmentSearch,setAssignmentSearch]=useState("");
  const client=useQueryClient(),list=usePage("projects",apiClient.projects),users=useQuery({queryKey:["users","assign"],queryFn:()=>apiClient.users(),enabled:principal.permissions.includes("projects.assign")});
  const assignmentProjects=useQuery({queryKey:["projects","assignment",assignmentSearch],queryFn:()=>apiClient.projects(null,assignmentSearch),enabled:principal.permissions.includes("projects.assign")});
  const [editing,setEditing]=useState<Project|null>(null);
  const assign=useMutation({mutationFn:({projectId,accountSub}:{projectId:string;accountSub:string})=>apiClient.assignProjectMember(projectId,{accountSub,dueDate:null}),onSuccess:async()=>{await client.invalidateQueries({queryKey:["projects"]});}});
  function assignment(event:FormEvent<HTMLFormElement>){event.preventDefault();const f=new FormData(event.currentTarget);assign.mutate({projectId:String(f.get("projectId")),accountSub:String(f.get("accountSub"))});}
  const refresh=()=>{setEditing(null);void client.invalidateQueries({queryKey:["projects"]});void client.invalidateQueries({queryKey:["dashboard"]});};
  return <div className="dashboard-stack space-y-5"><h1 className="type-page-title">Projects</h1>
    <Card><CardHeader title="Create project"/><ProjectForm principal={principal} onDone={refresh}/></Card>
    {editing?<Card><CardHeader title={`Edit ${editing.name}`}/><ProjectForm key={`${editing.id}-${editing.version}`} principal={principal} project={editing} onDone={refresh}/></Card>:null}
    {principal.permissions.includes("projects.assign")?<Card><CardHeader title="Assign employee to project"/><form className="flex flex-wrap items-end gap-4 p-5" onSubmit={assignment}>
      <Field label="Find project"><input className={control} onChange={event=>setAssignmentSearch(event.target.value)} placeholder="Start of project name" value={assignmentSearch}/></Field>
      <Field label="Project"><select className={control} name="projectId" required>{assignmentProjects.data?.data.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></Field>
      <Field label="Employee"><select className={control} name="accountSub" required>{users.data?.data.map(u=><option key={u.id} value={u.id}>{u.displayName} ({u.username})</option>)}</select></Field>
      <div><ErrorMessage error={assign.error}/><Button disabled={assign.isPending} type="submit">Assign</Button></div>
    </form></Card>:null}
    <Card><CardHeader title="Project list"/>{list.query.data?.data.length?<><DataTable caption="Projects" rows={list.query.data.data} getRowKey={p=>p.id} columns={[
      {key:"name",header:"Project",render:p=><><p>{p.name}</p><p className="type-caption text-[var(--muted)]">{p.code}</p></>},
      {key:"owner",header:"Owner",render:p=>p.ownerName},{key:"start",header:"Start",render:p=>p.startDate},
      {key:"planned",header:"Approximate end",render:p=>p.plannedEndDate??"Not set"},{key:"actual",header:"Completed",render:p=>p.actualEndDate??"Not set"},
      {key:"status",header:"Status",render:p=><StatusBadge label={p.status} tone={p.status==="COMPLETED"?"success":"info"}/>},
      {key:"edit",header:"Edit",render:p=>p.ownerSub===principal.id||principal.permissions.includes("projects.manage")?<Button onClick={()=>setEditing(p)} variant="secondary">Edit</Button>:null},
    ]}/><Pagination canNext={list.query.data.page.hasMore} canPrevious={list.canPrevious} onNext={list.next} onPrevious={list.previous}/></>:<EmptyState title="No projects" description="Create a project above."/>}</Card>
  </div>;
}

function TaskForm({task,projects,tags,onDone}:{task?:Activity;projects:ReadonlyArray<Project>;tags:ReadonlyArray<{id:string;name:string}>;onDone:()=>void}){
  const save=useMutation({mutationFn:(input:Parameters<typeof apiClient.createActivity>[0]|Parameters<typeof apiClient.updateActivity>[1])=>task?apiClient.updateActivity(task.id,input as Parameters<typeof apiClient.updateActivity>[1]):apiClient.createActivity(input as Parameters<typeof apiClient.createActivity>[0]),onSuccess:onDone});
  function submit(event:FormEvent<HTMLFormElement>){event.preventDefault();const form=event.currentTarget,f=new FormData(form),status=String(f.get("status")) as ActivityStatus;
    const common={activityDate:String(f.get("startDate")),startDate:String(f.get("startDate")),plannedEndDate:String(f.get("plannedEndDate"))||null,actualEndDate:status==="COMPLETED"?String(f.get("actualEndDate"))||today():null,categoryId:String(f.get("categoryId")),notes:String(f.get("notes")),status,title:String(f.get("title")),timeSpentMinutes:null};
    if(task)save.mutate({...common,version:task.version});else save.mutate({...common,projectId:String(f.get("projectId"))},{onSuccess:()=>form.reset()});
  }
  return <form className="grid gap-4 p-5 md:grid-cols-3" onSubmit={submit}>
    <Field label="Project"><select className={control} defaultValue={task?.projectId} disabled={Boolean(task)} name="projectId" required>{task&&!projects.some(p=>p.id===task.projectId)?<option value={task.projectId}>{task.projectName}</option>:null}{projects.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></Field>
    <Field label="Task title"><input className={control} defaultValue={task?.title} name="title" required/></Field>
    <Field label="Tag"><select className={control} defaultValue={task?.categoryId} name="categoryId" required>{tags.map(t=><option key={t.id} value={t.id}>{t.name}</option>)}</select></Field>
    <Field label="Start date"><input className={control} defaultValue={task?.startDate??today()} name="startDate" required type="date"/></Field>
    <Field label="Approximate end"><input className={control} defaultValue={task?.plannedEndDate??""} name="plannedEndDate" type="date"/></Field>
    <Field label="Completion date"><input className={control} defaultValue={task?.actualEndDate??""} name="actualEndDate" type="date"/></Field>
    <Field label="Status"><select className={control} defaultValue={task?.status??"PLANNED"} name="status">{taskStatuses.map(s=><option key={s} value={s}>{taskLabel[s]}</option>)}</select></Field>
    <Field label="Notes"><textarea className={control} defaultValue={task?.notes} name="notes" required/></Field>
    <div className="md:col-span-3"><ErrorMessage error={save.error}/><Button disabled={save.isPending||!projects.length||!tags.length} type="submit">{save.isPending?"Saving...":task?"Save task":"Create task"}</Button>{!tags.length?<p className="type-caption">A Super Admin must add a tag first.</p>:null}</div>
  </form>;
}

export function SimpleActivitiesPage({principal}:{principal:Principal}){
  const [projectSearch,setProjectSearch]=useState("");
  const client=useQueryClient(),list=usePage("activities",apiClient.activities),projects=useQuery({queryKey:["projects","task-form",projectSearch],queryFn:()=>apiClient.projects(null,projectSearch)}),config=useQuery({queryKey:["config"],queryFn:apiClient.config});
  const [editing,setEditing]=useState<Activity|null>(null);
  const [creatingProject,setCreatingProject]=useState(false);
  const refresh=()=>{setEditing(null);void client.invalidateQueries({queryKey:["activities"]});void client.invalidateQueries({queryKey:["dashboard"]});};
  const tagName=(id:string)=>config.data?.workTags.find(t=>t.id===id)?.name??id;
  return <div className="dashboard-stack space-y-5"><h1 className="type-page-title">Tasks</h1>
    {principal.permissions.includes("work.create.own")?<div><Button onClick={()=>setCreatingProject(value=>!value)} variant="secondary">{creatingProject?"Close new project":"Create a new project"}</Button></div>:null}
    {creatingProject?<Card><CardHeader title="New project"/><ProjectForm principal={principal} onDone={()=>{setCreatingProject(false);void client.invalidateQueries({queryKey:["projects"]});}}/></Card>:null}
    {principal.permissions.includes("work.create.own")?<Card><CardHeader title="Create task"/><div className="px-5 pt-5"><Field label="Find project"><input className={control} onChange={event=>setProjectSearch(event.target.value)} placeholder="Start of project name" value={projectSearch}/></Field></div><TaskForm projects={projects.data?.data.filter(p=>p.canCreateTask)??[]} tags={config.data?.workTags??[]} onDone={refresh}/></Card>:null}
    {editing?<Card><CardHeader title={`Edit ${editing.title}`}/><TaskForm key={`${editing.id}-${editing.version}`} task={editing} projects={projects.data?.data??[]} tags={config.data?.workTags??[]} onDone={refresh}/></Card>:null}
    <Card><CardHeader title="Tasks"/>{list.query.data?.data.length?<><DataTable caption="Tasks" rows={list.query.data.data} getRowKey={t=>t.id} columns={[
      {key:"title",header:"Task",render:t=><><p>{t.title}</p><p className="type-caption text-[var(--muted)]">{t.projectName}</p></>},
      {key:"employee",header:"Employee",render:t=>t.ownerName},{key:"tag",header:"Tag",render:t=>tagName(t.categoryId)},
      {key:"start",header:"Start",render:t=>t.startDate},{key:"planned",header:"Approximate end",render:t=>t.plannedEndDate??"Not set"},
      {key:"actual",header:"Completed",render:t=>t.actualEndDate??"Not set"},
      {key:"status",header:"Status",render:t=><StatusBadge label={taskLabel[t.status]} tone={t.status==="COMPLETED"?"success":t.status==="BLOCKED"?"warning":"info"}/>},
      {key:"edit",header:"Edit",render:t=>t.userSub===principal.id?<Button onClick={()=>setEditing(t)} variant="secondary">Edit</Button>:null},
    ]}/><Pagination canNext={list.query.data.page.hasMore} canPrevious={list.canPrevious} onNext={list.next} onPrevious={list.previous}/></>:<EmptyState title="No tasks" description="Create a project and task to begin."/>}</Card>
  </div>;
}
