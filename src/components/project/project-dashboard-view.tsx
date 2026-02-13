"use client";

import { trpc } from "@/lib/trpc";
import { Skeleton } from "@/components/ui/skeleton";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
} from "recharts";

interface ProjectDashboardViewProps {
  projectId: string;
}

const COLORS = ["#4573D2", "#16a34a", "#f59e0b", "#ef4444"];

export function ProjectDashboardView({ projectId }: ProjectDashboardViewProps) {
  const { data: tasks } = trpc.tasks.list.useQuery({ projectId });
  const { data: sectionData } = trpc.reporting.getProjectTasksBySection.useQuery({ projectId });
  const { data: trendData } = trpc.reporting.getProjectCompletionTrend.useQuery({
    projectId,
    days: 30,
  });

  const total = tasks?.length ?? 0;
  const completed = tasks?.filter((t) => t.status === "COMPLETE").length ?? 0;
  const incomplete = total - completed;
  const overdue =
    tasks?.filter(
      (t) =>
        t.status === "INCOMPLETE" &&
        t.dueDate &&
        new Date(t.dueDate) < new Date()
    ).length ?? 0;

  const pieData = [
    { name: "Completed", value: completed },
    { name: "In Progress", value: incomplete - overdue },
    { name: "Overdue", value: overdue },
  ].filter((d) => d.value > 0);

  return (
    <div className="p-6">
      {/* Stat Cards */}
      <div className="mb-8 grid grid-cols-4 gap-4">
        {[
          { label: "Total Tasks", value: total, color: "#4573D2" },
          { label: "Completed", value: completed, color: "#16a34a" },
          { label: "In Progress", value: incomplete - overdue, color: "#f59e0b" },
          { label: "Overdue", value: overdue, color: "#ef4444" },
        ].map((stat) => (
          <div
            key={stat.label}
            className="rounded-lg border bg-white p-4 dark:bg-card"
          >
            <p className="text-sm text-muted-foreground">{stat.label}</p>
            <p
              className="mt-1 text-2xl font-semibold"
              style={{ color: stat.color }}
            >
              {stat.value}
            </p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* Completion Pie */}
        <div className="rounded-lg border bg-white p-4 dark:bg-card">
          <h3 className="mb-4 text-sm font-medium">Task Completion</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {pieData.map((_, index) => (
                    <Cell
                      key={index}
                      fill={COLORS[index % COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-2 flex justify-center gap-4">
            {pieData.map((d, i) => (
              <div key={d.name} className="flex items-center gap-1.5 text-xs">
                <div
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: COLORS[i % COLORS.length] }}
                />
                {d.name} ({d.value})
              </div>
            ))}
          </div>
        </div>

        {/* Tasks by Section Bar */}
        <div className="rounded-lg border bg-white p-4 dark:bg-card">
          <h3 className="mb-4 text-sm font-medium">Tasks by Section</h3>
          <div className="h-64">
            {sectionData && (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={sectionData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Bar dataKey="completed" fill="#16a34a" name="Completed" />
                  <Bar dataKey="incomplete" fill="#f59e0b" name="Incomplete" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Completion Trend Line */}
        <div className="col-span-2 rounded-lg border bg-white p-4 dark:bg-card">
          <h3 className="mb-4 text-sm font-medium">
            Completion Trend (Last 30 Days)
          </h3>
          <div className="h-64">
            {trendData && (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 11 }}
                    tickFormatter={(d) => {
                      const date = new Date(d);
                      return `${date.getMonth() + 1}/${date.getDate()}`;
                    }}
                  />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Line
                    type="monotone"
                    dataKey="cumulative"
                    stroke="#4573D2"
                    strokeWidth={2}
                    name="Total Completed"
                    dot={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="completed"
                    stroke="#16a34a"
                    strokeWidth={1}
                    name="Daily Completed"
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
