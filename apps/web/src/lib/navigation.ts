import type { Permission, Principal, Role } from "@pacd/contracts";

export interface NavigationItem {
  id: string;
  label: string;
  permission?: Permission;
  roles: ReadonlyArray<Role>;
}

const navigation: ReadonlyArray<NavigationItem> = [
  { id: "overview", label: "Overview", roles: ["USER", "ADMIN", "SUPER_ADMIN"] },
  { id: "my-work", label: "My Work", roles: ["USER"] },
  { id: "people", label: "People", permission: "users.read.scope", roles: ["ADMIN", "SUPER_ADMIN"] },
  { id: "projects", label: "Projects", roles: ["USER", "ADMIN", "SUPER_ADMIN"] },
  { id: "work", label: "Work", permission: "work.read.scope", roles: ["ADMIN", "SUPER_ADMIN"] },
  { id: "claims", label: "Claims", roles: ["USER", "ADMIN", "SUPER_ADMIN"] },
  { id: "requests", label: "Requests", roles: ["USER", "ADMIN", "SUPER_ADMIN"] },
  { id: "reports", label: "Reports", permission: "dashboard.read.scope", roles: ["ADMIN", "SUPER_ADMIN"] },
  { id: "users-access", label: "Users & Access", permission: "users.manage", roles: ["SUPER_ADMIN"] },
  { id: "configuration", label: "Configuration", permission: "settings.manage", roles: ["SUPER_ADMIN"] },
  { id: "audit", label: "Audit", permission: "audit.read", roles: ["SUPER_ADMIN"] },
  { id: "profile", label: "Profile", roles: ["USER"] },
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

