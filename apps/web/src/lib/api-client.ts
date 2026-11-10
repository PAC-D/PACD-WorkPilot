import {
  accountSchema, activitySchema, auditRecordSchema, claimSchema, dashboardSummarySchema, departmentSchema,
  fileRecordSchema, uploadAuthorizationSchema,
  listResponseSchema, principalSchema, projectSchema, requestSchema, type CreateActivityInput, type CreateClaimInput,
  type CreateLocalAccountInput, type CreateProjectInput, type CreateRequestInput, type Principal, type UpsertDepartmentInput,
  type ClaimTransitionInput, type RequestTransitionInput, type AssignProjectMemberInput,
} from "@pacd/contracts";
import { z } from "zod";

import { authMode, hostedAuthClient } from "../features/auth/auth-client";

const apiBase = import.meta.env.VITE_API_URL ?? "http://127.0.0.1:3000/api/v1";
const identityKey = "workpilot.localIdentity";
export const fileUploadsEnabled = import.meta.env.VITE_FILE_UPLOADS_ENABLED === "true";

export class ApiError extends Error { readonly status:number; constructor(status: number, message: string) { super(message); this.status=status; } }

function localIdentity(): string | null { return sessionStorage.getItem(identityKey); }

async function request(path: string, init: RequestInit = {}) {
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
    throw new ApiError(0, `Cannot reach the local API at ${apiBase}. Start it with "pnpm dev:api", then retry.`);
  }
  const body = await response.json() as unknown;
  if (!response.ok) {
    const parsed = z.object({ error: z.object({ message: z.string() }) }).safeParse(body);
    throw new ApiError(response.status, parsed.success ? parsed.data.error.message : "Request failed");
  }
  return body;
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
  async config() { return z.object({data:z.object({departments:z.array(departmentSchema)})}).parse(await request("/config")).data; },
  async users(cursor?:string|null) { return listResponseSchema(accountSchema).parse(await request(`/users?limit=20${cursor?`&cursor=${encodeURIComponent(cursor)}`:""}`)); },
  createUser(input:CreateLocalAccountInput) { return write("/users",input,accountSchema); },
  async projects(cursor?:string|null) { return listResponseSchema(projectSchema).parse(await request(`/projects?limit=20${cursor?`&cursor=${encodeURIComponent(cursor)}`:""}`)); },
  createProject(input:CreateProjectInput) { return write("/projects",input,projectSchema); },
  assignProjectMember(projectId:string,input:AssignProjectMemberInput){return write(`/projects/${encodeURIComponent(projectId)}/members`,input,z.object({accountSub:z.string(),id:z.string(),projectId:z.string()}));},
  async activities(cursor?:string|null) { return listResponseSchema(activitySchema).parse(await request(`/activities?limit=20${cursor?`&cursor=${encodeURIComponent(cursor)}`:""}`)); },
  createActivity(input:CreateActivityInput) { return write("/activities",input,activitySchema); },
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
  upsertDepartment(id:string,input:UpsertDepartmentInput) { return write(`/config/departments/${encodeURIComponent(id)}`,input,departmentSchema,"PUT"); },
  async uploadClaimFile(claimId:string,file:File) {
    const intent={claimId,fileName:file.name,mimeType:file.type,sizeBytes:file.size};
    const authorization=await write("/files/presign-upload",intent,uploadAuthorizationSchema);
    const uploaded=await fetch(authorization.url,{body:file,headers:authorization.headers,method:"PUT"});
    if(!uploaded.ok)throw new ApiError(uploaded.status,"File upload failed");
    return write(`/files/${encodeURIComponent(authorization.file.id)}/finalize`,{},fileRecordSchema);
  },
};
