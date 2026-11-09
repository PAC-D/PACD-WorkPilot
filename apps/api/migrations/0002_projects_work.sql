CREATE TABLE projects (
  project_id text PRIMARY KEY,
  code text NOT NULL UNIQUE,
  name text NOT NULL,
  owner_sub text NOT NULL REFERENCES accounts(account_sub),
  description text NOT NULL DEFAULT '',
  start_date date NOT NULL,
  planned_end_date date,
  actual_end_date date,
  status text NOT NULL CHECK (status IN ('PLANNED', 'ACTIVE', 'ON_HOLD', 'COMPLETED', 'ARCHIVED')),
  created_by text NOT NULL REFERENCES accounts(account_sub),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  version integer NOT NULL DEFAULT 1 CHECK (version > 0),
  CHECK (planned_end_date IS NULL OR planned_end_date >= start_date),
  CHECK (actual_end_date IS NULL OR actual_end_date >= start_date)
);

CREATE INDEX projects_status_start_idx ON projects (status, start_date DESC, project_id DESC);
CREATE INDEX projects_owner_idx ON projects (owner_sub, project_id);

CREATE TABLE project_memberships (
  membership_id text PRIMARY KEY,
  project_id text NOT NULL REFERENCES projects(project_id),
  account_sub text NOT NULL REFERENCES accounts(account_sub),
  assigned_at timestamptz NOT NULL,
  assigned_by text NOT NULL REFERENCES accounts(account_sub),
  due_date date,
  removed_at timestamptz,
  removed_by text REFERENCES accounts(account_sub),
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (removed_at IS NULL OR removed_at >= assigned_at)
);

CREATE UNIQUE INDEX project_memberships_active_unique
ON project_memberships (project_id, account_sub) WHERE removed_at IS NULL;
CREATE INDEX project_memberships_user_idx ON project_memberships (account_sub, assigned_at DESC, membership_id DESC);
CREATE INDEX project_memberships_project_idx ON project_memberships (project_id, assigned_at DESC, membership_id DESC);

CREATE TABLE activities (
  activity_id text PRIMARY KEY,
  project_id text NOT NULL REFERENCES projects(project_id),
  user_sub text NOT NULL REFERENCES accounts(account_sub),
  title text NOT NULL,
  category_id text NOT NULL,
  activity_date date NOT NULL,
  status text NOT NULL CHECK (status IN ('PLANNED', 'IN_PROGRESS', 'BLOCKED', 'COMPLETED')),
  time_spent_minutes integer CHECK (time_spent_minutes IS NULL OR time_spent_minutes >= 0),
  created_by text NOT NULL REFERENCES accounts(account_sub),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  version integer NOT NULL DEFAULT 1 CHECK (version > 0)
);

CREATE INDEX activities_user_date_idx ON activities (user_sub, activity_date DESC, activity_id DESC);
CREATE INDEX activities_project_date_idx ON activities (project_id, activity_date DESC, activity_id DESC);
CREATE INDEX activities_status_date_idx ON activities (status, activity_date DESC, activity_id DESC);

CREATE TABLE activity_updates (
  update_id text PRIMARY KEY,
  activity_id text NOT NULL REFERENCES activities(activity_id),
  author_sub text NOT NULL REFERENCES accounts(account_sub),
  notes text NOT NULL,
  from_status text CHECK (from_status IS NULL OR from_status IN ('PLANNED', 'IN_PROGRESS', 'BLOCKED', 'COMPLETED')),
  to_status text NOT NULL CHECK (to_status IN ('PLANNED', 'IN_PROGRESS', 'BLOCKED', 'COMPLETED')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX activity_updates_history_idx ON activity_updates (activity_id, created_at DESC, update_id DESC);
