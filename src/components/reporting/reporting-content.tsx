"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { exportReportToCsv } from "@/lib/export";
import {
  CheckCircle2,
  Clock,
  AlertTriangle,
  TrendingUp,
  BarChart3,
  Bookmark,
  Download,
  Trash2,
} from "lucide-react";
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

const COLORS = {
  blue: "#4573D2",
  green: "#22C55E",
  yellow: "#FBBF24",
  red: "#EF4444",
};

export function ReportingContent() {
  const { data: workspaces } = trpc.workspaces.list.useQuery();
  const workspaceId = workspaces?.[0]?.id;
  const [showSavedReports, setShowSavedReports] = useState(false);

  const { data: savedReports } = trpc.savedReports.list.useQuery(
    { workspaceId: workspaceId! },
    { enabled: !!workspaceId }
  );

  const utils = trpc.useUtils();

  const saveReport = trpc.savedReports.create.useMutation({
    onSuccess: () => {
      utils.savedReports.list.invalidate();
      toast.success("Report saved");
    },
  });

  const deleteReport = trpc.savedReports.delete.useMutation({
    onSuccess: () => {
      utils.savedReports.list.invalidate();
      toast.success("Report deleted");
    },
  });

  const { data: tasksByStatus, isLoading: statusLoading } =
    trpc.reporting.getTasksByStatus.useQuery(
      { workspaceId: workspaceId! },
      { enabled: !!workspaceId }
    );

  const { data: projectStats, isLoading: projectsLoading } =
    trpc.reporting.getProjectStats.useQuery(
      { workspaceId: workspaceId! },
      { enabled: !!workspaceId }
    );

  const { data: weeklyActivity, isLoading: weeklyLoading } =
    trpc.reporting.getWeeklyActivity.useQuery(
      { workspaceId: workspaceId! },
      { enabled: !!workspaceId }
    );

  const totalTasks = tasksByStatus?.total ?? 0;
  const completedTasks = tasksByStatus?.completed ?? 0;
  const inProgressTasks = tasksByStatus?.incomplete ?? 0;
  const overdueTasks = tasksByStatus?.overdue ?? 0;

  const pieData = [
    { name: "Completed", value: completedTasks, color: COLORS.green },
    { name: "On Track", value: tasksByStatus?.onTrack ?? 0, color: COLORS.blue },
    { name: "Overdue", value: overdueTasks, color: COLORS.red },
  ].filter((d) => d.value > 0);

  const barData =
    projectStats?.map((p) => ({
      name: p.projectName.length > 12 ? p.projectName.slice(0, 12) + "..." : p.projectName,
      Completed: p.completed,
      Incomplete: p.incomplete,
      Overdue: p.overdue,
    })) ?? [];

  // Build cumulative burnup data from weekly activity
  const burnupData = (() => {
    if (!weeklyActivity || weeklyActivity.length === 0) return [];
    let cumulativeCreated = 0;
    let cumulativeCompleted = 0;
    return weeklyActivity.map((d) => {
      cumulativeCreated += d.created;
      cumulativeCompleted += d.completed;
      return {
        day: d.day,
        "Tasks Created": cumulativeCreated,
        "Tasks Completed": cumulativeCompleted,
      };
    });
  })();

  const isLoading = statusLoading || projectsLoading || weeklyLoading;

  const handleSaveCurrentReport = () => {
    const name = prompt("Report name:");
    if (name && workspaceId) {
      saveReport.mutate({
        workspaceId,
        name,
        config: { type: "overview", dateRange: 7 },
      });
    }
  };

  const handleExportCsv = () => {
    const data = [
      { metric: "Total Tasks", value: totalTasks },
      { metric: "Completed", value: completedTasks },
      { metric: "In Progress", value: inProgressTasks },
      { metric: "Overdue", value: overdueTasks },
    ];
    exportReportToCsv(data, "workspace-report");
    toast.success("Report exported as CSV");
  };

  return (
    <div className="p-6">
      {/* Action Bar */}
      <div className="mb-4 flex items-center justify-end gap-2">
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5 text-xs"
          onClick={() => setShowSavedReports(!showSavedReports)}
        >
          <Bookmark className="h-3.5 w-3.5" />
          Saved Reports {savedReports?.length ? `(${savedReports.length})` : ""}
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5 text-xs"
          onClick={handleSaveCurrentReport}
        >
          <Bookmark className="h-3.5 w-3.5" />
          Save Current
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5 text-xs"
          onClick={handleExportCsv}
        >
          <Download className="h-3.5 w-3.5" />
          Export CSV
        </Button>
      </div>

      {/* Saved Reports Panel */}
      {showSavedReports && savedReports && savedReports.length > 0 && (
        <div className="mb-6 rounded-lg border bg-white p-4 dark:bg-card">
          <h3 className="mb-3 text-sm font-medium">Saved Reports</h3>
          <div className="space-y-2">
            {savedReports.map((report) => (
              <div
                key={report.id}
                className="flex items-center justify-between rounded-lg border px-3 py-2"
              >
                <span className="text-sm">{report.name}</span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-destructive"
                  onClick={() => deleteReport.mutate({ id: report.id })}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border shadow-sm">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900/30">
                <BarChart3 className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-2xl font-semibold text-[#1e1f21] dark:text-white">
                  {totalTasks}
                </p>
                <p className="text-xs text-muted-foreground">Total tasks</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border shadow-sm">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-100 dark:bg-green-900/30">
                <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-2xl font-semibold text-[#1e1f21] dark:text-white">
                  {completedTasks}
                </p>
                <p className="text-xs text-muted-foreground">Completed</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border shadow-sm">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-yellow-100 dark:bg-yellow-900/30">
                <Clock className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
              </div>
              <div>
                <p className="text-2xl font-semibold text-[#1e1f21] dark:text-white">
                  {inProgressTasks}
                </p>
                <p className="text-xs text-muted-foreground">In progress</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border shadow-sm">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-100 dark:bg-red-900/30">
                <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <p className="text-2xl font-semibold text-[#1e1f21] dark:text-white">
                  {overdueTasks}
                </p>
                <p className="text-xs text-muted-foreground">Overdue</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 1: Pie + Bar */}
      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Task Completion Pie Chart */}
        <Card className="border shadow-sm">
          <CardHeader>
            <CardTitle className="text-base font-medium">
              Task completion breakdown
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex h-64 items-center justify-center">
                <p className="text-sm text-muted-foreground">Loading...</p>
              </div>
            ) : pieData.length === 0 ? (
              <div className="flex h-64 flex-col items-center justify-center text-center">
                <CheckCircle2 className="mb-2 h-8 w-8 text-muted-foreground/30" />
                <p className="text-sm text-muted-foreground">
                  No tasks yet. Create tasks to see completion data.
                </p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={3}
                    dataKey="value"
                    label={(props) => {
                      const { name, percent } = props as { name: string; percent: number };
                      return `${name} ${(percent * 100).toFixed(0)}%`;
                    }}
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "var(--color-card, #fff)",
                      border: "1px solid var(--color-border, #e5e7eb)",
                      borderRadius: "8px",
                      fontSize: "13px",
                    }}
                  />
                  <Legend
                    verticalAlign="bottom"
                    height={36}
                    iconType="circle"
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Projects Overview Bar Chart */}
        <Card className="border shadow-sm">
          <CardHeader>
            <CardTitle className="text-base font-medium">
              Tasks per project
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex h-64 items-center justify-center">
                <p className="text-sm text-muted-foreground">Loading...</p>
              </div>
            ) : barData.length === 0 ? (
              <div className="flex h-64 flex-col items-center justify-center text-center">
                <BarChart3 className="mb-2 h-8 w-8 text-muted-foreground/30" />
                <p className="text-sm text-muted-foreground">
                  Create projects to see overview.
                </p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={barData} barGap={2}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 12 }}
                    tickLine={false}
                  />
                  <YAxis
                    allowDecimals={false}
                    tick={{ fontSize: 12 }}
                    tickLine={false}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "var(--color-card, #fff)",
                      border: "1px solid var(--color-border, #e5e7eb)",
                      borderRadius: "8px",
                      fontSize: "13px",
                    }}
                  />
                  <Legend iconType="circle" />
                  <Bar
                    dataKey="Completed"
                    fill={COLORS.green}
                    radius={[4, 4, 0, 0]}
                  />
                  <Bar
                    dataKey="Incomplete"
                    fill={COLORS.blue}
                    radius={[4, 4, 0, 0]}
                  />
                  <Bar
                    dataKey="Overdue"
                    fill={COLORS.red}
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 2: Area + Line */}
      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Weekly Activity Area Chart */}
        <Card className="border shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base font-medium">
              <TrendingUp className="h-4 w-4" />
              Weekly activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex h-64 items-center justify-center">
                <p className="text-sm text-muted-foreground">Loading...</p>
              </div>
            ) : !weeklyActivity || weeklyActivity.length === 0 ? (
              <div className="flex h-64 flex-col items-center justify-center text-center">
                <TrendingUp className="mb-2 h-8 w-8 text-muted-foreground/30" />
                <p className="text-sm text-muted-foreground">
                  No activity data yet.
                </p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <AreaChart data={weeklyActivity}>
                  <defs>
                    <linearGradient
                      id="colorCompleted"
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop
                        offset="5%"
                        stopColor={COLORS.green}
                        stopOpacity={0.3}
                      />
                      <stop
                        offset="95%"
                        stopColor={COLORS.green}
                        stopOpacity={0}
                      />
                    </linearGradient>
                    <linearGradient
                      id="colorCreated"
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop
                        offset="5%"
                        stopColor={COLORS.blue}
                        stopOpacity={0.3}
                      />
                      <stop
                        offset="95%"
                        stopColor={COLORS.blue}
                        stopOpacity={0}
                      />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                  <XAxis
                    dataKey="day"
                    tick={{ fontSize: 12 }}
                    tickLine={false}
                  />
                  <YAxis
                    allowDecimals={false}
                    tick={{ fontSize: 12 }}
                    tickLine={false}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "var(--color-card, #fff)",
                      border: "1px solid var(--color-border, #e5e7eb)",
                      borderRadius: "8px",
                      fontSize: "13px",
                    }}
                  />
                  <Legend iconType="circle" />
                  <Area
                    type="monotone"
                    dataKey="completed"
                    name="Completed"
                    stroke={COLORS.green}
                    fill="url(#colorCompleted)"
                    strokeWidth={2}
                  />
                  <Area
                    type="monotone"
                    dataKey="created"
                    name="Created"
                    stroke={COLORS.blue}
                    fill="url(#colorCreated)"
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Burnup Line Chart */}
        <Card className="border shadow-sm">
          <CardHeader>
            <CardTitle className="text-base font-medium">
              Burnup chart
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex h-64 items-center justify-center">
                <p className="text-sm text-muted-foreground">Loading...</p>
              </div>
            ) : burnupData.length === 0 ? (
              <div className="flex h-64 flex-col items-center justify-center text-center">
                <TrendingUp className="mb-2 h-8 w-8 text-muted-foreground/30" />
                <p className="text-sm text-muted-foreground">
                  No data to display yet.
                </p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={burnupData}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                  <XAxis
                    dataKey="day"
                    tick={{ fontSize: 12 }}
                    tickLine={false}
                  />
                  <YAxis
                    allowDecimals={false}
                    tick={{ fontSize: 12 }}
                    tickLine={false}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "var(--color-card, #fff)",
                      border: "1px solid var(--color-border, #e5e7eb)",
                      borderRadius: "8px",
                      fontSize: "13px",
                    }}
                  />
                  <Legend iconType="circle" />
                  <Line
                    type="monotone"
                    dataKey="Tasks Created"
                    stroke={COLORS.yellow}
                    strokeWidth={2}
                    dot={{ r: 4, fill: COLORS.yellow }}
                    activeDot={{ r: 6 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="Tasks Completed"
                    stroke={COLORS.green}
                    strokeWidth={2}
                    dot={{ r: 4, fill: COLORS.green }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
