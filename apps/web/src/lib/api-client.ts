import {
  accountSchema, activitySchema, auditRecordSchema, claimSchema, dashboardSummarySchema, departmentSchema, workTagSchema,
  entityChangedSchema,
  fileRecordSchema, uploadAuthorizationSchema,
  listResponseSchema, principalSchema, projectSchema, requestSchema, type CreateActivityInput, type CreateClaimInput,
  type CreateHostedAccountInput, type CreateLocalAccountInput, type CreateProjectInput, type CreateRequestInput, type Principal, type UpsertDepartmentInput,
  type ClaimTransitionInput, type RequestTransitionInput, type AssignProjectMemberInput, type UpdateActivityInput, type UpdateProjectInput, type AdminVisibilityInput,
  type EntityChanged,
} from "@pacd/contracts";
import { z } from "zod";

import { authMode, hostedAuthClient } from "../features/auth/auth-client";
import { previewRequest, uiPreviewEnabled } from "./ui-preview";

const apiBase = import.meta.env.VITE_API_URL ?? "http://127.0.0.1:3000/api/v1";
const identityKey = "workpilot.localIdentity";
export const fileUploadsEnabled = authMode === "local" || import.meta.env.VITE_FILE_UPLOADS_ENABLED === "true";

export class ApiError extends Error { readonly status:number; constructor(status: number, message: string) { super(message); this.status=status; } }

function localIdentity(): string | null { return sessionStorage.getItem(identityKey); }

async function request(path: string, init: RequestInit = {}) {
  if (uiPreviewEnabled) {
    const result = await previewRequest(path, init);
    const previewError = z.object({ __previewError: z.object({ message: z.string(), status: z.number() }) }).safeParse(result);
    if (previewError.success) throw new ApiError(previewError.data.__previewError.status, previewError.data.__previewError.message);
    return result;
  }
  const headers = new Headers(init.headers);
  headers.set("Accept", "application/json");
  if (init.body) headers.set("Content-Type", "application/json");
  const identity = localIdentity(); if (identity) headers.set("X-WorkPilot-Local-User", identity);
  if (authMode === "cognito") {
    const token = await hostedAuthClient.accessToken();
    if (token) headers.set("Authorization", `Bearer ${token}`);
  }
  let response: Response;
  try {
    response = await fetch(`${apiBase}${path}`, { ...init, headers });
  } catch {
    throw new ApiError(0, `Cannot reach the WorkPilot API at ${apiBase}. Check the server connection, then retry.`);
  }
  const body = await response.json() as unknown;
  if (!response.ok) {
    const parsed = z.object({ error: z.object({ message: z.string() }) }).safeParse(body);
    throw new ApiError(response.status, parsed.success ? parsed.data.error.message : "Request failed");
  }
  return body;
}

async function eventHeaders():Promise<Headers>{
  const headers=new Headers({Accept:"text/event-stream"});
  const identity=localIdentity();if(identity)headers.set("X-WorkPilot-Local-User",identity);
  if(authMode==="cognito"){const token=await hostedAuthClient.accessToken();if(token)headers.set("Authorization",`Bearer ${token}`);}
  return headers;
}

async function write<T>(path: string, input: unknown, schema: z.ZodType<T>, method = "POST"): Promise<T> {
  const body = await request(path, { body: JSON.stringify(input), headers: { "Idempotency-Key": crypto.randomUUID() }, method });
  return z.object({ data: schema }).parse(body).data;
}

const identitySchema = z.object({ displayName:z.string(), employeeCode:z.string(), id:z.string(), role:z.enum(["USER","ADMIN","SUPER_ADMIN"]), username:z.string() });

export const apiClient = {
  clearIdentity() { sessionStorage.removeItem(identityKey); },
  async listIdentities() { return z.object({data:z.array(identitySchema)}).parse(await request("/development/identities")).data; },
  async signInLocal(id:string):Promise<Principal> { sessionStorage.setItem(identityKey,id); try{return await this.me();}catch(error){this.clearIdentity();throw error;} },
  async me() { return z.object({data:principalSchema}).parse(await request("/me")).data; },
  async config() { return z.object({data:z.object({departments:z.array(departmentSchema),workTags:z.array(workTagSchema)})}).parse(await request("/config")).data; },
  async users(cursor?:string|null) { return listResponseSchema(accountSchema).parse(await request(`/users?limit=20${cursor?`&cursor=${encodeURIComponent(cursor)}`:""}`)); },
  createUser(input:CreateLocalAccountInput | CreateHostedAccountInput) { return write("/users",input,accountSchema); },
  async projects(cursor?:string|null,search="") { return listResponseSchema(projectSchema).parse(await request(`/projects?limit=20${cursor?`&cursor=${encodeURIComponent(cursor)}`:""}${search?`&search=${encodeURIComponent(search)}`:""}`)); },
  createProject(input:CreateProjectInput) { return write("/projects",input,projectSchema); },
  updateProject(id:string,input:UpdateProjectInput){return write(`/projects/${encodeURIComponent(id)}`,input,projectSchema,"PATCH");},
  assignProjectMember(projectId:string,input:AssignProjectMemberInput){return write(`/projects/${encodeURIComponent(projectId)}/members`,input,z.object({accountSub:z.string(),id:z.string(),projectId:z.string()}));},
  async activities(cursor?:string|null) { return listResponseSchema(activitySchema).parse(await request(`/activities?limit=20${cursor?`&cursor=${encodeURIComponent(cursor)}`:""}`)); },
  createActivity(input:CreateActivityInput) { return write("/activities",input,activitySchema); },
  updateActivity(id:string,input:UpdateActivityInput){return write(`/activities/${encodeURIComponent(id)}`,input,activitySchema,"PATCH");},
  createWorkTag(name:string){return write("/config/work-tags",{name},workTagSchema);},
  async adminVisibility(id:string){return z.object({data:z.array(z.string())}).parse(await request(`/users/${encodeURIComponent(id)}/visibility`)).data;},
  setAdminVisibility(id:string,input:AdminVisibilityInput){return write(`/users/${encodeURIComponent(id)}/visibility`,input,z.object({viewerSub:z.string(),targetSub:z.string(),enabled:z.boolean()}),"PUT");},
  async claims(cursor?:string|null) { return listResponseSchema(claimSchema).parse(await request(`/claims?limit=20${cursor?`&cursor=${encodeURIComponent(cursor)}`:""}`)); },
  createClaim(input:CreateClaimInput) { return write("/claims",input,claimSchema); },
  submitClaim(id:string,version:number){return write(`/claims/${encodeURIComponent(id)}/submit`,{version},claimSchema);},
  reviewClaim(id:string,input:ClaimTransitionInput){return write(`/claims/${encodeURIComponent(id)}/review`,input,claimSchema);},
  async requests(cursor?:string|null) { return listResponseSchema(requestSchema).parse(await request(`/requests?limit=20${cursor?`&cursor=${encodeURIComponent(cursor)}`:""}`)); },
  createRequest(input:CreateRequestInput) { return write("/requests",input,requestSchema); },
  submitRequest(id:string,version:number){return write(`/requests/${encodeURIComponent(id)}/submit`,{version},requestSchema);},
  reviewRequest(id:string,input:RequestTransitionInput){return write(`/requests/${encodeURIComponent(id)}/review`,input,requestSchema);},
  async audit(cursor?:string|null) { return listResponseSchema(auditRecordSchema).parse(await request(`/audit?limit=20${cursor?`&cursor=${encodeURIComponent(cursor)}`:""}`)); },
  async dashboard() { return z.object({data:dashboardSummarySchema}).parse(await request("/dashboard/summary")).data; },
  async streamEvents(onEvent:(event:EntityChanged)=>void,onConnected:()=>void,signal:AbortSignal):Promise<void>{
    const response=await fetch(`${apiBase}/events`,{headers:await eventHeaders(),signal});
    if(!response.ok||!response.body)throw new ApiError(response.status,"Live updates unavailable");
    onConnected();const reader=response.body.getReader(),decoder=new TextDecoder();let pending="";
    try{while(true){const next=await reader.read();if(next.done)break;pending+=decoder.decode(next.value,{stream:true});
      let boundary=pending.indexOf("\n\n");while(boundary>=0){const frame=pending.slice(0,boundary);pending=pending.slice(boundary+2);
        if(frame.startsWith("data: ")){try{const event=entityChangedSchema.safeParse(JSON.parse(frame.slice(6)));if(event.success)onEvent(event.data);}catch{ /* ignore invalid hint */ }}
        boundary=pending.indexOf("\n\n");
      }
    }}finally{reader.releaseLock();}
  },
  upsertDepartment(id:string,input:UpsertDepartmentInput) { return write(`/config/departments/${encodeURIComponent(id)}`,input,departmentSchema,"PUT"); },
  async uploadClaimFile(claimId:string,file:File) {
    const intent={claimId,fileName:file.name,mimeType:file.type,sizeBytes:file.size};
    const authorization=await write("/files/presign-upload",intent,uploadAuthorizationSchema);
    const uploaded=await fetch(authorization.url,{body:file,headers:authorization.headers,method:"PUT"});
    if(!uploaded.ok)throw new ApiError(uploaded.status,"File upload failed");
    return write(`/files/${encodeURIComponent(authorization.file.id)}/finalize`,{},fileRecordSchema);
  },
  async uploadRequestFile(requestId:string,file:File){
    const authorization=await write("/files/presign-upload",{requestId,fileName:file.name,mimeType:file.type,sizeBytes:file.size},uploadAuthorizationSchema);
    const uploaded=await fetch(authorization.url,{body:file,headers:authorization.headers,method:"PUT"});
    if(!uploaded.ok)throw new ApiError(uploaded.status,"File upload failed");
    return write(`/files/${encodeURIComponent(authorization.file.id)}/finalize`,{},fileRecordSchema);
  },
  async downloadFile(id:string){return z.object({data:z.object({url:z.string().url(),expiresAt:z.string().datetime()})}).parse(await request(`/files/${encodeURIComponent(id)}/download`)).data;},
};
