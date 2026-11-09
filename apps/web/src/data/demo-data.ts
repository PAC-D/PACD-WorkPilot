import type {
  ActivityStatus,
  ClaimStatus,
  Principal,
  ProjectStatus,
  RequestStatus,
  Role,
} from "@pacd/contracts";

export const demoPrincipals: Record<Role, Principal> = {
  USER: {
    department: "Field Operations",
    displayName: "Nadia Rahman",
    employeeCode: "EMP-008",
    id: "demo-user",
    permissions: [
      "work.create.own",
      "work.read.own",
      "work.edit.own",
      "projects.read.assigned",
      "projects.request_join",
      "claims.create.own",
      "claims.read.own",
      "claims.edit.own",
      "requests.create.own",
      "requests.read.own",
    ],
    policyVersion: 3,
    role: "USER",
  },
  ADMIN: {
    department: "Field Operations",
    displayName: "Farhan Kabir",
    employeeCode: "EMP-014",
    id: "demo-admin",
    permissions: [
      "dashboard.read.scope",
      "users.read.scope",
      "work.read.scope",
      "claims.read.scope",
      "claims.review.scope",
      "requests.read.scope",
      "requests.review.scope",
    ],
    policyVersion: 7,
    role: "ADMIN",
  },
  SUPER_ADMIN: {
    department: "Administration",
    displayName: "Samira Ahmed",
    employeeCode: "EMP-001",
    id: "demo-super-admin",
    permissions: [
      "dashboard.read.scope",
      "users.read.scope",
      "users.manage",
      "roles.manage",
      "work.read.scope",
      "projects.manage",
      "projects.assign",
      "claims.read.scope",
      "claims.edit.scope",
      "claims.review.scope",
      "claims.approve.scope",
      "claims.mark_paid.scope",
      "requests.read.scope",
      "requests.review.scope",
      "settings.manage",
      "audit.read",
      "reports.export.scope",
    ],
    policyVersion: 12,
    role: "SUPER_ADMIN",
  },
};

export interface StatItem {
  label: string;
  value: string;
  detail: string;
  tone: "neutral" | "warning" | "danger" | "success";
}

export const adminStats: ReadonlyArray<StatItem> = [
  { detail: "5 submitted, 3 under review", label: "Pending Claims", tone: "warning", value: "8" },
  { detail: "2 assigned to your scope", label: "Pending Requests", tone: "neutral", value: "6" },
  { detail: "Across 2 departments", label: "Active Projects", tone: "success", value: "7" },
  { detail: "Requires team follow-up", label: "Blocked Work", tone: "danger", value: "3" },
];

export const superAdminStats: ReadonlyArray<StatItem> = [
  { detail: "Organization wide", label: "Pending Claims", tone: "warning", value: "11" },
  { detail: "Across all review scopes", label: "Pending Requests", tone: "neutral", value: "9" },
  { detail: "2 nearing planned end", label: "Active Projects", tone: "success", value: "12" },
  { detail: "Across 3 projects", label: "Blocked Work", tone: "danger", value: "4" },
];

export const workTrend = [
  { completed: 8, day: "Nov 3", updates: 12 },
  { completed: 10, day: "Nov 4", updates: 16 },
  { completed: 7, day: "Nov 5", updates: 14 },
  { completed: 13, day: "Nov 6", updates: 19 },
  { completed: 11, day: "Nov 7", updates: 17 },
  { completed: 5, day: "Nov 8", updates: 8 },
  { completed: 9, day: "Nov 9", updates: 15 },
] as const;

export const workTrend30 = [
  { completed: 36, day: "Oct 11", updates: 49 },
  { completed: 42, day: "Oct 14", updates: 57 },
  { completed: 39, day: "Oct 17", updates: 54 },
  { completed: 46, day: "Oct 20", updates: 63 },
  { completed: 41, day: "Oct 23", updates: 58 },
  { completed: 48, day: "Oct 26", updates: 66 },
  { completed: 44, day: "Oct 29", updates: 61 },
  { completed: 52, day: "Nov 1", updates: 70 },
  { completed: 47, day: "Nov 4", updates: 64 },
  { completed: 51, day: "Nov 7", updates: 68 },
] as const;

export const projectMix = [
  { count: 7, fill: "#1B4877", name: "Active" },
  { count: 3, fill: "#4071A4", name: "Planned" },
  { count: 2, fill: "#94A3B8", name: "On hold" },
  { count: 4, fill: "#207653", name: "Completed" },
] as const;

export interface ProjectTimelineRow {
  actualEndDate: string | null;
  assignedAt: string;
  memberCount: number;
  owner: string;
  plannedEndDate: string | null;
  project: string;
  startDate: string;
  status: ProjectStatus;
}

export const projectTimeline: ReadonlyArray<ProjectTimelineRow> = [
  {
    actualEndDate: null,
    assignedAt: "Oct 18, 2026",
    memberCount: 6,
    owner: "T. Hasan",
    plannedEndDate: "Dec 15, 2026",
    project: "Community Learning Hubs",
    startDate: "Oct 20, 2026",
    status: "ACTIVE",
  },
  {
    actualEndDate: null,
    assignedAt: "Oct 27, 2026",
    memberCount: 4,
    owner: "M. Islam",
    plannedEndDate: "Jan 31, 2027",
    project: "Digital Records Rollout",
    startDate: "Nov 1, 2026",
    status: "ACTIVE",
  },
  {
    actualEndDate: null,
    assignedAt: "Nov 2, 2026",
    memberCount: 3,
    owner: "S. Ahmed",
    plannedEndDate: null,
    project: "Policy Archive Review",
    startDate: "Nov 12, 2026",
    status: "PLANNED",
  },
] as const;

export interface ActivityRow {
  date: string;
  owner: string;
  project: string;
  status: ActivityStatus;
  title: string;
}

export const scopedActivities: ReadonlyArray<ActivityRow> = [
  { date: "Nov 9, 2026", owner: "Nadia Rahman", project: "Community Learning Hubs", status: "COMPLETED", title: "Submitted site readiness notes" },
  { date: "Nov 9, 2026", owner: "Rafi Chowdhury", project: "Digital Records Rollout", status: "IN_PROGRESS", title: "Mapped archive categories" },
  { date: "Nov 8, 2026", owner: "Jannat Sultana", project: "Community Learning Hubs", status: "BLOCKED", title: "Confirm venue network access" },
] as const;

export interface ReviewRow {
  beneficiary: string;
  id: string;
  kind: "Claim" | "Request";
  status: ClaimStatus | RequestStatus;
  submitted: string;
  title: string;
}

export const reviewQueue: ReadonlyArray<ReviewRow> = [
  { beneficiary: "Rafi Chowdhury", id: "clm_demo_1", kind: "Claim", status: "SUBMITTED", submitted: "Nov 9, 2026", title: "October mobile bill" },
  { beneficiary: "Nadia Rahman", id: "req_demo_2", kind: "Request", status: "IN_REVIEW", submitted: "Nov 8, 2026", title: "Design software access" },
  { beneficiary: "Jannat Sultana", id: "clm_demo_3", kind: "Claim", status: "NEEDS_INFO", submitted: "Nov 7, 2026", title: "Field travel allowance" },
] as const;

export const userActivities: ReadonlyArray<ActivityRow> = [
  { date: "Nov 9, 2026", owner: "You", project: "Community Learning Hubs", status: "COMPLETED", title: "Submitted site readiness notes" },
  { date: "Nov 8, 2026", owner: "You", project: "Community Learning Hubs", status: "IN_PROGRESS", title: "Review partner feedback" },
  { date: "Nov 7, 2026", owner: "You", project: "Digital Records Rollout", status: "PLANNED", title: "Prepare records checklist" },
] as const;

export const userProjects = [
  { due: "Dec 15, 2026", name: "Community Learning Hubs", progress: 68, status: "ACTIVE" as const },
  { due: "Jan 31, 2027", name: "Digital Records Rollout", progress: 34, status: "ACTIVE" as const },
] as const;

export const userActions = [
  { detail: "Add the missing transport receipt", label: "Complete travel claim", status: "NEEDS_INFO" as const },
  { detail: "Due November 12", label: "Update records checklist", status: "PLANNED" as const },
  { detail: "Reviewer requested the device version", label: "Reply to software request", status: "NEEDS_INFO" as const },
] as const;

