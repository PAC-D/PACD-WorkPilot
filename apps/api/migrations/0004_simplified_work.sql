CREATE TABLE work_tags (
  tag_id text PRIMARY KEY,
  name text NOT NULL UNIQUE,
  created_by text NOT NULL REFERENCES accounts(account_sub),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX work_tags_name_idx ON work_tags (name, tag_id);
CREATE INDEX projects_name_prefix_idx ON projects (lower(name) text_pattern_ops, project_id);

INSERT INTO work_tags (tag_id, name, created_by)
SELECT DISTINCT a.category_id, a.category_id, p.account_sub
FROM activities a CROSS JOIN LATERAL (
  SELECT account_sub FROM accounts WHERE role='SUPER_ADMIN' ORDER BY created_at LIMIT 1
) p
ON CONFLICT (tag_id) DO NOTHING;

ALTER TABLE activities ADD COLUMN start_date date;
ALTER TABLE activities ADD COLUMN planned_end_date date;
ALTER TABLE activities ADD COLUMN actual_end_date date;
UPDATE activities SET start_date=activity_date;
ALTER TABLE activities ALTER COLUMN start_date SET NOT NULL;
ALTER TABLE activities ADD CONSTRAINT activities_tag_fk FOREIGN KEY (category_id) REFERENCES work_tags(tag_id);
ALTER TABLE activities ADD CONSTRAINT activities_date_order CHECK (
  (planned_end_date IS NULL OR planned_end_date >= start_date) AND
  (actual_end_date IS NULL OR actual_end_date >= start_date)
);

CREATE TABLE admin_visibility (
  viewer_sub text NOT NULL REFERENCES accounts(account_sub),
  target_sub text NOT NULL REFERENCES accounts(account_sub),
  granted_by text NOT NULL REFERENCES accounts(account_sub),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (viewer_sub, target_sub),
  CHECK (viewer_sub <> target_sub)
);
CREATE INDEX admin_visibility_target_idx ON admin_visibility (target_sub, viewer_sub);

INSERT INTO account_grants (grant_id,account_sub,permission,scope,scope_ids,created_by)
SELECT 'grant-' || md5(a.account_sub || p.permission),a.account_sub,p.permission,'OWN','{}',a.account_sub
FROM accounts a CROSS JOIN (VALUES
  ('work.create.own'),('work.read.own'),('work.edit.own'),
  ('projects.read.assigned'),('claims.create.own'),('claims.read.own'),
  ('claims.edit.own'),('requests.create.own'),('requests.read.own')
) p(permission)
WHERE a.role='ADMIN'
ON CONFLICT (account_sub,permission,scope) DO NOTHING;

CREATE TABLE request_files (
  request_id text NOT NULL REFERENCES requests(request_id),
  file_id text NOT NULL REFERENCES files(file_id),
  PRIMARY KEY (request_id,file_id)
);

CREATE FUNCTION can_view_account(p_viewer_sub text, p_target_sub text) RETURNS boolean
LANGUAGE sql STABLE AS $$
  SELECT EXISTS (
    SELECT 1 FROM accounts viewer JOIN accounts target ON target.account_sub=p_target_sub
    WHERE viewer.account_sub=p_viewer_sub AND (
      viewer.role='SUPER_ADMIN' OR target.account_sub=viewer.account_sub OR
      (viewer.role='ADMIN' AND target.role='USER') OR
      (viewer.role='ADMIN' AND target.role='ADMIN' AND EXISTS (
        SELECT 1 FROM admin_visibility av WHERE av.viewer_sub=viewer.account_sub AND av.target_sub=target.account_sub
      ))
    )
  );
$$;

CREATE FUNCTION can_access_account(p_viewer_sub text,p_target_sub text,p_permission text) RETURNS boolean
LANGUAGE sql STABLE AS $$
  SELECT can_view_account(p_viewer_sub,p_target_sub) AND EXISTS (
    SELECT 1 FROM account_grants g JOIN accounts target ON target.account_sub=p_target_sub
    WHERE g.account_sub=p_viewer_sub AND g.permission=p_permission AND g.enabled=true AND (
      (g.scope='ALL' AND 'ALL'=ANY(g.scope_ids)) OR
      (g.scope='DEPARTMENT' AND target.department_id=ANY(g.scope_ids)) OR
      (g.scope='OWN' AND p_viewer_sub=p_target_sub)
    )
  );
$$;

CREATE FUNCTION notify_workpilot_event() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  PERFORM pg_notify('workpilot_events',json_build_object(
    'type',NEW.event_type,'entityId',NEW.entity_id,'scope',NEW.scope,
    'version',NEW.entity_version,'occurredAt',NEW.occurred_at
  )::text);
  RETURN NEW;
END;
$$;
CREATE TRIGGER outbox_event_hint AFTER INSERT ON outbox_events
FOR EACH ROW EXECUTE FUNCTION notify_workpilot_event();
