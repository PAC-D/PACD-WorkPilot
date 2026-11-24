import type {
  Account,
  Activity,
  AuditRecord,
  Claim,
  DashboardSummary,
  Department,
  Principal,
  Project,
  WorkRequest,
} from "@pacd/contracts";

const requested = import.meta.env.VITE_UI_PREVIEW === "true";

if (requested && import.meta.env.PROD) {
  throw new Error("VITE_UI_PREVIEW is development-only and cannot be enabled in a production build");
}

export const uiPreviewEnabled = requested && import.meta.env.DEV;

const signedInKey = "workpilot.uiPreview.signedIn";

const principal: Principal = {
  department: "Operations",
  displayName: "System Administrator",
  employeeCode: "EMP-001",
  id: "user-admin",
  permissions: [
    "work.create.own", "work.read.own", "work.edit.own", "work.read.scope",
    "projects.read.assigned", "projects.request_join", "projects.manage", "projects.assign",
    "claims.create.own", "claims.read.own", "claims.edit.own", "claims.read.scope",
    "claims.edit.scope", "claims.review.scope", "claims.approve.scope", "claims.mark_paid.scope",
    "requests.create.own", "requests.read.own", "requests.read.scope", "requests.review.scope",
    "users.read.scope", "users.manage", "roles.manage", "settings.manage", "audit.read",
    "dashboard.read.scope", "reports.export.scope",
  ],
  policyVersion: 1,
  role: "SUPER_ADMIN",
};

let departments: Department[] = [
  { id: "operations", name: "Operations" },
  { id: "programmes", name: "Programmes" },
];
let workTags=[{id:"DESIGN",name:"Design"},{id:"GENERAL",name:"General"}];
let visibleAdminIds:ReadonlyArray<string>=[];

let accounts: Account[] = [
  { createdAt: "2026-11-01T08:00:00.000Z", departmentId: "operations", departmentName: "Operations", displayName: "System Administrator", email: "admin@example.invalid", employeeCode: "EMP-001", id: "user-admin", role: "SUPER_ADMIN", status: "ACTIVE", username: "admin", version: 1 },
  { createdAt: "2026-11-02T08:00:00.000Z", departmentId: "programmes", departmentName: "Programmes", displayName: "Amina Rahman", email: "amina@example.invalid", employeeCode: "EMP-002", id: "user-amina", role: "USER", status: "ACTIVE", username: "amina", version: 1 },
];

let projects: Project[] = [
  { actualEndDate: null, code: "PACD-OPS", description: "Internal operations portal.", id: "project-operations", memberCount: 4, name: "Operations Portal", ownerName: "System Administrator", ownerSub: "user-admin", plannedEndDate: "2027-02-28", startDate: "2026-10-01", status: "ACTIVE", version: 1,canCreateTask:true },
  { actualEndDate: null, code: "PACD-FIELD", description: "Field team coordination.", id: "project-field", memberCount: 3, name: "Field Coordination", ownerName: "Amina Rahman", ownerSub: "user-amina", plannedEndDate: "2026-12-20", startDate: "2026-09-15", status: "ON_HOLD", version: 1,canCreateTask:true },
];

let activities: Activity[] = [
  { activityDate: "2026-11-22", categoryId: "DESIGN", id: "activity-1", ownerName: "Amina Rahman", projectId: "project-operations", projectName: "Operations Portal", status: "IN_PROGRESS", timeSpentMinutes: 180, title: "Review mobile claim flow", userSub: "user-amina", version: 1,startDate:"2026-11-22",plannedEndDate:"2026-12-01",actualEndDate:null,notes:"Review the flow" },
  { activityDate: "2026-11-21", categoryId: "GENERAL", id: "activity-2", ownerName: "System Administrator", projectId: "project-field", projectName: "Field Coordination", status: "BLOCKED", timeSpentMinutes: 60, title: "Confirm project dates", userSub: "user-admin", version: 1,startDate:"2026-11-21",plannedEndDate:null,actualEndDate:null,notes:"Awaiting dates" },
];

let claims: Claim[] = [
  { amountMinor: 185000, claimType: "INTERNET_BILL", createdAt: "2026-11-20T06:30:00.000Z", currency: "BDT", id: "claim-1", memo: "October internet bill", ownerName: "Amina Rahman", periodMonth: "2026-10", status: "SUBMITTED", userSub: "user-amina", version: 1,files:[] },
  { amountMinor: 95000, claimType: "MOBILE_BILL", createdAt: "2026-11-19T06:30:00.000Z", currency: "BDT", id: "claim-2", memo: "November mobile bill", ownerName: "System Administrator", periodMonth: "2026-11", status: "DRAFT", userSub: "user-admin", version: 1,files:[] },
];

let requests: WorkRequest[] = [
  { createdAt: "2026-11-18T07:00:00.000Z", id: "request-1", ownerName: "Amina Rahman", reason: "Required for the design workflow.", requestType: "SOFTWARE_INSTALL", requesterSub: "user-amina", status: "SUBMITTED", title: "Install design software", version: 1,files:[] },
  { createdAt: "2026-11-17T07:00:00.000Z", id: "request-2", ownerName: "System Administrator", reason: "Office access update.", requestType: "GENERAL", requesterSub: "user-admin", status: "DRAFT", title: "Update access list", version: 1,files:[] },
];

let audit: AuditRecord[] = [
  { action: "claim.submitted", actorSub: "user-amina", id: "audit-1", occurredAt: "2026-11-20T06:35:00.000Z", resourceId: "claim-1", resourceType: "claim" },
  { action: "project.created", actorSub: "user-admin", id: "audit-2", occurredAt: "2026-11-01T08:00:00.000Z", resourceId: "project-operations", resourceType: "project" },
];

function data<T>(value: T) { return { data: value }; }
function list<T>(value: ReadonlyArray<T>) { return { data: value, page: { hasMore: false, nextCursor: null } }; }
function parsedBody(init: RequestInit): Record<string, unknown> {
  return typeof init.body === "string" ? JSON.parse(init.body) as Record<string, unknown> : {};
}
function identifier(prefix: string) { return `${prefix}-${crypto.randomUUID()}`; }
function now() { return new Date().toISOString(); }
function owner(sub: string) { return accounts.find((account) => account.id === sub)?.displayName ?? "Preview user"; }
function findPathId(path: string, resource: string) { return decodeURIComponent(path.split(`/${resource}/`)[1]?.split("/")[0] ?? ""); }

export function previewSignedIn() { return sessionStorage.getItem(signedInKey) === "true"; }
export function previewSignIn() { sessionStorage.setItem(signedInKey, "true"); }
export function previewSignOut() { sessionStorage.removeItem(signedInKey); }

export async function previewRequest(path: string, init: RequestInit = {}): Promise<unknown> {
  await Promise.resolve();
  const method = init.method ?? "GET";
  const body = parsedBody(init);

  if (path === "/me") {
    if (!previewSignedIn()) return { __previewError: { status: 401, message: "Sign in to continue" } };
    return data(principal);
  }
  if (path === "/development/identities") return data([]);
  if (!previewSignedIn()) return { __previewError: { status: 401, message: "Sign in to continue" } };
  if (path === "/config" && method === "GET") return data({ departments,workTags });
  if (path.match(/^\/users\/[^/]+\/visibility$/) && method === "GET") return data(visibleAdminIds);
  if (path.match(/^\/users\/[^/]+\/visibility$/) && method === "PUT") {visibleAdminIds=body.enabled?[...visibleAdminIds,String(body.targetSub)]:visibleAdminIds.filter(id=>id!==body.targetSub);return data({viewerSub:findPathId(path,"users"),targetSub:String(body.targetSub),enabled:Boolean(body.enabled)});}
  if (path.startsWith("/users?") && method === "GET") return list(accounts);
  if (path.startsWith("/projects?") && method === "GET") {const search=new URLSearchParams(path.split("?")[1]).get("search")?.toLowerCase()??"";return list(projects.filter(p=>p.name.toLowerCase().startsWith(search)));}
  if (path.startsWith("/activities?") && method === "GET") return list(activities);
  if (path.startsWith("/claims?") && method === "GET") return list(claims);
  if (path.startsWith("/requests?") && method === "GET") return list(requests);
  if (path.startsWith("/audit?") && method === "GET") return list(audit);
  if (path === "/dashboard/summary") {
    const summary: DashboardSummary = {
      activeProjects: projects.filter((project) => project.status === "ACTIVE").length,
      blockedWork: activities.filter((activity) => activity.status === "BLOCKED").length,
      pendingClaims: claims.filter((claim) => ["SUBMITTED", "UNDER_REVIEW", "NEEDS_INFO"].includes(claim.status)).length,
      pendingRequests: requests.filter((request) => ["SUBMITTED", "IN_REVIEW", "NEEDS_INFO"].includes(request.status)).length,
      projectMix: [{ count: 1, name: "Active" }, { count: 1, name: "On hold" }],
      workTrend: [{ completed: 1, day: "Nov 18", updates: 2 }, { completed: 2, day: "Nov 21", updates: 3 }, { completed: 1, day: "Nov 23", updates: 2 }],
      employees:accounts.map(a=>({id:a.id,name:a.displayName,currentTask:activities.find(t=>t.userSub===a.id&&t.status!=="COMPLETED")?.title??null,currentTasks:activities.filter(t=>t.userSub===a.id&&t.status!=="COMPLETED").length,pendingClaims:claims.filter(c=>c.userSub===a.id&&["SUBMITTED","UNDER_REVIEW","NEEDS_INFO"].includes(c.status)).length,pendingRequests:requests.filter(r=>r.requesterSub===a.id&&["SUBMITTED","IN_REVIEW","NEEDS_INFO"].includes(r.status)).length})),
    };
    return data(summary);
  }
  if (path === "/users" && method === "POST") {
    const department = departments.find((item) => item.id === body.departmentId);
    const account: Account = { createdAt: now(), departmentId: String(body.departmentId), departmentName: department?.name ?? null, displayName: String(body.displayName), email: body.email ? String(body.email) : null, employeeCode: String(body.employeeCode), id: identifier("preview-user"), role: body.role as Account["role"], status: "ACTIVE", username: String(body.username), version: 1 };
    accounts = [account, ...accounts]; return data(account);
  }
  if (path === "/projects" && method === "POST") {
    const project: Project = { actualEndDate: null, code: String(body.code??"PREVIEW"), description: String(body.description ?? ""), id: identifier("preview-project"), memberCount: 1, name: String(body.name), ownerName: owner(String(body.ownerSub??principal.id)), ownerSub: String(body.ownerSub??principal.id), plannedEndDate: body.plannedEndDate ? String(body.plannedEndDate) : null, startDate: String(body.startDate), status: body.status as Project["status"], version: 1,canCreateTask:String(body.ownerSub??principal.id)===principal.id };
    projects = [project, ...projects]; return data(project);
  }
  if(path.match(/^\/projects\/[^/]+$/)&&method==="PATCH"){
    const id=findPathId(path,"projects");let updated:Project|undefined;
    projects=projects.map(p=>p.id===id?(updated={...p,name:String(body.name),description:String(body.description),startDate:String(body.startDate),plannedEndDate:body.plannedEndDate?String(body.plannedEndDate):null,actualEndDate:body.actualEndDate?String(body.actualEndDate):null,status:body.status as Project["status"],version:p.version+1}):p);
    return data(updated);
  }
  if (path.match(/^\/projects\/[^/]+\/members$/) && method === "POST") {
    const projectId = findPathId(path, "projects");
    projects = projects.map((project) => project.id === projectId ? { ...project, memberCount: project.memberCount + 1, version: project.version + 1 } : project);
    return data({ accountSub: String(body.accountSub), id: identifier("preview-membership"), projectId });
  }
  if (path === "/activities" && method === "POST") {
    const project = projects.find((item) => item.id === body.projectId);
    const activity: Activity = { activityDate: String(body.activityDate), categoryId: String(body.categoryId), id: identifier("preview-activity"), ownerName: principal.displayName, projectId: String(body.projectId), projectName: project?.name ?? "Preview project", status: body.status as Activity["status"], timeSpentMinutes: body.timeSpentMinutes == null ? null : Number(body.timeSpentMinutes), title: String(body.title), userSub: principal.id, version: 1,startDate:String(body.startDate),plannedEndDate:body.plannedEndDate?String(body.plannedEndDate):null,actualEndDate:body.actualEndDate?String(body.actualEndDate):null,notes:String(body.notes) };
    activities = [activity, ...activities]; return data(activity);
  }
  if(path.match(/^\/activities\/[^/]+$/)&&method==="PATCH"){
    const id=findPathId(path,"activities");let updated:Activity|undefined;
    activities=activities.map(a=>a.id===id?(updated={...a,title:String(body.title),categoryId:String(body.categoryId),activityDate:String(body.activityDate),startDate:String(body.startDate),plannedEndDate:body.plannedEndDate?String(body.plannedEndDate):null,actualEndDate:body.actualEndDate?String(body.actualEndDate):null,notes:String(body.notes),status:body.status as Activity["status"],version:a.version+1}):a);
    return data(updated);
  }
  if (path === "/claims" && method === "POST") {
    const claim: Claim = { amountMinor: Number(body.amountMinor), claimType: String(body.claimType), createdAt: now(), currency: "BDT", id: identifier("preview-claim"), memo: String(body.memo ?? ""), ownerName: principal.displayName, periodMonth: String(body.periodMonth), status: "DRAFT", userSub: principal.id, version: 1,files:[] };
    claims = [claim, ...claims]; return data(claim);
  }
  if (path.match(/^\/claims\/[^/]+\/(submit|review)$/) && method === "POST") {
    const id = findPathId(path, "claims"); const toStatus = path.endsWith("/submit") ? "SUBMITTED" : String(body.toStatus);
    let changed: Claim | undefined; claims = claims.map((claim) => claim.id === id ? (changed = { ...claim, status: toStatus as Claim["status"], version: claim.version + 1 }) : claim);
    return data(changed);
  }
  if (path === "/requests" && method === "POST") {
    const request: WorkRequest = { createdAt: now(), id: identifier("preview-request"), ownerName: principal.displayName, reason: String(body.reason), requestType: body.requestType as WorkRequest["requestType"], requesterSub: principal.id, status: "DRAFT", title: String(body.title), version: 1,files:[] };
    requests = [request, ...requests]; return data(request);
  }
  if (path.match(/^\/requests\/[^/]+\/(submit|review)$/) && method === "POST") {
    const id = findPathId(path, "requests"); const toStatus = path.endsWith("/submit") ? "SUBMITTED" : String(body.toStatus);
    let changed: WorkRequest | undefined; requests = requests.map((request) => request.id === id ? (changed = { ...request, status: toStatus as WorkRequest["status"], version: request.version + 1 }) : request);
    return data(changed);
  }
  if (path.startsWith("/config/departments/") && method === "PUT") {
    const id = decodeURIComponent(path.split("/").at(-1) ?? ""); const department = { id, name: String(body.name) };
    departments = [department, ...departments.filter((item) => item.id !== id)]; return data(department);
  }
  if(path==="/config/work-tags"&&method==="POST"){const tag={id:identifier("tag"),name:String(body.name)};workTags=[...workTags,tag];return data(tag);}

  return { __previewError: { status: 404, message: "The requested action is not available" } };
}
