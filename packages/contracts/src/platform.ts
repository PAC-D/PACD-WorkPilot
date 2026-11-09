import { z } from "zod";

import { activityStatusSchema, claimStatusSchema, projectStatusSchema, requestStatusSchema, roleSchema } from "./dashboard.ts";
import { pageSchema } from "./common.ts";

export const accountSchema = z.object({
  createdAt: z.string().datetime(), departmentId: z.string().nullable(), departmentName: z.string().nullable(),
  displayName: z.string(), email: z.string().nullable(), employeeCode: z.string(), id: z.string(), role: roleSchema,
  status: z.enum(["ACTIVE", "DISABLED"]), username: z.string(), version: z.number().int().positive(),
});
export type Account = z.infer<typeof accountSchema>;
export const createLocalAccountInputSchema = z.object({
  departmentId: z.string().min(1), displayName: z.string().trim().min(2).max(120),
  email: z.string().trim().email().nullable().optional(), employeeCode: z.string().trim().min(2).max(40),
  role: roleSchema, username: z.string().trim().min(2).max(80).regex(/^[a-z0-9._-]+$/),
});
export type CreateLocalAccountInput = z.infer<typeof createLocalAccountInputSchema>;

export const projectSchema = z.object({
  actualEndDate: z.string().nullable(), code: z.string(), description: z.string(), id: z.string(),
  memberCount: z.number().int().nonnegative(), name: z.string(), ownerName: z.string(), ownerSub: z.string(),
  plannedEndDate: z.string().nullable(), startDate: z.string(), status: projectStatusSchema, version: z.number().int().positive(),
});
export type Project = z.infer<typeof projectSchema>;
export const createProjectInputSchema = z.object({
  code: z.string().trim().min(2).max(30), description: z.string().trim().max(2000).default(""),
  name: z.string().trim().min(2).max(160), ownerSub: z.string().min(1),
  plannedEndDate: z.string().date().nullable().optional(), startDate: z.string().date(), status: projectStatusSchema,
});
export type CreateProjectInput = z.infer<typeof createProjectInputSchema>;
export const assignProjectMemberInputSchema = z.object({ accountSub:z.string().min(1), dueDate:z.string().date().nullable().optional() });
export type AssignProjectMemberInput = z.infer<typeof assignProjectMemberInputSchema>;

export const activitySchema = z.object({
  activityDate: z.string(), categoryId: z.string(), id: z.string(), ownerName: z.string(),
  projectId: z.string(), projectName: z.string(), status: activityStatusSchema,
  timeSpentMinutes: z.number().int().nonnegative().nullable(), title: z.string(), userSub: z.string(), version: z.number().int().positive(),
});
export type Activity = z.infer<typeof activitySchema>;
export const createActivityInputSchema = z.object({
  activityDate: z.string().date(), categoryId: z.string().trim().min(1).max(80), notes: z.string().trim().min(1).max(5000),
  projectId: z.string().min(1), status: activityStatusSchema, timeSpentMinutes: z.number().int().nonnegative().nullable().optional(),
  title: z.string().trim().min(2).max(200),
});
export type CreateActivityInput = z.infer<typeof createActivityInputSchema>;

export const claimSchema = z.object({
  amountMinor: z.number().int().nonnegative(), claimType: z.string(), createdAt: z.string().datetime(), currency: z.literal("BDT"),
  id: z.string(), memo: z.string(), ownerName: z.string(), periodMonth: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/),
  status: claimStatusSchema, userSub: z.string(), version: z.number().int().positive(),
});
export type Claim = z.infer<typeof claimSchema>;
export const createClaimInputSchema = z.object({
  amountMinor: z.number().int().nonnegative(), claimType: z.enum(["MOBILE_BILL", "INTERNET_BILL", "TRAVEL_ALLOWANCE"]),
  memo: z.string().trim().max(2000).default(""), periodMonth: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/),
});
export type CreateClaimInput = z.infer<typeof createClaimInputSchema>;
export const versionInputSchema = z.object({ version:z.number().int().positive() });
export const claimTransitionInputSchema = z.object({
  reason:z.string().trim().max(2000).optional(),
  toStatus:z.enum(["UNDER_REVIEW","NEEDS_INFO","APPROVED","REJECTED","PAID"]),
  version:z.number().int().positive(),
});
export type ClaimTransitionInput = z.infer<typeof claimTransitionInputSchema>;

const requestTypeSchema = z.enum(["SOFTWARE_INSTALL", "LEAVE", "API_ACCESS", "PURCHASE", "IT_SUPPORT", "GENERAL"]);
export const requestSchema = z.object({
  createdAt: z.string().datetime(), id: z.string(), ownerName: z.string(), reason: z.string(), requestType: requestTypeSchema,
  requesterSub: z.string(), status: requestStatusSchema, title: z.string(), version: z.number().int().positive(),
});
export type WorkRequest = z.infer<typeof requestSchema>;
export const createRequestInputSchema = z.object({
  reason: z.string().trim().min(2).max(5000), requestType: requestTypeSchema, title: z.string().trim().min(2).max(200),
});
export type CreateRequestInput = z.infer<typeof createRequestInputSchema>;
export const requestTransitionInputSchema = z.object({
  reason:z.string().trim().max(2000).optional(),
  toStatus:z.enum(["IN_REVIEW","NEEDS_INFO","APPROVED","REJECTED","FULFILLED","CLOSED"]),
  version:z.number().int().positive(),
});
export type RequestTransitionInput = z.infer<typeof requestTransitionInputSchema>;

export const auditRecordSchema = z.object({
  action: z.string(), actorSub: z.string(), id: z.string(), occurredAt: z.string().datetime(), resourceId: z.string(), resourceType: z.string(),
});
export type AuditRecord = z.infer<typeof auditRecordSchema>;
export const departmentSchema = z.object({ id: z.string(), name: z.string() });
export type Department = z.infer<typeof departmentSchema>;
export const upsertDepartmentInputSchema = z.object({ name: z.string().trim().min(2).max(120) });
export type UpsertDepartmentInput = z.infer<typeof upsertDepartmentInputSchema>;
export const dashboardSummarySchema = z.object({
  activeProjects: z.number().int().nonnegative(), blockedWork: z.number().int().nonnegative(), pendingClaims: z.number().int().nonnegative(),
  pendingRequests: z.number().int().nonnegative(), projectMix: z.array(z.object({ count: z.number().int().nonnegative(), name: z.string() })),
  workTrend: z.array(z.object({ completed: z.number().int().nonnegative(), day: z.string(), updates: z.number().int().nonnegative() })),
});
export type DashboardSummary = z.infer<typeof dashboardSummarySchema>;

export function listResponseSchema<T extends z.ZodType>(item: T) { return z.object({ data: z.array(item), page: pageSchema }); }
