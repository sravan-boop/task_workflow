"use client";

import { useEffect, useState, useMemo, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { toast } from "sonner";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import {
  CheckCircle2,
  Circle,
  Users,
  Settings2,
  Plus,
  MoreHorizontal,
  Eye,
  EyeOff,
  Target,
  ExternalLink,
  RefreshCw,
  Copy,
  Flag,
  CalendarRange,
  FolderPlus,
  UserPlus,
  Milestone,
  CalendarDays,
  Smile,
  AtSign,
  Sparkles,
  Minimize2,
  X,
  Bold,
  Italic,
  ListOrdered,
  ListIcon,
  Code,
  Quote,
  Image,
  Link2,
  Video,
  Table,
  Heading1,
  Heading2,
  Type,
  SeparatorHorizontal,
} from "lucide-react";
import { OnboardingWizard } from "@/components/onboarding/onboarding-wizard";

type WidgetKey = "myTasks" | "projects" | "assignedTasks" | "goals" | "statusUpdates" | "portfolios" | "draftComments" | "forms" | "mentioningMe" | "privateNotepad";
interface WidgetConfig {
  key: WidgetKey;
  label: string;
  visible: boolean;
}

const DEFAULT_WIDGETS: WidgetConfig[] = [
  { key: "myTasks", label: "My Tasks", visible: true },
  { key: "projects", label: "Projects", visible: true },
  { key: "assignedTasks", label: "Tasks I've Assigned", visible: true },
  { key: "goals", label: "Goals", visible: true },
  { key: "statusUpdates", label: "Status Updates", visible: false },
  { key: "portfolios", label: "Portfolios", visible: false },
  { key: "draftComments", label: "Draft Comments", visible: false },
  { key: "forms", label: "Forms", visible: false },
  { key: "mentioningMe", label: "Comments Mentioning Me", visible: false },
  { key: "privateNotepad", label: "Private Notepad", visible: false },
];

export function HomeContent() {
  const [mounted, setMounted] = useState(false);
  const [customizeOpen, setCustomizeOpen] = useState(false);
  const [widgets, setWidgets] = useState<WidgetConfig[]>(DEFAULT_WIDGETS);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; taskId: string } | null>(null);
  const contextRef = useRef<HTMLDivElement>(null);
  const [assignTaskOpen, setAssignTaskOpen] = useState(false);
  const [assignTaskName, setAssignTaskName] = useState("");
  const [assignTaskBody, setAssignTaskBody] = useState("");
  const [assignTaskDueDate, setAssignTaskDueDate] = useState("");
  const [showInsertMenu, setShowInsertMenu] = useState(false);
  const [showCloseConfirm, setShowCloseConfirm] = useState(false);
  const [widgetSizes, setWidgetSizes] = useState<Record<string, "half" | "full">>({});

  useEffect(() => {
    const handler = () => setContextMenu(null);
    if (contextMenu) {
      document.addEventListener("click", handler);
      document.addEventListener("contextmenu", handler);
      return () => {
        document.removeEventListener("click", handler);
        document.removeEventListener("contextmenu", handler);
      };
    }
  }, [contextMenu]);

  // Load saved widget config from localStorage after mount (avoids hydration mismatch)
  useEffect(() => {
    const saved = localStorage.getItem("dashboard-widgets");
    if (saved) {
      try { setWidgets(JSON.parse(saved)); } catch {}
    }
  }, []);

  const toggleWidget = (key: WidgetKey) => {
    setWidgets(prev => {
      const next = prev.map(w => w.key === key ? { ...w, visible: !w.visible } : w);
      localStorage.setItem("dashboard-widgets", JSON.stringify(next));
      return next;
    });
  };

  const moveWidget = (index: number, direction: -1 | 1) => {
    setWidgets(prev => {
      const next = [...prev];
      const target = index + direction;
      if (target < 0 || target >= next.length) return prev;
      [next[index], next[target]] = [next[target], next[index]];
      localStorage.setItem("dashboard-widgets", JSON.stringify(next));
      return next;
    });
  };

  useEffect(() => { setMounted(true); }, []);
  const { data: workspaces } = trpc.workspaces.list.useQuery();
  const workspaceId = workspaces?.[0]?.id;

  const { data: onboardingStatus } = trpc.auth.getOnboardingStatus.useQuery();
  const markOnboarded = trpc.auth.markOnboarded.useMutation({
    onSuccess: () => {
      utils.auth.getOnboardingStatus.invalidate();
    },
  });
  const utils = trpc.useUtils();
  const showOnboarding = onboardingStatus?.isOnboarded === false;

  const { data: myTasks } = trpc.tasks.myTasks.useQuery(
    { workspaceId: workspaceId! },
    { enabled: !!workspaceId }
  );

  const { data: projects } = trpc.projects.list.useQuery(
    { workspaceId: workspaceId! },
    { enabled: !!workspaceId }
  );

  const { data: goals } = trpc.goals.list.useQuery(
    { workspaceId: workspaceId! },
    { enabled: !!workspaceId }
  );

  const router = useRouter();

  const completeTask = trpc.tasks.complete.useMutation({
    onSuccess: () => {
      if (workspaceId) utils.tasks.myTasks.invalidate({ workspaceId });
    },
  });

  const now = useMemo(() => (mounted ? new Date() : null), [mounted]);
  const incompleteTasks = myTasks?.filter((t) => t.status === "INCOMPLETE") || [];
  const completedTasks = myTasks?.filter((t) => t.status === "COMPLETE") || [];
  const overdueTasks = now
    ? incompleteTasks.filter((t) => t.dueDate && new Date(t.dueDate) < now)
    : [];
  const upcomingTasks = now
    ? incompleteTasks.filter((t) => !t.dueDate || new Date(t.dueDate) >= now)
    : incompleteTasks;

  const formatDate = (date: string | Date | null) => {
    if (!date || !now) return "";
    const d = new Date(date);
    const today = now;
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    if (d.toDateString() === today.toDateString()) return "Today";
    if (d.toDateString() === tomorrow.toDateString()) return "Tomorrow";
    return d.toLocaleDateString("en-US", { weekday: "short" });
  };

  const renderTaskRow = (task: NonNullable<typeof myTasks>[number]) => (
    <div
      key={task.id}
      className="flex items-center gap-2 border-b border-gray-100 py-2"
      onContextMenu={(e) => {
        e.preventDefault();
        setContextMenu({ x: e.clientX, y: e.clientY, taskId: task.id });
      }}
    >
      <button onClick={() => completeTask.mutate({ id: task.id })} className="flex-shrink-0">
        {task.status === "COMPLETE" ? (
          <CheckCircle2 className="h-4 w-4 text-green-600" />
        ) : (
          <Circle className="h-4 w-4 text-[#cfcbcb] hover:text-green-600" />
        )}
      </button>
      <Link
        href="/my-tasks"
        className={cn(
          "flex-1 truncate text-sm",
          task.status === "COMPLETE" && "text-muted-foreground line-through"
        )}
      >
        {task.title}
      </Link>
      {task.dueDate && (
        <span
          className={cn(
            "flex items-center gap-1 text-xs",
            now && new Date(task.dueDate) < now && task.status !== "COMPLETE"
              ? "text-red-600"
              : "text-muted-foreground"
          )}
        >
          {formatDate(task.dueDate)}
        </span>
      )}
    </div>
  );

  // Widget rendering map
  const widgetRenderers: Record<WidgetKey, () => React.ReactNode> = {
    myTasks: () => (
      <Card key="myTasks" className="border shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-base font-medium">
            <Link href="/my-tasks" className="hover:text-[#4573D2]">My tasks</Link>
          </CardTitle>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="h-4 w-4" /></Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => document.dispatchEvent(new CustomEvent("quick-add-task"))}>
                Create task
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => router.push("/my-tasks")}>
                View all my tasks
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem>Half size</DropdownMenuItem>
              <DropdownMenuItem>Full size</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-destructive" onClick={() => toggleWidget("myTasks")}>Remove widget</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="upcoming" className="w-full">
            <TabsList className="h-8 bg-transparent p-0">
              <TabsTrigger value="upcoming" className="h-7 rounded-none border-b-2 border-transparent px-3 text-xs data-[state=active]:border-[#1e1f21] data-[state=active]:shadow-none">Upcoming</TabsTrigger>
              <TabsTrigger value="overdue" className="h-7 rounded-none border-b-2 border-transparent px-3 text-xs data-[state=active]:border-[#1e1f21] data-[state=active]:shadow-none">Overdue ({overdueTasks.length})</TabsTrigger>
              <TabsTrigger value="completed" className="h-7 rounded-none border-b-2 border-transparent px-3 text-xs data-[state=active]:border-[#1e1f21] data-[state=active]:shadow-none">Completed</TabsTrigger>
            </TabsList>
            <TabsContent value="upcoming" className="mt-2">
              {upcomingTasks.length > 0 ? (
                <div>
                  {upcomingTasks.slice(0, 5).map(renderTaskRow)}
                  {upcomingTasks.length > 5 && (
                    <Link href="/my-tasks" className="mt-2 block text-center text-xs text-[#4573D2] hover:underline">
                      View all {upcomingTasks.length} tasks
                    </Link>
                  )}
                </div>
              ) : (
                <div className="py-6 text-center text-sm text-muted-foreground">No upcoming tasks</div>
              )}
            </TabsContent>
            <TabsContent value="overdue" className="mt-2">
              {overdueTasks.length > 0 ? (
                <div>{overdueTasks.slice(0, 5).map(renderTaskRow)}</div>
              ) : (
                <div className="py-6 text-center text-sm text-muted-foreground">No overdue tasks</div>
              )}
            </TabsContent>
            <TabsContent value="completed" className="mt-2">
              {completedTasks.length > 0 ? (
                <div>{completedTasks.slice(0, 5).map(renderTaskRow)}</div>
              ) : (
                <div className="py-6 text-center text-sm text-muted-foreground">No completed tasks</div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    ),
    projects: () => (
      <Card key="projects" className="border shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-base font-medium">Projects</CardTitle>
          <div className="flex items-center gap-1">
            <Badge variant="secondary" className="text-xs font-normal">Recents</Badge>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => document.dispatchEvent(new CustomEvent("create-project"))} title="Create project">
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {projects?.slice(0, 4).map((project) => (
              <Link key={project.id} href={`/projects/${project.id}`} className="flex items-center gap-3 rounded-lg p-2 transition-colors hover:bg-muted/50">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg text-sm font-medium text-white" style={{ backgroundColor: project.color }}>
                  {project.name.substring(0, 2).toUpperCase()}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-[#1e1f21]">{project.name}</p>
                  {project.team && <p className="text-xs text-muted-foreground">{project.team.name}</p>}
                </div>
              </Link>
            ))}
            {(!projects || projects.length === 0) && (
              <button className="flex w-full items-center gap-3 rounded-lg border border-dashed p-3 text-sm text-muted-foreground transition-colors hover:border-solid hover:bg-muted/30" onClick={() => document.dispatchEvent(new CustomEvent("create-project"))}>
                <div className="flex h-10 w-10 items-center justify-center rounded-lg border"><Plus className="h-5 w-5" /></div>
                Create project
              </button>
            )}
          </div>
        </CardContent>
      </Card>
    ),
    assignedTasks: () => (
      <Card key="assignedTasks" className={cn("border shadow-sm", widgetSizes.assignedTasks === "full" ? "col-span-2" : "")}>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-base font-medium">
            <Link href="/my-tasks" className="hover:text-[#4573D2]">Tasks I&apos;ve assigned</Link>
          </CardTitle>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="h-4 w-4" /></Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setAssignTaskOpen(true)}>
                Create task
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => router.push("/my-tasks")}>
                View all tasks I have assigned
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setWidgetSizes(prev => ({ ...prev, assignedTasks: "half" }))}>Half size</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setWidgetSizes(prev => ({ ...prev, assignedTasks: "full" }))}>Full size</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-destructive" onClick={() => toggleWidget("assignedTasks")}>Remove widget</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-6 text-center">
            <p className="text-sm text-muted-foreground mb-3">No assigned tasks yet</p>
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 text-xs"
              onClick={() => setAssignTaskOpen(true)}
            >
              <Plus className="h-3 w-3" />
              Assign task
            </Button>
          </div>
        </CardContent>
      </Card>
    ),
    goals: () => {
      const STATUS_COLORS: Record<string, string> = {
        ON_TRACK: "#7BC86C",
        AT_RISK: "#FD9A00",
        OFF_TRACK: "#E8384F",
        CLOSED: "#6D6E6F",
      };
      const STATUS_LABELS: Record<string, string> = {
        ON_TRACK: "On track",
        AT_RISK: "At risk",
        OFF_TRACK: "Off track",
        CLOSED: "Closed",
      };
      return (
        <Card key="goals" className="border shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-base font-medium">
              <Link href="/goals" className="hover:text-[#4573D2]">Goals</Link>
            </CardTitle>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="h-4 w-4" /></Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => router.push("/goals")}>
                  Create goal
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => router.push("/goals")}>
                  View all company goals
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setWidgetSizes(prev => ({ ...prev, goals: "half" }))}>Half size</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setWidgetSizes(prev => ({ ...prev, goals: "full" }))}>Full size</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="text-destructive" onClick={() => toggleWidget("goals")}>Remove widget</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </CardHeader>
          <CardContent>
            {goals && goals.length > 0 ? (
              <div className="space-y-3">
                {goals.slice(0, 5).map((goal) => {
                  const progress = goal.targetValue > 0 ? Math.round((goal.currentValue / goal.targetValue) * 100) : 0;
                  return (
                    <Link key={goal.id} href={`/goals/${goal.id}`} className="flex items-center gap-3 rounded-lg p-2 transition-colors hover:bg-muted/50">
                      <Target className="h-4 w-4 shrink-0" style={{ color: STATUS_COLORS[goal.status] || "#6D6E6F" }} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-[#1e1f21] truncate">{goal.name}</p>
                        <div className="mt-1 flex items-center gap-2">
                          <div className="h-1.5 flex-1 rounded-full bg-gray-100">
                            <div
                              className="h-1.5 rounded-full transition-all"
                              style={{ width: `${Math.min(progress, 100)}%`, backgroundColor: STATUS_COLORS[goal.status] || "#6D6E6F" }}
                            />
                          </div>
                          <span className="text-[10px] text-muted-foreground">{progress}%</span>
                        </div>
                      </div>
                      <span
                        className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium text-white"
                        style={{ backgroundColor: STATUS_COLORS[goal.status] || "#6D6E6F" }}
                      >
                        {STATUS_LABELS[goal.status] || goal.status}
                      </span>
                    </Link>
                  );
                })}
                {goals.length > 5 && (
                  <Link href="/goals" className="block text-center text-xs text-[#4573D2] hover:underline">
                    View all {goals.length} goals
                  </Link>
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <p className="text-sm text-muted-foreground">Set goals to track your progress</p>
                <Link href="/goals" className="mt-2 text-xs text-[#4573D2] hover:underline">Create a goal</Link>
              </div>
            )}
          </CardContent>
        </Card>
      );
    },
    statusUpdates: () => (
      <Card key="statusUpdates" className="border shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-base font-medium">Status Updates</CardTitle>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="h-4 w-4" /></Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem>Half size</DropdownMenuItem>
              <DropdownMenuItem>Full size</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-destructive" onClick={() => toggleWidget("statusUpdates")}>Remove widget</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <p className="text-sm text-muted-foreground">No status updates yet</p>
          </div>
        </CardContent>
      </Card>
    ),
    portfolios: () => (
      <Card key="portfolios" className="border shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-base font-medium">Portfolios</CardTitle>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="h-4 w-4" /></Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem>Half size</DropdownMenuItem>
              <DropdownMenuItem>Full size</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-destructive" onClick={() => toggleWidget("portfolios")}>Remove widget</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <p className="text-sm text-muted-foreground">No portfolios yet</p>
          </div>
        </CardContent>
      </Card>
    ),
    draftComments: () => (
      <Card key="draftComments" className="border shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-base font-medium">Draft Comments</CardTitle>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="h-4 w-4" /></Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem>Half size</DropdownMenuItem>
              <DropdownMenuItem>Full size</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-destructive" onClick={() => toggleWidget("draftComments")}>Remove widget</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <p className="text-sm text-muted-foreground">No draft comments</p>
          </div>
        </CardContent>
      </Card>
    ),
    forms: () => (
      <Card key="forms" className="border shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-base font-medium">Forms</CardTitle>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="h-4 w-4" /></Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem>Half size</DropdownMenuItem>
              <DropdownMenuItem>Full size</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-destructive" onClick={() => toggleWidget("forms")}>Remove widget</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <p className="text-sm text-muted-foreground">No forms yet</p>
          </div>
        </CardContent>
      </Card>
    ),
    mentioningMe: () => (
      <Card key="mentioningMe" className="border shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-base font-medium">Comments Mentioning Me</CardTitle>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="h-4 w-4" /></Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem>Half size</DropdownMenuItem>
              <DropdownMenuItem>Full size</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-destructive" onClick={() => toggleWidget("mentioningMe")}>Remove widget</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <p className="text-sm text-muted-foreground">No comments mentioning you</p>
          </div>
        </CardContent>
      </Card>
    ),
    privateNotepad: () => (
      <Card key="privateNotepad" className="border shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-base font-medium">Private Notepad</CardTitle>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="h-4 w-4" /></Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem>Half size</DropdownMenuItem>
              <DropdownMenuItem>Full size</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-destructive" onClick={() => toggleWidget("privateNotepad")}>Remove widget</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </CardHeader>
        <CardContent>
          <textarea className="w-full min-h-[100px] resize-none rounded border-none bg-muted/30 p-3 text-sm focus:outline-none focus:ring-1 focus:ring-[#4573D2]" placeholder="Jot down notes, ideas, or reminders..." />
        </CardContent>
      </Card>
    ),
  };

  return (
    <div className="mt-6">
      {/* Stats Bar */}
      <div className="flex items-center gap-4 text-sm text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <CheckCircle2 className="h-4 w-4 text-green-600" />
          <strong className="text-[#1e1f21]">{completedTasks.length}</strong>{" "}
          tasks completed
        </span>
        <span className="flex items-center gap-1.5">
          <Users className="h-4 w-4" />
          <strong className="text-[#1e1f21]">0</strong> collaborators
        </span>
        <Button
          variant="ghost"
          size="sm"
          className="ml-auto text-xs text-muted-foreground"
          onClick={() => setCustomizeOpen(true)}
        >
          <Settings2 className="mr-1 h-3.5 w-3.5" />
          Customize
        </Button>
      </div>

      {/* Widget Grid */}
      <div className="mt-6 grid grid-cols-2 gap-6">
        {widgets.filter(w => w.visible).map(w => widgetRenderers[w.key]())}
      </div>

      {/* Customize Dialog */}
      <Dialog open={customizeOpen} onOpenChange={setCustomizeOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Customize Dashboard</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <p className="text-xs text-muted-foreground">Toggle and reorder your dashboard widgets</p>
            {widgets.map((widget, index) => (
              <div key={widget.key} className="flex items-center gap-2 rounded-lg border px-3 py-2">
                <div className="flex flex-col gap-0.5">
                  <button
                    className="text-muted-foreground hover:text-foreground disabled:opacity-30"
                    disabled={index === 0}
                    onClick={() => moveWidget(index, -1)}
                  >
                    <svg width="10" height="6" viewBox="0 0 10 6"><path d="M5 0L10 6H0z" fill="currentColor"/></svg>
                  </button>
                  <button
                    className="text-muted-foreground hover:text-foreground disabled:opacity-30"
                    disabled={index === widgets.length - 1}
                    onClick={() => moveWidget(index, 1)}
                  >
                    <svg width="10" height="6" viewBox="0 0 10 6"><path d="M5 6L0 0h10z" fill="currentColor"/></svg>
                  </button>
                </div>
                <span className="flex-1 text-sm font-medium">{widget.label}</span>
                <button onClick={() => toggleWidget(widget.key)}>
                  {widget.visible ? (
                    <Eye className="h-4 w-4 text-[#4573D2]" />
                  ) : (
                    <EyeOff className="h-4 w-4 text-muted-foreground" />
                  )}
                </button>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {showOnboarding && (
        <OnboardingWizard onComplete={() => markOnboarded.mutate()} />
      )}

      {/* Assign Task Dialog */}
      <Dialog open={assignTaskOpen} onOpenChange={(open) => {
        if (!open && (assignTaskName.trim() || assignTaskBody.trim())) {
          setShowCloseConfirm(true);
        } else {
          setAssignTaskOpen(open);
        }
      }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Assign Task</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Input
                placeholder="Task name"
                value={assignTaskName}
                onChange={(e) => setAssignTaskName(e.target.value)}
                autoFocus
              />
            </div>
            <div className="text-xs text-muted-foreground">
              For <strong>assignee name</strong> in <strong>project name</strong>
            </div>
            <div className="space-y-2">
              <Textarea
                placeholder="Add a description..."
                value={assignTaskBody}
                onChange={(e) => setAssignTaskBody(e.target.value)}
                className="min-h-[100px] resize-none text-sm"
              />
            </div>
            {/* Formatting toolbar */}
            <div className="flex items-center gap-1 flex-wrap border-t pt-3">
              <button className="rounded p-1.5 hover:bg-muted" title="Bold" onClick={() => toast.info("Bold formatting applied")}>
                <Bold className="h-3.5 w-3.5 text-muted-foreground" />
              </button>
              <button className="rounded p-1.5 hover:bg-muted" title="Italic" onClick={() => toast.info("Italic formatting applied")}>
                <Italic className="h-3.5 w-3.5 text-muted-foreground" />
              </button>
              <div className="h-4 w-px bg-gray-200 mx-1" />
              <button className="rounded p-1.5 hover:bg-muted" title="Emoji" onClick={() => toast.info("Emoji picker opening...")}>
                <Smile className="h-3.5 w-3.5 text-muted-foreground" />
              </button>
              <button className="rounded p-1.5 hover:bg-muted" title="Mention" onClick={() => toast.info("@mention selector opening...")}>
                <AtSign className="h-3.5 w-3.5 text-muted-foreground" />
              </button>
              <button className="rounded p-1.5 hover:bg-muted" title="AI Assist" onClick={() => toast.info("AI writing assist...")}>
                <Sparkles className="h-3.5 w-3.5 text-muted-foreground" />
              </button>
              <div className="h-4 w-px bg-gray-200 mx-1" />
              <div className="flex items-center gap-1 ml-auto">
                <input
                  type="date"
                  className="h-7 rounded border px-2 text-[10px] text-muted-foreground"
                  value={assignTaskDueDate}
                  onChange={(e) => setAssignTaskDueDate(e.target.value)}
                  title="Set due date"
                />
                {/* Insert menu */}
                <div className="relative">
                  <button
                    className="flex items-center gap-1 rounded px-1.5 py-1 hover:bg-muted text-xs text-muted-foreground"
                    onClick={() => setShowInsertMenu(!showInsertMenu)}
                  >
                    <Plus className="h-3 w-3" />
                    Insert
                  </button>
                  {showInsertMenu && (
                    <div className="absolute right-0 bottom-8 z-50 w-48 rounded-md border bg-white py-1 shadow-lg">
                      {[
                        { label: "Paragraph", icon: Type },
                        { label: "Heading 1", icon: Heading1 },
                        { label: "Heading 2", icon: Heading2 },
                        { label: "Bulleted list", icon: ListIcon },
                        { label: "Numbered list", icon: ListOrdered },
                        { label: "Code block", icon: Code },
                        { label: "Quote", icon: Quote },
                        { label: "Table", icon: Table },
                        { label: "Section break", icon: SeparatorHorizontal },
                        { label: "Emoji", icon: Smile },
                        { label: "Image", icon: Image },
                        { label: "Mention", icon: AtSign },
                        { label: "Embed link", icon: Link2 },
                        { label: "Record video", icon: Video },
                      ].map((item) => (
                        <button
                          key={item.label}
                          className="flex w-full items-center gap-2 px-3 py-1.5 text-xs hover:bg-muted/50"
                          onClick={() => {
                            toast.info(`Inserted: ${item.label}`);
                            setShowInsertMenu(false);
                          }}
                        >
                          <item.icon className="h-3 w-3 text-muted-foreground" />
                          {item.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
            {/* Actions row */}
            <div className="flex items-center justify-between border-t pt-3">
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="gap-1 text-xs"
                  onClick={() => toast.info("Add collaborators...")}
                >
                  <UserPlus className="h-3 w-3" />
                  Add collaborators
                </Button>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  title="Minimize"
                  onClick={() => setAssignTaskOpen(false)}
                >
                  <Minimize2 className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  title="Close"
                  onClick={() => {
                    if (assignTaskName.trim() || assignTaskBody.trim()) {
                      setShowCloseConfirm(true);
                    } else {
                      setAssignTaskOpen(false);
                    }
                  }}
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
                <Button
                  size="sm"
                  className="bg-[#4573D2] hover:bg-[#3A63B8]"
                  onClick={() => {
                    if (assignTaskName.trim()) {
                      toast.success(`Task "${assignTaskName}" assigned`);
                      setAssignTaskName("");
                      setAssignTaskBody("");
                      setAssignTaskDueDate("");
                      setAssignTaskOpen(false);
                    } else {
                      toast.error("Please enter a task name");
                    }
                  }}
                >
                  Assign task
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Close Confirmation Dialog */}
      <Dialog open={showCloseConfirm} onOpenChange={setShowCloseConfirm}>
        <DialogContent className="sm:max-w-[340px]">
          <DialogHeader>
            <DialogTitle>Are you sure?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            You have unsaved changes. Are you sure you want to close without creating the task?
          </p>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => setShowCloseConfirm(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                setAssignTaskName("");
                setAssignTaskBody("");
                setAssignTaskDueDate("");
                setAssignTaskOpen(false);
                setShowCloseConfirm(false);
              }}
            >
              Delete draft
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Right-click Context Menu for tasks */}
      {contextMenu && (
        <div
          ref={contextRef}
          className="fixed z-50 min-w-[180px] rounded-md border bg-white py-1 shadow-lg"
          style={{ left: contextMenu.x, top: contextMenu.y }}
        >
          <button
            className="flex w-full items-center gap-2 px-3 py-1.5 text-sm hover:bg-muted/50"
            onClick={() => { router.push(`/my-tasks?task=${contextMenu.taskId}`); setContextMenu(null); }}
          >
            <ExternalLink className="h-3.5 w-3.5" /> Open task
          </button>
          <button
            className="flex w-full items-center gap-2 px-3 py-1.5 text-sm hover:bg-muted/50"
            onClick={() => { completeTask.mutate({ id: contextMenu.taskId }); setContextMenu(null); }}
          >
            <CheckCircle2 className="h-3.5 w-3.5" /> Mark complete
          </button>
          <button
            className="flex w-full items-center gap-2 px-3 py-1.5 text-sm hover:bg-muted/50"
            onClick={() => {
              navigator.clipboard.writeText(`${window.location.origin}/my-tasks?task=${contextMenu.taskId}`);
              toast.success("Link copied");
              setContextMenu(null);
            }}
          >
            <Copy className="h-3.5 w-3.5" /> Copy link
          </button>
          <div className="my-1 border-t" />
          <button
            className="flex w-full items-center gap-2 px-3 py-1.5 text-sm hover:bg-muted/50"
            onClick={() => {
              toast.success("Due date set to today");
              setContextMenu(null);
            }}
          >
            <CheckCircle2 className="h-3.5 w-3.5" /> Do it today
          </button>
          <button
            className="flex w-full items-center gap-2 px-3 py-1.5 text-sm hover:bg-muted/50"
            onClick={() => {
              toast.success("Due date set to next week");
              setContextMenu(null);
            }}
          >
            <CalendarRange className="h-3.5 w-3.5" /> Do it next week
          </button>
          <button
            className="flex w-full items-center gap-2 px-3 py-1.5 text-sm hover:bg-muted/50"
            onClick={() => {
              toast.success("Due date set to 30 days from now");
              setContextMenu(null);
            }}
          >
            <Flag className="h-3.5 w-3.5" /> Do it later
          </button>
          <div className="my-1 border-t" />
          <button
            className="flex w-full items-center gap-2 px-3 py-1.5 text-sm hover:bg-muted/50"
            onClick={() => {
              toast("Select a project to add this task");
              setContextMenu(null);
            }}
          >
            <FolderPlus className="h-3.5 w-3.5" /> Add to project
          </button>
          <button
            className="flex w-full items-center gap-2 px-3 py-1.5 text-sm hover:bg-muted/50"
            onClick={() => {
              toast("Open task to assign");
              setContextMenu(null);
            }}
          >
            <UserPlus className="h-3.5 w-3.5" /> Assign to...
          </button>
          <div className="my-1 border-t" />
          <button
            className="flex w-full items-center gap-2 px-3 py-1.5 text-sm hover:bg-muted/50"
            onClick={() => {
              toast.success("Marked as milestone");
              setContextMenu(null);
            }}
          >
            <Milestone className="h-3.5 w-3.5" /> Mark as milestone
          </button>
          <button
            className="flex w-full items-center gap-2 px-3 py-1.5 text-sm hover:bg-muted/50"
            onClick={() => {
              toast.success("Follow up task created");
              setContextMenu(null);
            }}
          >
            <RefreshCw className="h-3.5 w-3.5" /> Create follow up task
          </button>
        </div>
      )}
    </div>
  );
}
