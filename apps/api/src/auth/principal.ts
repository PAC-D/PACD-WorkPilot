import type { Permission, Principal, Role } from "@pacd/contracts";
import type { Pool } from "pg";

interface PrincipalRow {
  account_sub: string;
  department: string;
  display_name: string;
  employee_code: string;
  permission: Permission | null;
  permission_version: number;
  role: Role;
}

export async function loadActivePrincipal(pool: Pool, accountSub: string): Promise<Principal | null> {
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
