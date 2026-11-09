import type { Permission, Principal, Role } from "@pacd/contracts";
import type { Pool } from "pg";

const localIdentityHeader = "x-workpilot-local-user";

interface PrincipalRow {
  account_sub: string;
  department: string;
  display_name: string;
  employee_code: string;
  permission: Permission | null;
  permission_version: number;
  role: Role;
}

export interface LocalIdentitySummary {
  displayName: string;
  employeeCode: string;
  id: string;
  role: Role;
  username: string;
}

export function requestedLocalIdentity(request: Request): string | null {
  const identity = request.headers.get(localIdentityHeader)?.trim();
  return identity || null;
}

export async function authenticateLocalRequest(pool: Pool, request: Request): Promise<Principal | null> {
  const accountSub = requestedLocalIdentity(request);
  if (!accountSub) return null;

  const result = await pool.query<PrincipalRow>(
    `SELECT a.account_sub, a.display_name, a.employee_code, a.role,
            a.permission_version, d.name AS department, g.permission
       FROM accounts a
       JOIN departments d ON d.department_id = a.department_id
       LEFT JOIN account_grants g ON g.account_sub = a.account_sub AND g.enabled = true
      WHERE a.account_sub = $1 AND a.status = 'ACTIVE'
      ORDER BY g.permission`,
    [accountSub],
  );
  const first = result.rows[0];
  if (!first) return null;

  return {
    department: first.department,
    displayName: first.display_name,
    employeeCode: first.employee_code,
    id: first.account_sub,
    permissions: result.rows.flatMap((row) => (row.permission ? [row.permission] : [])),
    policyVersion: first.permission_version,
    role: first.role,
  };
}

export async function listLocalIdentities(pool: Pool): Promise<ReadonlyArray<LocalIdentitySummary>> {
  const result = await pool.query<{
    account_sub: string;
    display_name: string;
    employee_code: string;
    role: Role;
    username: string;
  }>(
    `SELECT account_sub, display_name, employee_code, role, username
       FROM accounts
      WHERE status = 'ACTIVE' AND account_sub LIKE 'local-%'
      ORDER BY employee_code, account_sub`,
  );
  return result.rows.map((row) => ({
    displayName: row.display_name,
    employeeCode: row.employee_code,
    id: row.account_sub,
    role: row.role,
    username: row.username,
  }));
}
