import { Card, CardHeader, DataTable } from "@pacd/ui";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { projectMix, projectTimeline, workTrend, workTrend30 } from "../data/demo-data";

export function WorkTrendChart({ period, project }: { period: "7" | "30"; project: string }) {
  const factor = project === "all" ? 1 : project === "Community Learning Hubs" ? 0.58 : 0.42;
  const data = (period === "7" ? workTrend : workTrend30).map((item) => ({
    ...item,
    completed: Math.round(item.completed * factor),
    updates: Math.round(item.updates * factor),
  }));
  const description = `${period === "7" ? "Last 7 days" : "Last 30 days"}, ${project === "all" ? "all authorized projects" : project}`;

  return (
    <Card className="min-w-0">
      <CardHeader description={description} title="Work updates" />
      <div aria-label="Bar chart of work updates and completed items for the last seven days" className="h-72 px-2 py-4" role="img">
        <ResponsiveContainer height="100%" width="100%">
          <BarChart data={data} margin={{ bottom: 4, left: -18, right: 8, top: 4 }}>
            <CartesianGrid stroke="#E1E7EF" strokeDasharray="3 3" vertical={false} />
            <XAxis axisLine={false} dataKey="day" fontSize={12} tickLine={false} />
            <YAxis allowDecimals={false} axisLine={false} fontSize={12} tickLine={false} />
            <Tooltip cursor={{ fill: "#F7F9FC" }} />
            <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
            <Bar dataKey="updates" fill="#1B4877" name="Updates" radius={[4, 4, 0, 0]} />
            <Bar dataKey="completed" fill="#4071A4" name="Completed" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <details className="border-t border-[var(--border)] px-5 py-3">
        <summary className="type-body cursor-pointer font-medium text-[var(--navy-700)]">View chart data</summary>
        <div className="mt-3">
          <DataTable
            caption="Work update chart values"
            columns={[
              { header: "Date", key: "day", render: (row) => row.day },
              { header: "Updates", key: "updates", render: (row) => row.updates },
              { header: "Completed", key: "completed", render: (row) => row.completed },
            ]}
            getRowKey={(row) => row.day}
            rows={data}
          />
        </div>
      </details>
    </Card>
  );
}

export function ProjectMixChart({ project }: { project: string }) {
  const selectedProject = projectTimeline.find((item) => item.project === project);
  const data = selectedProject
    ? projectMix.filter((item) => item.name.toUpperCase().replace(" ", "_") === selectedProject.status).map((item) => ({ ...item, count: 1 }))
    : projectMix;
  const total = data.reduce((sum, item) => sum + item.count, 0);

  return (
    <Card className="min-w-0">
      <CardHeader description={`${total} projects in authorized scope`} title="Project status" />
      <div aria-label="Donut chart of projects grouped by status" className="h-72 px-2 py-4" role="img">
        <ResponsiveContainer height="100%" width="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="count"
              innerRadius={58}
              nameKey="name"
              outerRadius={90}
              paddingAngle={2}
              stroke="#FFFFFF"
              strokeWidth={3}
            >
              {data.map((entry) => (
                <Cell fill={entry.fill} key={entry.name} />
              ))}
            </Pie>
            <Tooltip />
            <Legend formatter={(value) => <span className="type-caption text-[var(--ink)]">{value}</span>} iconType="circle" />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div className="grid grid-cols-2 gap-px border-t border-[var(--border)] bg-[var(--border)] sm:grid-cols-4">
        {data.map((item) => (
          <div className="bg-white px-3 py-3 text-center" key={item.name}>
            <p className="type-body font-medium text-[var(--navy-900)]">{item.count}</p>
            <p className="type-caption text-[var(--muted)]">{item.name}</p>
          </div>
        ))}
      </div>
    </Card>
  );
}

