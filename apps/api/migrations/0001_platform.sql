CREATE TABLE departments (
  department_id text PRIMARY KEY,
  name text NOT NULL UNIQUE,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  version integer NOT NULL DEFAULT 1 CHECK (version > 0)
);

CREATE TABLE accounts (
  account_sub text PRIMARY KEY,
  employee_code text NOT NULL UNIQUE,
  username text NOT NULL UNIQUE,
  display_name text NOT NULL,
  email text,
  phone text,
  department_id text REFERENCES departments(department_id),
  role text NOT NULL CHECK (role IN ('USER', 'ADMIN', 'SUPER_ADMIN')),
  status text NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'DISABLED')),
  permission_version integer NOT NULL DEFAULT 1 CHECK (permission_version > 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  version integer NOT NULL DEFAULT 1 CHECK (version > 0)
);

CREATE INDEX accounts_department_idx ON accounts (department_id, account_sub);

CREATE TABLE account_grants (
  grant_id text PRIMARY KEY,
  account_sub text NOT NULL REFERENCES accounts(account_sub),
  permission text NOT NULL CHECK (permission IN (
    'work.create.own', 'work.read.own', 'work.edit.own', 'work.read.scope',
    'projects.read.assigned', 'projects.request_join', 'projects.manage', 'projects.assign',
    'claims.create.own', 'claims.read.own', 'claims.edit.own', 'claims.read.scope',
    'claims.edit.scope', 'claims.review.scope', 'claims.approve.scope', 'claims.mark_paid.scope',
    'requests.create.own', 'requests.read.own', 'requests.read.scope', 'requests.review.scope',
    'users.read.scope', 'users.manage', 'roles.manage', 'settings.manage', 'audit.read',
    'dashboard.read.scope', 'reports.export.scope'
  )),
  scope text NOT NULL CHECK (scope IN ('OWN', 'PROJECT_MEMBER', 'DEPARTMENT', 'ASSIGNED_REVIEWER', 'ALL')),
  scope_ids text[] NOT NULL DEFAULT '{}',
  enabled boolean NOT NULL DEFAULT true,
  created_by text NOT NULL REFERENCES accounts(account_sub),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (account_sub, permission, scope)
);

CREATE TABLE idempotency_records (
  actor_sub text NOT NULL,
  route text NOT NULL,
  idempotency_key text NOT NULL,
  request_hash text NOT NULL,
  response_status integer,
  response_body jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  PRIMARY KEY (actor_sub, route, idempotency_key)
);

CREATE INDEX idempotency_expiry_idx ON idempotency_records (expires_at);

CREATE TABLE audit_records (
  audit_id text PRIMARY KEY,
  actor_sub text NOT NULL,
  action text NOT NULL,
  resource_type text NOT NULL,
  resource_id text NOT NULL,
  old_state jsonb,
  new_state jsonb,
  reason text,
  request_id text NOT NULL,
  permission_policy_version integer NOT NULL CHECK (permission_policy_version > 0),
  occurred_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX audit_resource_idx ON audit_records (resource_type, resource_id, occurred_at DESC, audit_id DESC);
CREATE INDEX audit_actor_idx ON audit_records (actor_sub, occurred_at DESC, audit_id DESC);

CREATE FUNCTION reject_audit_mutation() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'audit records are append-only';
END;
$$;

CREATE TRIGGER audit_records_no_update
BEFORE UPDATE OR DELETE ON audit_records
FOR EACH ROW EXECUTE FUNCTION reject_audit_mutation();

CREATE TABLE outbox_events (
  event_id text PRIMARY KEY,
  event_type text NOT NULL CHECK (event_type IN (
    'CLAIM_CHANGED', 'REQUEST_CHANGED', 'ACTIVITY_CHANGED',
    'PROJECT_CHANGED', 'USER_GRANTS_CHANGED', 'CONFIG_CHANGED'
  )),
  entity_id text NOT NULL,
  scope text NOT NULL,
  entity_version integer NOT NULL CHECK (entity_version > 0),
  occurred_at timestamptz NOT NULL DEFAULT now(),
  published_at timestamptz,
  attempt_count integer NOT NULL DEFAULT 0 CHECK (attempt_count >= 0),
  last_error text
);

CREATE INDEX outbox_pending_idx ON outbox_events (occurred_at, event_id) WHERE published_at IS NULL;
