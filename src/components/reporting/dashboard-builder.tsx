"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  Plus,
  Trash2,
  GripVertical,
  BarChart3,
  PieChart as PieChartIcon,
  TrendingUp,
  Hash,
  List,
  Save,
} from "lucide-react";
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

type WidgetType = "stat_card" | "pie_chart" | "bar_chart" | "line_chart" | "task_list";

interface DashboardWidget {
  id: string;
  type: WidgetType;
  title: string;
  width: "half" | "full";
}

const WIDGET_OPTIONS: { type: WidgetType; label: string; icon: React.ReactNode }[] = [
  { type: "stat_card", label: "Stat Card", icon: <Hash className="h-4 w-4" /> },
  { type: "pie_chart", label: "Pie Chart", icon: <PieChartIcon className="h-4 w-4" /> },
  { type: "bar_chart", label: "Bar Chart", icon: <BarChart3 className="h-4 w-4" /> },
  { type: "line_chart", label: "Line Chart", icon: <TrendingUp className="h-4 w-4" /> },
  { type: "task_list", label: "Task List", icon: <List className="h-4 w-4" /> },
];

const COLORS = ["#4573D2", "#22C55E", "#FBBF24", "#EF4444", "#8B5CF6", "#06B6D4"];

interface DashboardBuilderProps {
  projectId?: string;
}

export function DashboardBuilder({ projectId }: DashboardBuilderProps) {
  const { data: workspaces } = trpc.workspaces.list.useQuery();
  const workspaceId = workspaces?.[0]?.id;

  const { data: dashboardConfigs } = trpc.dashboards.list.useQuery(
    { projectId },
    { enabled: !!projectId }
  );

  const dashboardConfig = dashboardConfigs?.[0];

  const createDashboard = trpc.dashboards.create.useMutation({
    onSuccess: () => toast.success("Dashboard saved"),
  });

  const updateDashboard = trpc.dashboards.update.useMutation({
    onSuccess: () => toast.success("Dashboard saved"),
  });

  const [widgets, setWidgets] = useState<DashboardWidget[]>(
    (dashboardConfig?.layout as unknown as DashboardWidget[]) ?? [
      { id: "1", type: "stat_card", title: "Total Tasks", width: "half" },
      { id: "2", type: "stat_card", title: "Completed", width: "half" },
      { id: "3", type: "pie_chart", title: "Task Status", width: "half" },
      { id: "4", type: "bar_chart", title: "Tasks by Section", width: "half" },
    ]
  );

  const [dashboardName, setDashboardName] = useState(dashboardConfig?.name ?? "My Dashboard");

  // Fetch project reporting data
  const { data: tasksBySection } = trpc.reporting.getProjectTasksBySection.useQuery(
    { projectId: projectId! },
    { enabled: !!projectId }
  );

  const { data: projectStats } = trpc.reporting.getProjectStats.useQuery(
    { workspaceId: workspaceId! },
    { enabled: !!workspaceId }
  );

  // Aggregate stats from project stats
  const stats = projectStats
    ? {
        totalTasks: projectStats.reduce((sum, p) => sum + p.total, 0),
        completedTasks: projectStats.reduce((sum, p) => sum + p.completed, 0),
        overdueTasks: projectStats.reduce((sum, p) => sum + p.overdue, 0),
      }
    : null;

  const addWidget = (type: WidgetType) => {
    const newWidget: DashboardWidget = {
      id: Date.now().toString(),
      type,
      title: WIDGET_OPTIONS.find((w) => w.type === type)?.label ?? "Widget",
      width: type === "task_list" ? "full" : "half",
    };
    setWidgets([...widgets, newWidget]);
  };

  const removeWidget = (id: string) => {
    setWidgets(widgets.filter((w) => w.id !== id));
  };

  const updateWidgetTitle = (id: string, title: string) => {
    setWidgets(widgets.map((w) => (w.id === id ? { ...w, title } : w)));
  };

  const toggleWidth = (id: string) => {
    setWidgets(
      widgets.map((w) =>
        w.id === id ? { ...w, width: w.width === "half" ? "full" : "half" } : w
      )
    );
  };

  const handleSave = () => {
    if (!projectId) return;
    const layoutData = widgets as unknown as Record<string, unknown>;
    if (dashboardConfig) {
      updateDashboard.mutate({
        id: dashboardConfig.id,
        name: dashboardName,
        layout: layoutData,
      });
    } else {
      createDashboard.mutate({
        projectId,
        name: dashboardName,
        layout: layoutData,
        widgets: {},
      });
    }
  };

  const renderWidget = (widget: DashboardWidget) => {
    switch (widget.type) {
      case "stat_card":
        return (
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 dark:bg-blue-950">
              <Hash className="h-5 w-5 text-[#4573D2]" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats?.totalTasks ?? 0}</p>
              <p className="text-xs text-muted-foreground">tasks</p>
            </div>
          </div>
        );

      case "pie_chart": {
        const pieData = [
          { name: "Completed", value: stats?.completedTasks ?? 0 },
          { name: "Incomplete", value: (stats?.totalTasks ?? 0) - (stats?.completedTasks ?? 0) },
        ];
        return (
          <ResponsiveContainer width="100%" height={180}>
            <PieChart>
              <Pie data={pieData} cx="50%" cy="50%" innerRadius={40} outerRadius={70} dataKey="value">
                {pieData.map((_, i) => (
                  <Cell key={i} fill={COLORS[i]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        );
      }

      case "bar_chart": {
        const barData = (tasksBySection ?? []).map((s) => ({
          name: s.name || "No Section",
          tasks: s.total,
        }));
        return (
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={barData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="tasks" fill="#4573D2" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        );
      }

      case "line_chart": {
        const lineData = (tasksBySection ?? []).map((s) => ({
          name: s.name || "No Section",
          completed: s.completed,
          incomplete: s.incomplete,
        }));
        return (
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={lineData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Line type="monotone" dataKey="completed" stroke="#22C55E" strokeWidth={2} />
              <Line type="monotone" dataKey="incomplete" stroke="#EF4444" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        );
      }

      case "task_list":
        return (
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              Workspace task summary
            </p>
            <div className="flex items-center justify-between text-sm">
              <span>Total tasks</span>
              <span className="font-medium">{stats?.totalTasks ?? 0}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span>Completed</span>
              <span className="font-medium text-green-600">{stats?.completedTasks ?? 0}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span>Overdue</span>
              <span className="font-medium text-red-600">{stats?.overdueTasks ?? 0}</span>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Input
          value={dashboardName}
          onChange={(e) => setDashboardName(e.target.value)}
          className="h-8 w-60 text-sm font-medium"
        />
        <div className="flex items-center gap-2">
          <Select onValueChange={(val) => addWidget(val as WidgetType)}>
            <SelectTrigger className="h-8 w-40">
              <div className="flex items-center gap-1.5">
                <Plus className="h-3.5 w-3.5" />
                <SelectValue placeholder="Add widget" />
              </div>
            </SelectTrigger>
            <SelectContent>
              {WIDGET_OPTIONS.map((opt) => (
                <SelectItem key={opt.type} value={opt.type}>
                  <div className="flex items-center gap-2">
                    {opt.icon}
                    {opt.label}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button size="sm" onClick={handleSave} disabled={!projectId}>
            <Save className="mr-1.5 h-3.5 w-3.5" />
            Save
          </Button>
        </div>
      </div>

      {/* Widget Grid */}
      <div className="grid grid-cols-2 gap-4">
        {widgets.map((widget) => (
          <Card
            key={widget.id}
            className={widget.width === "full" ? "col-span-2" : "col-span-1"}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <div className="flex items-center gap-2">
                <GripVertical className="h-4 w-4 cursor-grab text-muted-foreground" />
                <input
                  value={widget.title}
                  onChange={(e) => updateWidgetTitle(widget.id, e.target.value)}
                  className="border-none bg-transparent text-sm font-medium outline-none focus:ring-0"
                />
              </div>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => toggleWidth(widget.id)}
                  title={widget.width === "half" ? "Make full width" : "Make half width"}
                >
                  <BarChart3 className="h-3 w-3" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 text-destructive"
                  onClick={() => removeWidget(widget.id)}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>{renderWidget(widget)}</CardContent>
          </Card>
        ))}
      </div>

      {widgets.length === 0 && (
        <div className="flex h-40 items-center justify-center rounded-lg border-2 border-dashed">
          <div className="text-center">
            <p className="text-sm text-muted-foreground">No widgets yet</p>
            <p className="text-xs text-muted-foreground">
              Use the &quot;Add widget&quot; dropdown above to get started
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
