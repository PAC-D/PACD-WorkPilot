import type { ActivityStatus, ClaimStatus, ProjectStatus, RequestStatus } from "@pacd/contracts";
import { Button, Card, CardHeader, DataTable, Pagination, StatusBadge } from "@pacd/ui";
import { ArrowUpRight, CalendarDays, CheckCircle2, Clock3, FileText, FolderKanban } from "lucide-react";

import type { ActivityRow, ProjectTimelineRow, ReviewRow, StatItem } from "../data/demo-data";
import { projectTimeline, reviewQueue, scopedActivities, userActions, userActivities, userProjects } from "../data/demo-data";

function statusTone(status: ActivityStatus | ClaimStatus | ProjectStatus | RequestStatus) {
  if (["APPROVED", "COMPLETED", "FULFILLED", "PAID"].includes(status)) return "success" as const;
  if (["BLOCKED", "NEEDS_INFO", "ON_HOLD"].includes(status)) return "warning" as const;
  if (["REJECTED", "CANCELLED"].includes(status)) return "danger" as const;
  if (["ACTIVE", "IN_PROGRESS", "IN_REVIEW", "UNDER_REVIEW", "SUBMITTED"].includes(status)) return "info" as const;
  return "neutral" as const;
}

export function DashboardHeader({
  description,
  name,
  onRefresh,
  title,
}: {
  description: string;
  name: string;
  onRefresh: () => void;
  title: string;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div>
        <p className="text-sm font-medium text-[var(--muted)]">{name}</p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-[var(--navy-950)]">{title}</h1>
        <p className="mt-1 max-w-2xl text-sm text-[var(--muted)]">{description}</p>
      </div>
      <Button onClick={onRefresh} variant="secondary">
        Refresh data
      </Button>
    </div>
  );
}

export function StatGrid({ stats }: { stats: ReadonlyArray<StatItem> }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {stats.map((stat) => (
        <Card className="relative overflow-hidden p-4" key={stat.label}>
          <div className={`absolute inset-y-0 left-0 w-1 ${stat.tone === "danger" ? "bg-[var(--danger)]" : stat.tone === "warning" ? "bg-[var(--warning)]" : stat.tone === "success" ? "bg-[var(--success)]" : "bg-[var(--navy-500)]"}`} />
          <p className="text-sm font-medium text-[var(--muted)]">{stat.label}</p>
          <p className="mt-2 text-3xl font-bold tracking-tight text-[var(--navy-950)]">{stat.value}</p>
          <p className="mt-1 text-xs text-[var(--muted)]">{stat.detail}</p>
        </Card>
      ))}
    </div>
  );
}

const timelineColumns = [
  { header: "Project", key: "project", render: (row: ProjectTimelineRow) => <span className="font-semibold text-[var(--navy-900)]">{row.project}</span> },
  { header: "Assigned", key: "assignedAt", render: (row: ProjectTimelineRow) => row.assignedAt },
  { header: "Start", key: "startDate", render: (row: ProjectTimelineRow) => row.startDate },
  { header: "Planned end", key: "plannedEndDate", render: (row: ProjectTimelineRow) => row.plannedEndDate ?? "Not set" },
  { header: "Actual end", key: "actualEndDate", render: (row: ProjectTimelineRow) => row.actualEndDate ?? "Not set" },
  { header: "Owner", key: "owner", render: (row: ProjectTimelineRow) => row.owner },
  { header: "Members", key: "memberCount", render: (row: ProjectTimelineRow) => row.memberCount },
  { header: "Status", key: "status", render: (row: ProjectTimelineRow) => <StatusBadge label={row.status} tone={statusTone(row.status)} /> },
] as const;

export function ProjectTimeline({ project = "all" }: { project?: string }) {
  const rows = project === "all" ? projectTimeline : projectTimeline.filter((item) => item.project === project);
  return (
    <Card>
      <CardHeader description="Assignment and milestone dates are shown separately" title="Project timeline" />
      <DataTable caption="Authorized project timeline" columns={timelineColumns} getRowKey={(row) => row.project} rows={rows} />
      <Pagination canNext={false} canPrevious={false} onNext={() => undefined} onPrevious={() => undefined} />
    </Card>
  );
}

const activityColumns = [
  { header: "Update", key: "title", render: (row: ActivityRow) => <div><p className="font-semibold text-[var(--navy-900)]">{row.title}</p><p className="mt-0.5 text-xs text-[var(--muted)]">{row.project}</p></div> },
  { header: "Employee", key: "owner", render: (row: ActivityRow) => row.owner },
  { header: "Date", key: "date", render: (row: ActivityRow) => row.date },
  { header: "Status", key: "status", render: (row: ActivityRow) => <StatusBadge label={row.status} tone={statusTone(row.status)} /> },
] as const;

export function RecentActivity({ personal = false }: { personal?: boolean }) {
  const rows = personal ? userActivities : scopedActivities;
  return (
    <Card>
      <CardHeader description={personal ? "Your latest work activity" : "Latest activity in your authorized scope"} title="Recent activity" />
      <DataTable caption="Recent work activity" columns={activityColumns} getRowKey={(row) => `${row.date}-${row.title}`} rows={rows} />
    </Card>
  );
}

const reviewColumns = [
  { header: "Item", key: "title", render: (row: ReviewRow) => <div><p className="font-semibold text-[var(--navy-900)]">{row.title}</p><p className="mt-0.5 text-xs text-[var(--muted)]">{row.kind}</p></div> },
  { header: "Employee", key: "beneficiary", render: (row: ReviewRow) => row.beneficiary },
  { header: "Submitted", key: "submitted", render: (row: ReviewRow) => row.submitted },
  { header: "Status", key: "status", render: (row: ReviewRow) => <StatusBadge label={row.status} tone={statusTone(row.status)} /> },
] as const;

export function ReviewQueue({ canApprove }: { canApprove: boolean }) {
  return (
    <Card>
      <CardHeader
        description={canApprove ? "Items in your scope. Self-approval remains blocked." : "Read and review access only. Approval is not granted."}
        title="Approvals queue"
      />
      <DataTable caption="Claims and requests awaiting review" columns={reviewColumns} getRowKey={(row) => row.id} rows={reviewQueue} />
    </Card>
  );
}

export function UserSummary() {
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <SummaryCard detail="2 active assignments" icon={<FolderKanban aria-hidden="true" size={20} />} label="My Projects" value="2" />
      <SummaryCard detail="October claim needs information" icon={<FileText aria-hidden="true" size={20} />} label="Current Claim" value="Needs info" />
      <SummaryCard detail="1 awaiting review" icon={<Clock3 aria-hidden="true" size={20} />} label="Open Requests" value="3" />
      <SummaryCard detail="This month" icon={<CheckCircle2 aria-hidden="true" size={20} />} label="Completed Work" value="14" />
    </div>
  );
}

function SummaryCard({ detail, icon, label, value }: { detail: string; icon: React.ReactNode; label: string; value: string }) {
  return (
    <Card className="p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-medium text-[var(--muted)]">{label}</p>
        <span className="text-[var(--navy-500)]">{icon}</span>
      </div>
      <p className="mt-3 text-2xl font-bold text-[var(--navy-950)]">{value}</p>
      <p className="mt-1 text-xs text-[var(--muted)]">{detail}</p>
    </Card>
  );
}

export function UserProjects({ onView }: { onView: () => void }) {
  return (
    <Card>
      <CardHeader action={<Button onClick={onView} variant="ghost">View projects <ArrowUpRight aria-hidden="true" size={16} /></Button>} description="Projects currently assigned to you" title="Active projects" />
      <div className="divide-y divide-[var(--border)]">
        {userProjects.map((project) => (
          <div className="p-5" key={project.name}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="font-semibold text-[var(--navy-900)]">{project.name}</p>
                <p className="mt-1 flex items-center gap-1.5 text-xs text-[var(--muted)]"><CalendarDays aria-hidden="true" size={14} /> Planned end {project.due}</p>
              </div>
              <StatusBadge label={project.status} tone="info" />
            </div>
            <div className="mt-4 flex items-center gap-3">
              <div aria-label={`${project.progress}% progress`} aria-valuemax={100} aria-valuemin={0} aria-valuenow={project.progress} className="h-2 flex-1 overflow-hidden rounded-full bg-[var(--navy-100)]" role="progressbar">
                <div className="h-full rounded-full bg-[var(--navy-700)]" style={{ width: `${project.progress}%` }} />
              </div>
              <span className="text-xs font-semibold text-[var(--navy-900)]">{project.progress}%</span>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

export function ActionList() {
  return (
    <Card>
      <CardHeader description="Items that need your attention" title="Action list" />
      <div className="divide-y divide-[var(--border)]">
        {userActions.map((action) => (
          <div className="flex items-start justify-between gap-3 p-4" key={action.label}>
            <div>
              <p className="text-sm font-semibold text-[var(--navy-900)]">{action.label}</p>
              <p className="mt-1 text-xs text-[var(--muted)]">{action.detail}</p>
            </div>
            <StatusBadge label={action.status} tone={statusTone(action.status)} />
          </div>
        ))}
      </div>
    </Card>
  );
}

export function OrganizationOverview() {
  return (
    <Card className="paper-texture overflow-hidden">
      <div className="grid gap-6 p-5 md:grid-cols-[1.4fr_1fr] md:p-6">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--navy-500)]">Organization overview</p>
          <h2 className="mt-2 text-xl font-bold text-[var(--navy-950)]">Access and policy controls are up to date</h2>
          <p className="mt-2 max-w-xl text-sm leading-6 text-[var(--muted)]">Thirty active accounts are within the approved v1 limit. Self-approval remains locked for every role.</p>
        </div>
        <dl className="grid grid-cols-2 gap-3">
          <div className="rounded-lg border border-[var(--border)] bg-white/90 p-3"><dt className="text-xs text-[var(--muted)]">Active accounts</dt><dd className="mt-1 text-xl font-bold text-[var(--navy-950)]">30</dd></div>
          <div className="rounded-lg border border-[var(--border)] bg-white/90 p-3"><dt className="text-xs text-[var(--muted)]">Policy version</dt><dd className="mt-1 text-xl font-bold text-[var(--navy-950)]">12</dd></div>
          <div className="rounded-lg border border-[var(--border)] bg-white/90 p-3"><dt className="text-xs text-[var(--muted)]">Departments</dt><dd className="mt-1 text-xl font-bold text-[var(--navy-950)]">4</dd></div>
          <div className="rounded-lg border border-[var(--border)] bg-white/90 p-3"><dt className="text-xs text-[var(--muted)]">Privileged users</dt><dd className="mt-1 text-xl font-bold text-[var(--navy-950)]">3</dd></div>
        </dl>
      </div>
    </Card>
  );
}

