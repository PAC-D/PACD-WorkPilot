import type { Permission, Principal, Role } from "@pacd/contracts";

export interface NavigationItem {
  id: string;
  label: string;
  path: string;
  permission?: Permission;
  roles: ReadonlyArray<Role>;
}

const navigation: ReadonlyArray<NavigationItem> = [
  { id: "overview", label: "Overview", path: "/dashboard", roles: ["USER", "ADMIN", "SUPER_ADMIN"] },
  { id: "my-work", label: "My Work", path: "/work", roles: ["USER"] },
  { id: "people", label: "People", path: "/people", permission: "users.read.scope", roles: ["ADMIN", "SUPER_ADMIN"] },
  { id: "projects", label: "Projects", path: "/projects", roles: ["USER", "ADMIN", "SUPER_ADMIN"] },
  { id: "work", label: "Work", path: "/work", permission: "work.read.scope", roles: ["ADMIN", "SUPER_ADMIN"] },
  { id: "claims", label: "Claims", path: "/claims", roles: ["USER", "ADMIN", "SUPER_ADMIN"] },
  { id: "requests", label: "Requests", path: "/requests", roles: ["USER", "ADMIN", "SUPER_ADMIN"] },
  { id: "reports", label: "Reports", path: "/reports", permission: "dashboard.read.scope", roles: ["ADMIN", "SUPER_ADMIN"] },
  { id: "users-access", label: "Users & Access", path: "/admin", permission: "users.manage", roles: ["SUPER_ADMIN"] },
  { id: "configuration", label: "Configuration", path: "/settings", permission: "settings.manage", roles: ["SUPER_ADMIN"] },
  { id: "audit", label: "Audit", path: "/admin/audit", permission: "audit.read", roles: ["SUPER_ADMIN"] },
  { id: "profile", label: "Profile", path: "/profile", roles: ["USER"] },
];

export function getNavigation(principal: Principal): ReadonlyArray<NavigationItem> {
  return navigation.filter(
    (item) =>
      item.roles.includes(principal.role) &&
      (item.permission === undefined || principal.permissions.includes(item.permission)),
  );
}

export function hasPermission(principal: Principal, permission: Permission): boolean {
  return principal.permissions.includes(permission);
}

export function getNavigationPath(id: string, principal: Principal): string | null {
  return getNavigation(principal).find((item) => item.id === id)?.path ?? null;
}

export type RouteResolution =
  | { kind: "allowed"; pageId: string }
  | { kind: "forbidden" }
  | { kind: "not-found" }
  | { kind: "redirect"; path: string };

function normalizePath(pathname: string): string {
  if (pathname === "/") return pathname;
  return pathname.replace(/\/+$/, "") || "/";
}

export function resolveRoute(pathname: string, principal: Principal): RouteResolution {
  const path = normalizePath(pathname);
  if (path === "/" || path === "/login") return { kind: "redirect", path: "/dashboard" };

  const matching = navigation.filter((item) => item.path === path);
  if (matching.length === 0) return { kind: "not-found" };

  const accessibleIds = new Set(getNavigation(principal).map((item) => item.id));
  const route = matching.find((item) => accessibleIds.has(item.id));
  return route ? { kind: "allowed", pageId: route.id } : { kind: "forbidden" };
}

