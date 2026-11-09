CREATE TABLE files (
  file_id text PRIMARY KEY,
  owner_sub text NOT NULL REFERENCES accounts(account_sub),
  file_name text NOT NULL,
  mime_type text NOT NULL CHECK (mime_type IN (
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'image/jpeg',
    'image/png'
  )),
  size_bytes integer NOT NULL CHECK (size_bytes > 0 AND size_bytes <= 5000000),
  storage_key text NOT NULL UNIQUE,
  finalized_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX files_owner_idx ON files (owner_sub, created_at DESC, file_id DESC);

CREATE TABLE claims (
  claim_id text PRIMARY KEY,
  user_sub text NOT NULL REFERENCES accounts(account_sub),
  department_id text NOT NULL REFERENCES departments(department_id),
  claim_type text NOT NULL,
  period_month text NOT NULL CHECK (period_month ~ '^\d{4}-(0[1-9]|1[0-2])$'),
  amount_minor bigint NOT NULL CHECK (amount_minor >= 0),
  currency text NOT NULL DEFAULT 'BDT' CHECK (currency = 'BDT'),
  memo text NOT NULL DEFAULT '',
  status text NOT NULL CHECK (status IN (
    'DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'NEEDS_INFO', 'APPROVED', 'REJECTED', 'PAID'
  )),
  submitted_at timestamptz,
  created_by text NOT NULL REFERENCES accounts(account_sub),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  version integer NOT NULL DEFAULT 1 CHECK (version > 0)
);

CREATE INDEX claims_user_period_idx ON claims (user_sub, period_month DESC, claim_id DESC);
CREATE INDEX claims_department_status_idx ON claims (department_id, status, submitted_at DESC NULLS LAST, claim_id DESC);
CREATE INDEX claims_period_type_idx ON claims (period_month, claim_type, submitted_at DESC NULLS LAST, claim_id DESC);

CREATE TABLE claim_files (
  claim_id text NOT NULL REFERENCES claims(claim_id),
  file_id text NOT NULL REFERENCES files(file_id),
  PRIMARY KEY (claim_id, file_id)
);

CREATE TABLE claim_reviews (
  review_id text PRIMARY KEY,
  claim_id text NOT NULL REFERENCES claims(claim_id),
  actor_sub text NOT NULL REFERENCES accounts(account_sub),
  from_status text NOT NULL CHECK (from_status IN (
    'DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'NEEDS_INFO', 'APPROVED', 'REJECTED', 'PAID'
  )),
  to_status text NOT NULL CHECK (to_status IN (
    'DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'NEEDS_INFO', 'APPROVED', 'REJECTED', 'PAID'
  )),
  reason text,
  policy_version integer NOT NULL CHECK (policy_version > 0),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX claim_reviews_history_idx ON claim_reviews (claim_id, created_at DESC, review_id DESC);

CREATE TABLE requests (
  request_id text PRIMARY KEY,
  requester_sub text NOT NULL REFERENCES accounts(account_sub),
  department_id text NOT NULL REFERENCES departments(department_id),
  request_type text NOT NULL CHECK (request_type IN (
    'SOFTWARE_INSTALL', 'LEAVE', 'API_ACCESS', 'PURCHASE', 'IT_SUPPORT', 'GENERAL'
  )),
  title text NOT NULL,
  reason text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}',
  status text NOT NULL CHECK (status IN (
    'DRAFT', 'SUBMITTED', 'IN_REVIEW', 'NEEDS_INFO', 'APPROVED',
    'REJECTED', 'FULFILLED', 'CLOSED', 'CANCELLED'
  )),
  assigned_reviewer_sub text REFERENCES accounts(account_sub),
  approval_steps jsonb NOT NULL DEFAULT '[]',
  submitted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  version integer NOT NULL DEFAULT 1 CHECK (version > 0)
);

CREATE INDEX requests_user_date_idx ON requests (requester_sub, created_at DESC, request_id DESC);
CREATE INDEX requests_department_status_idx ON requests (department_id, status, created_at DESC, request_id DESC);
CREATE INDEX requests_type_date_idx ON requests (request_type, created_at DESC, request_id DESC);
CREATE INDEX requests_reviewer_status_idx ON requests (assigned_reviewer_sub, status, created_at DESC, request_id DESC);

CREATE TABLE request_reviews (
  review_id text PRIMARY KEY,
  request_id text NOT NULL REFERENCES requests(request_id),
  actor_sub text NOT NULL REFERENCES accounts(account_sub),
  from_status text NOT NULL CHECK (from_status IN (
    'DRAFT', 'SUBMITTED', 'IN_REVIEW', 'NEEDS_INFO', 'APPROVED',
    'REJECTED', 'FULFILLED', 'CLOSED', 'CANCELLED'
  )),
  to_status text NOT NULL CHECK (to_status IN (
    'DRAFT', 'SUBMITTED', 'IN_REVIEW', 'NEEDS_INFO', 'APPROVED',
    'REJECTED', 'FULFILLED', 'CLOSED', 'CANCELLED'
  )),
  reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX request_reviews_history_idx ON request_reviews (request_id, created_at DESC, review_id DESC);
