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

export function WorkTrendChart({ data, description }: { data: ReadonlyArray<{completed:number;day:string;updates:number}>; description:string }) {
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

export function ProjectMixChart({ data }: { data: ReadonlyArray<{count:number;name:string}> }) {
  const total = data.reduce((sum, item) => sum + item.count, 0);
  const colors=["#1B4877","#4071A4","#94A3B8","#207653","#64748B"];

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
              {data.map((entry, index) => (
                <Cell fill={colors[index % colors.length]} key={entry.name} />
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

