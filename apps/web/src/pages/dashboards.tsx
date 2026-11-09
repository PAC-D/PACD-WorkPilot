import type { Principal } from "@pacd/contracts";
import { Button, Card, CardHeader } from "@pacd/ui";
import { Filter, Plus } from "lucide-react";
import { lazy, Suspense, useState } from "react";

import { adminStats, superAdminStats } from "../data/demo-data";
import { hasPermission } from "../lib/navigation";
import {
  ActionList,
  DashboardHeader,
  OrganizationOverview,
  ProjectTimeline,
  RecentActivity,
  ReviewQueue,
  StatGrid,
  UserProjects,
  UserSummary,
} from "../components/dashboard-parts";

const WorkTrendChart = lazy(() =>
  import("../components/charts").then((module) => ({ default: module.WorkTrendChart })),
);
const ProjectMixChart = lazy(() =>
  import("../components/charts").then((module) => ({ default: module.ProjectMixChart })),
);

export function UserDashboard({ onNavigate, onRefresh, principal }: { onNavigate: (page: string) => void; onRefresh: () => void; principal: Principal }) {
  return (
    <div className="space-y-6">
      <DashboardHeader
        description="Track your assigned work, claims, and requests from one place."
        name={`Welcome back, ${principal.displayName}`}
        onRefresh={onRefresh}
        title="My overview"
      />
      <div className="welcome-texture rounded-xl bg-[linear-gradient(120deg,#071A33,#1B4877)] p-5 text-white sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-blue-100">Your next step</p>
            <p className="mt-1 text-lg font-bold">Log today’s work update</p>
            <p className="mt-1 max-w-xl text-sm text-blue-100/80">Keep your project record current before submitting this month’s claim.</p>
          </div>
          <Button className="bg-white text-[var(--navy-900)] hover:bg-[var(--navy-100)]" onClick={() => onNavigate("my-work")}>
            <Plus aria-hidden="true" size={17} /> Update work
          </Button>
        </div>
      </div>
      <UserSummary />
      <div className="grid gap-6 xl:grid-cols-[1.25fr_0.75fr]">
        <UserProjects onView={() => onNavigate("projects")} />
        <ActionList />
      </div>
      <RecentActivity personal />
    </div>
  );
}

export function AdminDashboard({ onRefresh, principal }: { onRefresh: () => void; principal: Principal }) {
  const [filters, setFilters] = useState<DashboardFilter>({ period: "30", project: "all" });
  return (
    <div className="space-y-6">
      <DashboardHeader
        description={`Authorized view for ${principal.department}. Counts and activity are limited to assigned scope.`}
        name={principal.displayName}
        onRefresh={onRefresh}
        title="Team operations"
      />
      <DashboardFilters applied={filters} onApply={setFilters} />
      <StatGrid stats={adminStats} />
      <div className="grid gap-6 xl:grid-cols-[1.25fr_0.75fr]">
        <Suspense fallback={<ChartLoading />}><WorkTrendChart period={filters.period} project={filters.project} /></Suspense>
        <Suspense fallback={<ChartLoading />}><ProjectMixChart project={filters.project} /></Suspense>
      </div>
      <ProjectTimeline project={filters.project} />
      <div className="grid gap-6 2xl:grid-cols-2">
        <RecentActivity />
        <ReviewQueue canApprove={hasPermission(principal, "claims.approve.scope")} />
      </div>
    </div>
  );
}

export function SuperAdminDashboard({ onRefresh, principal }: { onRefresh: () => void; principal: Principal }) {
  const [filters, setFilters] = useState<DashboardFilter>({ period: "30", project: "all" });
  return (
    <div className="space-y-6">
      <DashboardHeader
        description="Organization-wide management view with access, configuration, and audit controls."
        name={principal.displayName}
        onRefresh={onRefresh}
        title="Organization operations"
      />
      <OrganizationOverview />
      <DashboardFilters applied={filters} onApply={setFilters} />
      <StatGrid stats={superAdminStats} />
      <div className="grid gap-6 xl:grid-cols-[1.25fr_0.75fr]">
        <Suspense fallback={<ChartLoading />}><WorkTrendChart period={filters.period} project={filters.project} /></Suspense>
        <Suspense fallback={<ChartLoading />}><ProjectMixChart project={filters.project} /></Suspense>
      </div>
      <ProjectTimeline project={filters.project} />
      <div className="grid gap-6 2xl:grid-cols-2">
        <RecentActivity />
        <ReviewQueue canApprove={hasPermission(principal, "claims.approve.scope")} />
      </div>
    </div>
  );
}

interface DashboardFilter {
  period: "7" | "30";
  project: string;
}

function DashboardFilters({ applied, onApply }: { applied: DashboardFilter; onApply: (filters: DashboardFilter) => void }) {
  const [period, setPeriod] = useState<DashboardFilter["period"]>(applied.period);
  const [project, setProject] = useState(applied.project);
  const appliedLabel = `${applied.period === "7" ? "Last 7 days" : "Last 30 days"}, ${applied.project === "all" ? "all authorized projects" : applied.project}`;

  function applyFilters() {
    onApply({ period, project });
  }

  return (
    <Card>
      <CardHeader
        description={appliedLabel}
        title="Dashboard filters"
      />
      <div className="flex flex-wrap items-end gap-3 px-5 py-4">
        <label className="grid gap-1.5 text-xs font-semibold text-[var(--muted)]">
          Period
          <select className="min-h-10 rounded-lg border border-[var(--border)] bg-white px-3 text-sm text-[var(--ink)]" onChange={(event) => setPeriod(event.target.value as DashboardFilter["period"])} value={period}>
            <option value="7">Last 7 days</option>
            <option value="30">Last 30 days</option>
          </select>
        </label>
        <label className="grid gap-1.5 text-xs font-semibold text-[var(--muted)]">
          Project
          <select className="min-h-10 rounded-lg border border-[var(--border)] bg-white px-3 text-sm text-[var(--ink)]" onChange={(event) => setProject(event.target.value)} value={project}>
            <option value="all">All authorized projects</option>
            <option value="Community Learning Hubs">Community Learning Hubs</option>
            <option value="Digital Records Rollout">Digital Records Rollout</option>
          </select>
        </label>
        <Button onClick={applyFilters} variant="secondary"><Filter aria-hidden="true" size={16} /> Apply filters</Button>
      </div>
    </Card>
  );
}

function ChartLoading() {
  return (
    <Card className="min-h-80 animate-pulse p-5" aria-label="Loading chart">
      <div className="h-4 w-32 rounded bg-[var(--navy-100)]" />
      <div className="mt-3 h-3 w-52 rounded bg-slate-100" />
      <div className="mt-8 h-48 rounded-lg bg-[var(--canvas)]" />
    </Card>
  );
}

export function ModulePreview({ label, onBack }: { label: string; onBack: () => void }) {
  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-medium text-[var(--muted)]">Frontend foundation</p>
        <h1 className="mt-1 text-2xl font-bold text-[var(--navy-950)]">{label}</h1>
      </div>
      <Card className="paper-texture p-8 text-center">
        <p className="text-lg font-bold text-[var(--navy-900)]">Module shell ready</p>
        <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-[var(--muted)]">This pass establishes the three role dashboards. The detailed module workflow will reuse the shared tables, filters, forms, pagination, and permission controls as backend contracts are implemented.</p>
        <Button className="mt-5" onClick={onBack} variant="secondary">Return to overview</Button>
      </Card>
    </div>
  );
}

