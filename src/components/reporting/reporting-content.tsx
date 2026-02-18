"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { exportReportToCsv } from "@/lib/export";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  CheckCircle2,
  Clock,
  AlertTriangle,
  TrendingUp,
  BarChart3,
  Bookmark,
  Download,
  Trash2,
  Plus,
  Heart,
  Activity,
  ArrowLeft,
  Users,
  Target,
  Zap,
  PieChart as PieChartIcon,
  MoreHorizontal,
  Globe,
  Share2,
  Copy,
  Pencil,
  Palette,
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
  purple: "#8B5CF6",
  cyan: "#06B6D4",
};

// Chart definitions per category
const CHART_CATEGORIES = [
  {
    key: "recommended",
    label: "Recommended Charts",
    description: "Popular charts for your workspace",
    icon: TrendingUp,
    color: "bg-blue-50 text-blue-600",
    charts: [
      { id: "tasks-by-status", name: "Tasks by Status", description: "Pie chart of task statuses", chartType: "pie" as const },
      { id: "tasks-per-project", name: "Tasks per Project", description: "Bar chart of tasks across projects", chartType: "bar" as const },
      { id: "weekly-activity", name: "Weekly Activity", description: "Area chart of created vs completed", chartType: "area" as const },
      { id: "burnup-chart", name: "Burnup Chart", description: "Cumulative progress over time", chartType: "line" as const },
    ],
  },
  {
    key: "resourcing",
    label: "Resourcing",
    description: "Team workload & capacity charts",
    icon: Users,
    color: "bg-green-50 text-green-600",
    charts: [
      { id: "team-workload", name: "Team Workload", description: "Task distribution bar chart", chartType: "bar" as const },
      { id: "assignment-distribution", name: "Assignment Distribution", description: "Task distribution across assignees", chartType: "pie" as const },
      { id: "capacity-timeline", name: "Capacity Timeline", description: "Workload over time", chartType: "area" as const },
    ],
  },
  {
    key: "work-health",
    label: "Work Health",
    description: "Task health & risk analysis",
    icon: Heart,
    color: "bg-red-50 text-red-600",
    charts: [
      { id: "overdue-tasks", name: "Overdue Tasks", description: "Tasks past their due date", chartType: "bar" as const },
      { id: "health-breakdown", name: "Health Breakdown", description: "On track vs at risk vs off track", chartType: "pie" as const },
      { id: "completion-rate", name: "Completion Rate", description: "Rate of task completion over time", chartType: "line" as const },
    ],
  },
  {
    key: "progress",
    label: "Progress",
    description: "Completion & progress tracking",
    icon: Target,
    color: "bg-purple-50 text-purple-600",
    charts: [
      { id: "overall-progress", name: "Overall Progress", description: "Progress toward completion", chartType: "pie" as const },
      { id: "project-progress", name: "Project Progress", description: "Completion per project", chartType: "bar" as const },
      { id: "velocity-trend", name: "Velocity Trend", description: "Tasks completed per period", chartType: "line" as const },
    ],
  },
];

interface DashboardChart {
  id: string;
  chartDefId: string;
  name: string;
  category: string;
  chartType: "pie" | "bar" | "line" | "area";
}

export function ReportingContent() {
  const { data: workspaces } = trpc.workspaces.list.useQuery();
  const workspaceId = workspaces?.[0]?.id;
  const [showSavedReports, setShowSavedReports] = useState(false);
  const [activeDashboardId, setActiveDashboardId] = useState<string | null>(null);
  const [addChartOpen, setAddChartOpen] = useState(false);
  const [selectedChartCategory, setSelectedChartCategory] = useState<string | null>(null);
  const [showWorkspaceOverview, setShowWorkspaceOverview] = useState(false);
  const [renamingDashboardId, setRenamingDashboardId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");

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

  const updateReport = trpc.savedReports.update.useMutation({
    onSuccess: () => {
      utils.savedReports.list.invalidate();
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
  const onTrackTasks = tasksByStatus?.onTrack ?? 0;

  const isLoading = statusLoading || projectsLoading || weeklyLoading;

  // ── Derived chart data ──────────────────────────────────────────────

  const pieStatusData = [
    { name: "Completed", value: completedTasks, color: COLORS.green },
    { name: "On Track", value: onTrackTasks, color: COLORS.blue },
    { name: "Overdue", value: overdueTasks, color: COLORS.red },
  ].filter((d) => d.value > 0);

  const barProjectData =
    projectStats?.map((p) => ({
      name: p.projectName.length > 12 ? p.projectName.slice(0, 12) + "..." : p.projectName,
      Completed: p.completed,
      Incomplete: p.incomplete,
      Overdue: p.overdue,
    })) ?? [];

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

  const healthPieData = [
    { name: "On Track", value: completedTasks + onTrackTasks, color: COLORS.green },
    { name: "At Risk", value: overdueTasks > 0 ? Math.ceil(overdueTasks / 2) : 0, color: COLORS.yellow },
    { name: "Off Track", value: overdueTasks, color: COLORS.red },
  ].filter((d) => d.value > 0);

  const progressPieData = [
    { name: "Completed", value: completedTasks, color: COLORS.green },
    { name: "Remaining", value: Math.max(0, totalTasks - completedTasks), color: COLORS.blue },
  ].filter((d) => d.value > 0);

  // ── Chart renderer for dashboard widgets ────────────────────────────

  const renderDashboardChart = (chart: DashboardChart) => {
    switch (chart.chartDefId) {
      // ── Recommended ─────────────────────────────────────────────────
      case "tasks-by-status":
        return pieStatusData.length === 0 ? (
          <EmptyChart label="No tasks yet" />
        ) : (
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie data={pieStatusData} cx="50%" cy="50%" innerRadius={55} outerRadius={90} paddingAngle={3} dataKey="value"
                label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
              >
                {pieStatusData.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip contentStyle={tooltipStyle} />
              <Legend verticalAlign="bottom" height={36} iconType="circle" />
            </PieChart>
          </ResponsiveContainer>
        );

      case "tasks-per-project":
        return barProjectData.length === 0 ? (
          <EmptyChart label="No projects yet" />
        ) : (
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={barProjectData} barGap={2}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} tickLine={false} />
              <YAxis allowDecimals={false} tick={{ fontSize: 12 }} tickLine={false} />
              <Tooltip contentStyle={tooltipStyle} />
              <Legend iconType="circle" />
              <Bar dataKey="Completed" fill={COLORS.green} radius={[4, 4, 0, 0]} />
              <Bar dataKey="Incomplete" fill={COLORS.blue} radius={[4, 4, 0, 0]} />
              <Bar dataKey="Overdue" fill={COLORS.red} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        );

      case "weekly-activity":
        return !weeklyActivity || weeklyActivity.length === 0 ? (
          <EmptyChart label="No activity data yet" />
        ) : (
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={weeklyActivity}>
              <defs>
                <linearGradient id="dashColorCompleted" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={COLORS.green} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={COLORS.green} stopOpacity={0} />
                </linearGradient>
                <linearGradient id="dashColorCreated" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={COLORS.blue} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={COLORS.blue} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
              <XAxis dataKey="day" tick={{ fontSize: 12 }} tickLine={false} />
              <YAxis allowDecimals={false} tick={{ fontSize: 12 }} tickLine={false} />
              <Tooltip contentStyle={tooltipStyle} />
              <Legend iconType="circle" />
              <Area type="monotone" dataKey="completed" name="Completed" stroke={COLORS.green} fill="url(#dashColorCompleted)" strokeWidth={2} />
              <Area type="monotone" dataKey="created" name="Created" stroke={COLORS.blue} fill="url(#dashColorCreated)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        );

      case "burnup-chart":
        return burnupData.length === 0 ? (
          <EmptyChart label="No data yet" />
        ) : (
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={burnupData}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
              <XAxis dataKey="day" tick={{ fontSize: 12 }} tickLine={false} />
              <YAxis allowDecimals={false} tick={{ fontSize: 12 }} tickLine={false} />
              <Tooltip contentStyle={tooltipStyle} />
              <Legend iconType="circle" />
              <Line type="monotone" dataKey="Tasks Created" stroke={COLORS.yellow} strokeWidth={2} dot={{ r: 4, fill: COLORS.yellow }} />
              <Line type="monotone" dataKey="Tasks Completed" stroke={COLORS.green} strokeWidth={2} dot={{ r: 4, fill: COLORS.green }} />
            </LineChart>
          </ResponsiveContainer>
        );

      // ── Resourcing ──────────────────────────────────────────────────
      case "team-workload":
        return barProjectData.length === 0 ? (
          <EmptyChart label="No project data" />
        ) : (
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={barProjectData}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} tickLine={false} />
              <YAxis allowDecimals={false} tick={{ fontSize: 12 }} tickLine={false} />
              <Tooltip contentStyle={tooltipStyle} />
              <Legend iconType="circle" />
              <Bar dataKey="Incomplete" name="Active Tasks" fill={COLORS.blue} radius={[4, 4, 0, 0]} />
              <Bar dataKey="Completed" name="Done" fill={COLORS.green} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        );

      case "assignment-distribution": {
        const distData = [
          { name: "In Progress", value: inProgressTasks, color: COLORS.blue },
          { name: "Completed", value: completedTasks, color: COLORS.green },
          { name: "Overdue", value: overdueTasks, color: COLORS.red },
        ].filter((d) => d.value > 0);
        return distData.length === 0 ? (
          <EmptyChart label="No task data" />
        ) : (
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie data={distData} cx="50%" cy="50%" outerRadius={90} dataKey="value"
                label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
              >
                {distData.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip contentStyle={tooltipStyle} />
              <Legend verticalAlign="bottom" height={36} iconType="circle" />
            </PieChart>
          </ResponsiveContainer>
        );
      }

      case "capacity-timeline":
        return !weeklyActivity || weeklyActivity.length === 0 ? (
          <EmptyChart label="No activity data" />
        ) : (
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={weeklyActivity}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
              <XAxis dataKey="day" tick={{ fontSize: 12 }} tickLine={false} />
              <YAxis allowDecimals={false} tick={{ fontSize: 12 }} tickLine={false} />
              <Tooltip contentStyle={tooltipStyle} />
              <Legend iconType="circle" />
              <Area type="monotone" dataKey="created" name="Tasks Created" stroke={COLORS.purple} fill={COLORS.purple} fillOpacity={0.15} strokeWidth={2} />
              <Area type="monotone" dataKey="completed" name="Tasks Completed" stroke={COLORS.cyan} fill={COLORS.cyan} fillOpacity={0.15} strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        );

      // ── Work Health ─────────────────────────────────────────────────
      case "overdue-tasks":
        return barProjectData.length === 0 ? (
          <EmptyChart label="No project data" />
        ) : (
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={barProjectData}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} tickLine={false} />
              <YAxis allowDecimals={false} tick={{ fontSize: 12 }} tickLine={false} />
              <Tooltip contentStyle={tooltipStyle} />
              <Bar dataKey="Overdue" fill={COLORS.red} radius={[4, 4, 0, 0]} />
              <Bar dataKey="Incomplete" name="In Progress" fill={COLORS.yellow} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        );

      case "health-breakdown":
        return healthPieData.length === 0 ? (
          <EmptyChart label="No health data" />
        ) : (
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie data={healthPieData} cx="50%" cy="50%" innerRadius={55} outerRadius={90} paddingAngle={3} dataKey="value"
                label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
              >
                {healthPieData.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip contentStyle={tooltipStyle} />
              <Legend verticalAlign="bottom" height={36} iconType="circle" />
            </PieChart>
          </ResponsiveContainer>
        );

      case "completion-rate":
        return burnupData.length === 0 ? (
          <EmptyChart label="No data yet" />
        ) : (
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={burnupData}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
              <XAxis dataKey="day" tick={{ fontSize: 12 }} tickLine={false} />
              <YAxis allowDecimals={false} tick={{ fontSize: 12 }} tickLine={false} />
              <Tooltip contentStyle={tooltipStyle} />
              <Legend iconType="circle" />
              <Line type="monotone" dataKey="Tasks Completed" stroke={COLORS.green} strokeWidth={2} dot={{ r: 4, fill: COLORS.green }} />
            </LineChart>
          </ResponsiveContainer>
        );

      // ── Progress ────────────────────────────────────────────────────
      case "overall-progress":
        return progressPieData.length === 0 ? (
          <EmptyChart label="No tasks yet" />
        ) : (
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie data={progressPieData} cx="50%" cy="50%" innerRadius={55} outerRadius={90} paddingAngle={3} dataKey="value"
                label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
              >
                {progressPieData.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip contentStyle={tooltipStyle} />
              <Legend verticalAlign="bottom" height={36} iconType="circle" />
            </PieChart>
          </ResponsiveContainer>
        );

      case "project-progress":
        return barProjectData.length === 0 ? (
          <EmptyChart label="No projects yet" />
        ) : (
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={barProjectData}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} tickLine={false} />
              <YAxis allowDecimals={false} tick={{ fontSize: 12 }} tickLine={false} />
              <Tooltip contentStyle={tooltipStyle} />
              <Legend iconType="circle" />
              <Bar dataKey="Completed" fill={COLORS.green} radius={[4, 4, 0, 0]} stackId="a" />
              <Bar dataKey="Incomplete" fill={COLORS.blue} radius={[4, 4, 0, 0]} stackId="a" />
            </BarChart>
          </ResponsiveContainer>
        );

      case "velocity-trend":
        return !weeklyActivity || weeklyActivity.length === 0 ? (
          <EmptyChart label="No data yet" />
        ) : (
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={weeklyActivity}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
              <XAxis dataKey="day" tick={{ fontSize: 12 }} tickLine={false} />
              <YAxis allowDecimals={false} tick={{ fontSize: 12 }} tickLine={false} />
              <Tooltip contentStyle={tooltipStyle} />
              <Legend iconType="circle" />
              <Line type="monotone" dataKey="completed" name="Completed" stroke={COLORS.purple} strokeWidth={2} dot={{ r: 4, fill: COLORS.purple }} />
              <Line type="monotone" dataKey="created" name="Created" stroke={COLORS.cyan} strokeWidth={2} dot={{ r: 4, fill: COLORS.cyan }} />
            </LineChart>
          </ResponsiveContainer>
        );

      default:
        return <EmptyChart label="Unknown chart type" />;
    }
  };

  // ── Handlers ────────────────────────────────────────────────────────

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

  const handleCreateDashboard = () => {
    if (!workspaceId) return;
    saveReport.mutate(
      {
        workspaceId,
        name: `Dashboard: New dashboard`,
        config: { type: "dashboard", charts: [] },
      },
      {
        onSuccess: () => {
          utils.savedReports.list.invalidate();
          toast.success("Dashboard created");
        },
      }
    );
  };

  const handleAddChartToDashboard = (chartDef: { id: string; name: string; chartType: "pie" | "bar" | "line" | "area" }, categoryKey: string) => {
    if (!activeDashboardId || !savedReports) return;
    const dashboard = savedReports.find((r) => r.id === activeDashboardId);
    if (!dashboard) return;

    const config = dashboard.config as any;
    const existingCharts: DashboardChart[] = config?.charts ?? [];

    // Don't add duplicates
    if (existingCharts.some((c) => c.chartDefId === chartDef.id)) {
      toast.info("This chart is already on your dashboard");
      return;
    }

    const newChart: DashboardChart = {
      id: Date.now().toString(),
      chartDefId: chartDef.id,
      name: chartDef.name,
      category: categoryKey,
      chartType: chartDef.chartType,
    };

    updateReport.mutate({
      id: activeDashboardId,
      config: { ...config, charts: [...existingCharts, newChart] },
    });

    setAddChartOpen(false);
    setSelectedChartCategory(null);
    toast.success(`"${chartDef.name}" added to dashboard`);
  };

  const handleRemoveChartFromDashboard = (chartId: string) => {
    if (!activeDashboardId || !savedReports) return;
    const dashboard = savedReports.find((r) => r.id === activeDashboardId);
    if (!dashboard) return;

    const config = dashboard.config as any;
    const existingCharts: DashboardChart[] = config?.charts ?? [];

    updateReport.mutate({
      id: activeDashboardId,
      config: { ...config, charts: existingCharts.filter((c) => c.id !== chartId) },
    });
    toast.success("Chart removed");
  };

  // ── Active Dashboard View ───────────────────────────────────────────

  const activeDashboard = savedReports?.find((r) => r.id === activeDashboardId);

  if (activeDashboard) {
    const config = activeDashboard.config as any;
    const charts: DashboardChart[] = config?.charts ?? [];

    return (
      <div className="p-6">
        {/* Dashboard Header */}
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              className="gap-1.5"
              onClick={() => setActiveDashboardId(null)}
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
            <div className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-[#4573D2]" />
              <h2 className="text-lg font-semibold text-[#1e1f21]">
                {activeDashboard.name.replace("Dashboard: ", "")}
              </h2>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 text-xs"
              onClick={handleExportCsv}
            >
              <Download className="h-3.5 w-3.5" />
              Export
            </Button>
            <Button
              size="sm"
              className="gap-1.5 bg-[#4573D2] hover:bg-[#3A63B8]"
              onClick={() => {
                setSelectedChartCategory(null);
                setAddChartOpen(true);
              }}
            >
              <Plus className="h-3.5 w-3.5" />
              Add chart
            </Button>
          </div>
        </div>

        {/* Dashboard Charts */}
        {charts.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-muted-foreground/20 py-24">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted/30">
              <BarChart3 className="h-8 w-8 text-muted-foreground/40" />
            </div>
            <h3 className="text-lg font-medium text-[#1e1f21]">
              Your dashboard is empty
            </h3>
            <p className="mt-1 max-w-md text-center text-sm text-muted-foreground">
              Add charts to visualize your workspace data. Choose from recommended charts, resourcing, work health, or progress charts.
            </p>
            <Button
              className="mt-6 gap-2 bg-[#4573D2] hover:bg-[#3A63B8]"
              onClick={() => {
                setSelectedChartCategory(null);
                setAddChartOpen(true);
              }}
            >
              <Plus className="h-4 w-4" />
              Add chart
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {charts.map((chart) => {
              const catInfo = CHART_CATEGORIES.find((c) => c.key === chart.category);
              const CatIcon = catInfo?.icon ?? BarChart3;
              return (
                <Card key={chart.id} className="border shadow-sm">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <div className="flex items-center gap-2">
                      <CatIcon className="h-4 w-4 text-muted-foreground" />
                      <CardTitle className="text-sm font-medium">{chart.name}</CardTitle>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-muted-foreground hover:text-destructive"
                      onClick={() => handleRemoveChartFromDashboard(chart.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </CardHeader>
                  <CardContent>
                    {isLoading ? (
                      <div className="flex h-64 items-center justify-center">
                        <p className="text-sm text-muted-foreground">Loading...</p>
                      </div>
                    ) : (
                      renderDashboardChart(chart)
                    )}
                  </CardContent>
                </Card>
              );
            })}

            {/* Add more chart card */}
            <Card
              className="flex cursor-pointer items-center justify-center border-2 border-dashed border-muted-foreground/20 shadow-sm transition-colors hover:border-[#4573D2]/40 hover:bg-muted/10"
              onClick={() => {
                setSelectedChartCategory(null);
                setAddChartOpen(true);
              }}
            >
              <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                <Plus className="h-8 w-8 text-muted-foreground/30" />
                <p className="mt-2 text-sm font-medium text-muted-foreground">Add chart</p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Add Chart Dialog */}
        <AddChartDialog
          open={addChartOpen}
          onOpenChange={setAddChartOpen}
          selectedCategory={selectedChartCategory}
          onCategoryChange={setSelectedChartCategory}
          onAddChart={handleAddChartToDashboard}
        />
      </div>
    );
  }

  // ── Workspace Overview View ─────────────────────────────────────────

  if (showWorkspaceOverview) {
    return (
      <div className="p-6">
        {/* Header */}
        <div className="mb-6 flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            className="gap-1.5"
            onClick={() => setShowWorkspaceOverview(false)}
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
          <div className="flex items-center gap-2">
            <Globe className="h-5 w-5 text-[#4573D2]" />
            <h2 className="text-lg font-semibold text-[#1e1f21]">Workspace overview</h2>
          </div>
        </div>

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

        {/* Team Workload Section */}
        <div className="mt-6">
          <h3 className="mb-3 text-base font-medium text-[#1e1f21]">Team Workload</h3>
          <div className="rounded-lg border bg-white p-5 dark:bg-card">
            <div className="flex items-center gap-6">
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm text-muted-foreground">Tasks distribution</span>
                  <span className="text-xs text-muted-foreground">{totalTasks} total</span>
                </div>
                <div className="h-3 w-full rounded-full bg-gray-100 overflow-hidden flex">
                  {completedTasks > 0 && (
                    <div
                      className="h-3"
                      style={{ width: `${(completedTasks / Math.max(totalTasks, 1)) * 100}%`, backgroundColor: COLORS.green }}
                    />
                  )}
                  {inProgressTasks > 0 && (
                    <div
                      className="h-3"
                      style={{ width: `${(inProgressTasks / Math.max(totalTasks, 1)) * 100}%`, backgroundColor: COLORS.blue }}
                    />
                  )}
                  {overdueTasks > 0 && (
                    <div
                      className="h-3"
                      style={{ width: `${(overdueTasks / Math.max(totalTasks, 1)) * 100}%`, backgroundColor: COLORS.red }}
                    />
                  )}
                </div>
                <div className="mt-2 flex gap-4 text-xs">
                  <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full" style={{backgroundColor: COLORS.green}} />Completed ({completedTasks})</span>
                  <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full" style={{backgroundColor: COLORS.blue}} />In Progress ({inProgressTasks})</span>
                  <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full" style={{backgroundColor: COLORS.red}} />Overdue ({overdueTasks})</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Charts Row 1: Pie + Bar */}
        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Card className="border shadow-sm">
            <CardHeader>
              <CardTitle className="text-base font-medium">Task completion breakdown</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex h-64 items-center justify-center">
                  <p className="text-sm text-muted-foreground">Loading...</p>
                </div>
              ) : pieStatusData.length === 0 ? (
                <EmptyChart label="No tasks yet. Create tasks to see completion data." />
              ) : (
                <ResponsiveContainer width="100%" height={280}>
                  <PieChart>
                    <Pie data={pieStatusData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={3} dataKey="value"
                      label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
                    >
                      {pieStatusData.map((entry, i) => (
                        <Cell key={i} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={tooltipStyle} />
                    <Legend verticalAlign="bottom" height={36} iconType="circle" />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          <Card className="border shadow-sm">
            <CardHeader>
              <CardTitle className="text-base font-medium">Tasks per project</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex h-64 items-center justify-center">
                  <p className="text-sm text-muted-foreground">Loading...</p>
                </div>
              ) : barProjectData.length === 0 ? (
                <EmptyChart label="Create projects to see overview." />
              ) : (
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={barProjectData} barGap={2}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                    <XAxis dataKey="name" tick={{ fontSize: 12 }} tickLine={false} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 12 }} tickLine={false} />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Legend iconType="circle" />
                    <Bar dataKey="Completed" fill={COLORS.green} radius={[4, 4, 0, 0]} />
                    <Bar dataKey="Incomplete" fill={COLORS.blue} radius={[4, 4, 0, 0]} />
                    <Bar dataKey="Overdue" fill={COLORS.red} radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Work Health & Progress */}
        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Card className="border shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base font-medium">
                <Heart className="h-4 w-4 text-red-500" />
                Work Health
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Tasks on track</span>
                  <span className="text-sm font-medium text-green-600">{completedTasks + onTrackTasks}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Tasks at risk</span>
                  <span className="text-sm font-medium text-yellow-600">{overdueTasks > 0 ? Math.ceil(overdueTasks / 2) : 0}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Tasks off track</span>
                  <span className="text-sm font-medium text-red-600">{overdueTasks}</span>
                </div>
                <div className="mt-2 h-2 w-full rounded-full bg-gray-100 overflow-hidden flex">
                  <div className="h-2" style={{ width: `${totalTasks > 0 ? ((completedTasks + onTrackTasks) / totalTasks) * 100 : 0}%`, backgroundColor: COLORS.green }} />
                  <div className="h-2" style={{ width: `${totalTasks > 0 ? (Math.ceil(overdueTasks / 2) / totalTasks) * 100 : 0}%`, backgroundColor: COLORS.yellow }} />
                  <div className="h-2" style={{ width: `${totalTasks > 0 ? (overdueTasks / totalTasks) * 100 : 0}%`, backgroundColor: COLORS.red }} />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base font-medium">
                <Activity className="h-4 w-4 text-[#4573D2]" />
                Progress
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm text-muted-foreground">Overall completion</span>
                    <span className="text-sm font-medium">{totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0}%</span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-gray-100">
                    <div className="h-2 rounded-full bg-[#4573D2]" style={{ width: `${totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0}%` }} />
                  </div>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Tasks completed this week</span>
                  <span className="font-medium">{weeklyActivity?.[weeklyActivity.length - 1]?.completed ?? 0}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Tasks created this week</span>
                  <span className="font-medium">{weeklyActivity?.[weeklyActivity.length - 1]?.created ?? 0}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Charts Row 2: Area + Line */}
        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
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
                <EmptyChart label="No activity data yet." />
              ) : (
                <ResponsiveContainer width="100%" height={280}>
                  <AreaChart data={weeklyActivity}>
                    <defs>
                      <linearGradient id="colorCompleted" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={COLORS.green} stopOpacity={0.3} />
                        <stop offset="95%" stopColor={COLORS.green} stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="colorCreated" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={COLORS.blue} stopOpacity={0.3} />
                        <stop offset="95%" stopColor={COLORS.blue} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                    <XAxis dataKey="day" tick={{ fontSize: 12 }} tickLine={false} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 12 }} tickLine={false} />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Legend iconType="circle" />
                    <Area type="monotone" dataKey="completed" name="Completed" stroke={COLORS.green} fill="url(#colorCompleted)" strokeWidth={2} />
                    <Area type="monotone" dataKey="created" name="Created" stroke={COLORS.blue} fill="url(#colorCreated)" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          <Card className="border shadow-sm">
            <CardHeader>
              <CardTitle className="text-base font-medium">Burnup chart</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex h-64 items-center justify-center">
                  <p className="text-sm text-muted-foreground">Loading...</p>
                </div>
              ) : burnupData.length === 0 ? (
                <EmptyChart label="No data to display yet." />
              ) : (
                <ResponsiveContainer width="100%" height={280}>
                  <LineChart data={burnupData}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                    <XAxis dataKey="day" tick={{ fontSize: 12 }} tickLine={false} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 12 }} tickLine={false} />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Legend iconType="circle" />
                    <Line type="monotone" dataKey="Tasks Created" stroke={COLORS.yellow} strokeWidth={2} dot={{ r: 4, fill: COLORS.yellow }} activeDot={{ r: 6 }} />
                    <Line type="monotone" dataKey="Tasks Completed" stroke={COLORS.green} strokeWidth={2} dot={{ r: 4, fill: COLORS.green }} activeDot={{ r: 6 }} />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // ── Main Reporting View (Dashboard Card Grid) ─────────────────────

  // Filter saved reports to get only dashboards
  const dashboards = savedReports?.filter((r) => {
    const config = r.config as any;
    return config?.type === "dashboard";
  }) ?? [];

  return (
    <div className="p-6">
      {/* Header Bar */}
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-[#1e1f21]">Reporting</h1>
        <Button
          size="sm"
          className="gap-1.5 bg-[#4573D2] hover:bg-[#3A63B8]"
          onClick={handleCreateDashboard}
        >
          <Plus className="h-3.5 w-3.5" />
          Add dashboard
        </Button>
      </div>

      {/* Recents Section Label */}
      <h3 className="mb-4 text-sm font-medium text-muted-foreground">Recents</h3>

      {/* Dashboard Card Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {/* Workspace Overview Card */}
        <button
          className="group flex flex-col rounded-lg border bg-white p-5 text-left shadow-sm transition-colors hover:border-[#4573D2]/40 hover:bg-muted/10 dark:bg-card"
          onClick={() => setShowWorkspaceOverview(true)}
        >
          <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-100 dark:bg-indigo-900/30">
            <Globe className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
          </div>
          <h4 className="text-sm font-medium text-[#1e1f21] dark:text-white group-hover:text-[#4573D2]">
            Workspace overview
          </h4>
          <p className="mt-0.5 text-xs text-muted-foreground">owned by you</p>
          <p className="mt-1 text-[10px] text-muted-foreground">
            4 charts
          </p>
        </button>

        {/* Existing Dashboard Cards */}
        {dashboards.map((dashboard, idx) => {
          const config = dashboard.config as any;
          const chartCount = config?.charts?.length ?? 0;
          const displayName = dashboard.name.replace("Dashboard: ", "");
          const cardColors = [
            { bg: "bg-orange-100 dark:bg-orange-900/30", text: "text-orange-600 dark:text-orange-400" },
            { bg: "bg-purple-100 dark:bg-purple-900/30", text: "text-purple-600 dark:text-purple-400" },
            { bg: "bg-red-100 dark:bg-red-900/30", text: "text-red-600 dark:text-red-400" },
            { bg: "bg-green-100 dark:bg-green-900/30", text: "text-green-600 dark:text-green-400" },
            { bg: "bg-blue-100 dark:bg-blue-900/30", text: "text-blue-600 dark:text-blue-400" },
            { bg: "bg-cyan-100 dark:bg-cyan-900/30", text: "text-cyan-600 dark:text-cyan-400" },
          ];
          const colorSet = cardColors[idx % cardColors.length];

          return (
            <div
              key={dashboard.id}
              className="group relative flex flex-col rounded-lg border bg-white p-5 shadow-sm transition-colors hover:border-[#4573D2]/40 hover:bg-muted/10 dark:bg-card"
            >
              <button
                className="flex flex-1 flex-col text-left"
                onClick={() => setActiveDashboardId(dashboard.id)}
              >
                <div className={cn("mb-3 flex h-10 w-10 items-center justify-center rounded-lg", colorSet.bg)}>
                  <BarChart3 className={cn("h-5 w-5", colorSet.text)} />
                </div>
                <h4 className="text-sm font-medium text-[#1e1f21] dark:text-white group-hover:text-[#4573D2]">
                  {displayName}
                </h4>
                <p className="mt-0.5 text-xs text-muted-foreground">owned by you</p>
                <p className="mt-1 text-[10px] text-muted-foreground">
                  {chartCount} chart{chartCount !== 1 ? "s" : ""}
                </p>
              </button>

              {/* More menu */}
              <div className="absolute right-3 top-3 opacity-0 transition-opacity group-hover:opacity-100">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-muted-foreground hover:text-[#1e1f21]"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-52">
                    <DropdownMenuItem
                      onClick={(e) => {
                        e.stopPropagation();
                        setRenamingDashboardId(dashboard.id);
                        setRenameValue(displayName);
                      }}
                    >
                      <Pencil className="mr-2 h-3.5 w-3.5" />
                      Edit dashboard details
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={(e) => {
                        e.stopPropagation();
                        toast.info("Color & icon customization coming soon");
                      }}
                    >
                      <Palette className="mr-2 h-3.5 w-3.5" />
                      Set color & icon
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={(e) => {
                        e.stopPropagation();
                        if (workspaceId) {
                          const config = dashboard.config as any;
                          saveReport.mutate(
                            {
                              workspaceId,
                              name: `Dashboard: ${displayName} (copy)`,
                              config: { ...config },
                            },
                            {
                              onSuccess: () => {
                                toast.success("Dashboard duplicated");
                              },
                            }
                          );
                        }
                      }}
                    >
                      <Copy className="mr-2 h-3.5 w-3.5" />
                      Duplicate
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={(e) => {
                        e.stopPropagation();
                        navigator.clipboard.writeText(
                          `${window.location.origin}/reporting?dashboard=${dashboard.id}`
                        );
                        toast.success("Link copied to clipboard");
                      }}
                    >
                      <Share2 className="mr-2 h-3.5 w-3.5" />
                      Share
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      className="text-destructive focus:text-destructive"
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteReport.mutate({ id: dashboard.id });
                      }}
                    >
                      <Trash2 className="mr-2 h-3.5 w-3.5" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          );
        })}

        {/* Create Dashboard Card */}
        <button
          className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/20 bg-white p-5 text-center transition-colors hover:border-[#4573D2]/40 hover:bg-muted/10 dark:bg-card"
          onClick={handleCreateDashboard}
        >
          <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-muted/30">
            <Plus className="h-5 w-5 text-muted-foreground/50" />
          </div>
          <h4 className="text-sm font-medium text-muted-foreground">Create dashboard</h4>
        </button>
      </div>

      {/* Rename Dashboard Dialog */}
      <Dialog open={!!renamingDashboardId} onOpenChange={(open) => { if (!open) setRenamingDashboardId(null); }}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Edit dashboard details</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              <label className="text-sm font-medium text-[#1e1f21]">Dashboard name</label>
              <Input
                value={renameValue}
                onChange={(e) => setRenameValue(e.target.value)}
                placeholder="Dashboard name"
                autoFocus
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setRenamingDashboardId(null)}>
                Cancel
              </Button>
              <Button
                size="sm"
                className="bg-[#4573D2] hover:bg-[#3A63B8]"
                onClick={() => {
                  if (renamingDashboardId && renameValue.trim()) {
                    const dashboard = savedReports?.find((r) => r.id === renamingDashboardId);
                    if (dashboard) {
                      updateReport.mutate(
                        {
                          id: renamingDashboardId,
                          name: `Dashboard: ${renameValue.trim()}`,
                        },
                        {
                          onSuccess: () => {
                            toast.success("Dashboard renamed");
                            setRenamingDashboardId(null);
                          },
                        }
                      );
                    }
                  }
                }}
              >
                Save
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── Shared Components ─────────────────────────────────────────────────

const tooltipStyle = {
  backgroundColor: "var(--color-card, #fff)",
  border: "1px solid var(--color-border, #e5e7eb)",
  borderRadius: "8px",
  fontSize: "13px",
};

function EmptyChart({ label }: { label: string }) {
  return (
    <div className="flex h-64 flex-col items-center justify-center text-center">
      <BarChart3 className="mb-2 h-8 w-8 text-muted-foreground/30" />
      <p className="text-sm text-muted-foreground">{label}</p>
    </div>
  );
}

// ── Add Chart Dialog ──────────────────────────────────────────────────

function AddChartDialog({
  open,
  onOpenChange,
  selectedCategory,
  onCategoryChange,
  onAddChart,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedCategory: string | null;
  onCategoryChange: (category: string | null) => void;
  onAddChart: (chart: { id: string; name: string; chartType: "pie" | "bar" | "line" | "area" }, categoryKey: string) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle>Add chart</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Select a chart category, then choose a chart to add to your dashboard.
          </p>
          {selectedCategory === null ? (
            <div className="grid grid-cols-2 gap-3">
              {CHART_CATEGORIES.map((cat) => (
                <button
                  key={cat.key}
                  className="flex flex-col items-center gap-2 rounded-lg border p-4 hover:border-[#4573D2] hover:bg-muted/30 transition-colors text-center"
                  onClick={() => onCategoryChange(cat.key)}
                >
                  <div className={cn("flex h-10 w-10 items-center justify-center rounded-full", cat.color)}>
                    <cat.icon className="h-5 w-5" />
                  </div>
                  <span className="text-sm font-medium">{cat.label}</span>
                  <span className="text-[10px] text-muted-foreground">{cat.description}</span>
                </button>
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              <button
                className="text-xs text-[#4573D2] hover:underline"
                onClick={() => onCategoryChange(null)}
              >
                &larr; Back to categories
              </button>
              <div className="space-y-2">
                {CHART_CATEGORIES.find((c) => c.key === selectedCategory)?.charts.map((chart) => {
                  const chartTypeIcons: Record<string, React.ReactNode> = {
                    pie: <PieChartIcon className="h-5 w-5 text-muted-foreground shrink-0" />,
                    bar: <BarChart3 className="h-5 w-5 text-muted-foreground shrink-0" />,
                    line: <TrendingUp className="h-5 w-5 text-muted-foreground shrink-0" />,
                    area: <Activity className="h-5 w-5 text-muted-foreground shrink-0" />,
                  };
                  return (
                    <button
                      key={chart.id}
                      className="flex w-full items-center gap-3 rounded-lg border p-3 hover:border-[#4573D2] hover:bg-muted/30 transition-colors text-left"
                      onClick={() => onAddChart(chart, selectedCategory)}
                    >
                      {chartTypeIcons[chart.chartType]}
                      <div>
                        <p className="text-sm font-medium">{chart.name}</p>
                        <p className="text-[10px] text-muted-foreground">{chart.description}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
