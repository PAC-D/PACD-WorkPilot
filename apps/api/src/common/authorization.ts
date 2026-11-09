import type { Permission, Principal, Role } from "@pacd/contracts";

export type AuthorizationScope = "OWN" | "PROJECT_MEMBER" | "DEPARTMENT" | "ASSIGNED_REVIEWER" | "ALL";

export interface AuthorizationRequest {
  actor: Principal;
  ownerId?: string;
  permission: Permission;
  resourceScope?: AuthorizationScope;
  resourceScopeId?: string;
  scopeIds?: ReadonlyArray<string>;
  selfApproval?: boolean;
}

export function canAccess(request: AuthorizationRequest): boolean {
  if (!request.actor.permissions.includes(request.permission)) return false;
  if (request.selfApproval === true && request.ownerId === request.actor.id) return false;

  if (request.resourceScope === "OWN") return request.ownerId === request.actor.id;
  if (request.resourceScope === "ALL") return request.scopeIds?.includes("ALL") === true;
  if (request.resourceScopeId === undefined) return false;

  return request.scopeIds?.includes(request.resourceScopeId) === true;
}

export function canManageRequest(role: Role, hasExplicitGrant: boolean): boolean {
  return role === "SUPER_ADMIN" || (role === "ADMIN" && hasExplicitGrant);
}
