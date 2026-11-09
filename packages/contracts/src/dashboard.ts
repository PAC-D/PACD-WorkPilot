import { z } from "zod";

export const roleSchema = z.enum(["USER", "ADMIN", "SUPER_ADMIN"]);
export type Role = z.infer<typeof roleSchema>;

export const permissionSchema = z.enum([
  "work.create.own",
  "work.read.own",
  "work.edit.own",
  "work.read.scope",
  "projects.read.assigned",
  "projects.request_join",
  "projects.manage",
  "projects.assign",
  "claims.create.own",
  "claims.read.own",
  "claims.edit.own",
  "claims.read.scope",
  "claims.edit.scope",
  "claims.review.scope",
  "claims.approve.scope",
  "claims.mark_paid.scope",
  "requests.create.own",
  "requests.read.own",
  "requests.read.scope",
  "requests.review.scope",
  "users.read.scope",
  "users.manage",
  "roles.manage",
  "settings.manage",
  "audit.read",
  "dashboard.read.scope",
  "reports.export.scope",
]);
export type Permission = z.infer<typeof permissionSchema>;

export const projectStatusSchema = z.enum([
  "PLANNED",
  "ACTIVE",
  "ON_HOLD",
  "COMPLETED",
  "ARCHIVED",
]);
export type ProjectStatus = z.infer<typeof projectStatusSchema>;

export const activityStatusSchema = z.enum([
  "PLANNED",
  "IN_PROGRESS",
  "BLOCKED",
  "COMPLETED",
]);
export type ActivityStatus = z.infer<typeof activityStatusSchema>;

export const claimStatusSchema = z.enum([
  "DRAFT",
  "SUBMITTED",
  "UNDER_REVIEW",
  "NEEDS_INFO",
  "APPROVED",
  "REJECTED",
  "PAID",
]);
export type ClaimStatus = z.infer<typeof claimStatusSchema>;

export const requestStatusSchema = z.enum([
  "DRAFT",
  "SUBMITTED",
  "IN_REVIEW",
  "NEEDS_INFO",
  "APPROVED",
  "REJECTED",
  "FULFILLED",
  "CLOSED",
  "CANCELLED",
]);
export type RequestStatus = z.infer<typeof requestStatusSchema>;

export const principalSchema = z.object({
  id: z.string().min(1),
  displayName: z.string().min(1),
  employeeCode: z.string().min(1),
  department: z.string().min(1),
  role: roleSchema,
  permissions: z.array(permissionSchema),
  policyVersion: z.number().int().positive(),
});
export type Principal = z.infer<typeof principalSchema>;

