import type { Principal, Role } from "@pacd/contracts";
import type { Pool } from "pg";

import { loadActivePrincipal } from "./principal.ts";

const localIdentityHeader = "x-workpilot-local-user";

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

  return loadActivePrincipal(pool, accountSub);
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
