"use client";

import { useState } from "react";
import { toast } from "sonner";
import Link from "next/link";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Target,
  Plus,
  ChevronRight,
  MoreHorizontal,
  TrendingUp,
  Trash2,
  CheckCircle2,
  Network,
} from "lucide-react";

const STATUS_CONFIG: Record<string, { color: string; bg: string; label: string }> = {
  ON_TRACK: { color: "#7BC86C", bg: "bg-green-50", label: "On track" },
  AT_RISK: { color: "#FD9A00", bg: "bg-orange-50", label: "At risk" },
  OFF_TRACK: { color: "#E8384F", bg: "bg-red-50", label: "Off track" },
  CLOSED: { color: "#6D6E6F", bg: "bg-gray-50", label: "Closed" },
};

type GoalTab = "all" | "my" | "team" | "map";

export function GoalsContent() {
  const { data: session } = useSession();
  const { data: workspaces } = trpc.workspaces.list.useQuery();
  const workspaceId = workspaces?.[0]?.id;

  const { data: goals } = trpc.goals.list.useQuery(
    { workspaceId: workspaceId! },
    { enabled: !!workspaceId }
  );

  const { data: teams } = trpc.teams.list.useQuery(
    { workspaceId: workspaceId! },
    { enabled: !!workspaceId }
  );

  const utils = trpc.useUtils();
  const [createOpen, setCreateOpen] = useState(false);
  const [name, setName] = useState("");
  const [teamId, setTeamId] = useState<string>("");
  const [targetValue, setTargetValue] = useState("100");
  const [expandedGoals, setExpandedGoals] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState<GoalTab>("all");

  const createGoal = trpc.goals.create.useMutation({
    onSuccess: () => {
      utils.goals.list.invalidate();
      setCreateOpen(false);
      setName("");
      setTeamId("");
      setTargetValue("100");
    },
  });

  const updateGoal = trpc.goals.update.useMutation({
    onSuccess: () => utils.goals.list.invalidate(),
  });

  const deleteGoal = trpc.goals.delete.useMutation({
    onSuccess: () => {
      utils.goals.list.invalidate();
      toast.success("Goal deleted");
    },
    onError: () => toast.error("Failed to delete goal"),
  });

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !workspaceId) return;
    createGoal.mutate({
      name: name.trim(),
      workspaceId,
      teamId: teamId || undefined,
      targetValue: parseFloat(targetValue) || 100,
    });
  };

  const toggleExpand = (id: string) => {
    setExpandedGoals((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const getProgress = (current: number, target: number) => {
    if (target <= 0) return 0;
    return Math.min(100, Math.round((current / target) * 100));
  };

  // Filter goals based on active tab
  const filteredGoals = goals?.filter((goal) => {
    if (activeTab === "my") return goal.ownerId === session?.user?.id;
    if (activeTab === "team") return !!goal.teamId;
    return true; // "all" and "map"
  });

  const renderGoalCard = (goal: NonNullable<typeof goals>[number]) => {
    const config = STATUS_CONFIG[goal.status] || STATUS_CONFIG.ON_TRACK;
    const progress = getProgress(goal.currentValue, goal.targetValue);
    const isExpanded = expandedGoals.has(goal.id);

    return (
      <div key={goal.id} className="rounded-lg border bg-white">
        <div className="flex items-center gap-3 px-4 py-3">
          {goal.childGoals.length > 0 ? (
            <button onClick={() => toggleExpand(goal.id)}>
              <ChevronRight
                className={cn(
                  "h-4 w-4 text-muted-foreground transition-transform",
                  isExpanded && "rotate-90"
                )}
              />
            </button>
          ) : (
            <div className="w-4" />
          )}
          <Target className="h-4 w-4 text-[#4573D2]" />
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <Link
                href={`/goals/${goal.id}`}
                className="text-sm font-medium text-[#1e1f21] hover:text-[#4573D2] hover:underline"
              >
                {goal.name}
              </Link>
              <span
                className="rounded-full px-2 py-0.5 text-[10px] font-medium text-white"
                style={{ backgroundColor: config.color }}
              >
                {config.label}
              </span>
              {goal.team && (
                <span className="text-xs text-muted-foreground">
                  {goal.team.name}
                </span>
              )}
            </div>
            <div className="mt-1.5 flex items-center gap-3">
              <div className="h-1.5 flex-1 rounded-full bg-gray-100">
                <div
                  className="h-1.5 rounded-full transition-all"
                  style={{
                    width: `${progress}%`,
                    backgroundColor: config.color,
                  }}
                />
              </div>
              <span className="text-xs font-medium text-muted-foreground">
                {progress}%
              </span>
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => e.stopPropagation()}>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => {
                const next = goal.status === "ON_TRACK" ? "AT_RISK" : goal.status === "AT_RISK" ? "OFF_TRACK" : goal.status === "OFF_TRACK" ? "CLOSED" : "ON_TRACK";
                updateGoal.mutate({ id: goal.id, status: next });
              }}>
                <CheckCircle2 className="mr-2 h-3.5 w-3.5" />
                Change status
              </DropdownMenuItem>
              <DropdownMenuItem
                className="text-destructive"
                onClick={() => {
                  if (window.confirm(`Delete goal "${goal.name}"?`)) {
                    deleteGoal.mutate({ id: goal.id });
                  }
                }}
              >
                <Trash2 className="mr-2 h-3.5 w-3.5" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Sub-goals */}
        {isExpanded && goal.childGoals.length > 0 && (
          <div className="border-t">
            {goal.childGoals.map((sub) => {
              const subConfig = STATUS_CONFIG[sub.status] || STATUS_CONFIG.ON_TRACK;
              const subProgress = getProgress(sub.currentValue, sub.targetValue);
              return (
                <Link
                  key={sub.id}
                  href={`/goals/${sub.id}`}
                  className="flex items-center gap-3 border-b last:border-b-0 px-4 py-2.5 pl-12 hover:bg-muted/30"
                >
                  <Target className="h-3.5 w-3.5 text-muted-foreground" />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-[#1e1f21]">{sub.name}</span>
                      <span
                        className="rounded-full px-1.5 py-0.5 text-[9px] font-medium text-white"
                        style={{ backgroundColor: subConfig.color }}
                      >
                        {subConfig.label}
                      </span>
                    </div>
                    <div className="mt-1 flex items-center gap-2">
                      <div className="h-1 w-24 rounded-full bg-gray-100">
                        <div
                          className="h-1 rounded-full"
                          style={{
                            width: `${subProgress}%`,
                            backgroundColor: subConfig.color,
                          }}
                        />
                      </div>
                      <span className="text-[10px] text-muted-foreground">
                        {subProgress}%
                      </span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  const renderStrategyMap = () => {
    if (!goals || goals.length === 0) return null;

    return (
      <div className="space-y-8">
        {goals.map((goal) => {
          const config = STATUS_CONFIG[goal.status] || STATUS_CONFIG.ON_TRACK;
          const progress = getProgress(goal.currentValue, goal.targetValue);
          return (
            <div key={goal.id} className="relative">
              {/* Parent goal node */}
              <Link
                href={`/goals/${goal.id}`}
                className="mx-auto block w-fit rounded-lg border-2 bg-white px-5 py-3 text-center shadow-sm transition-colors hover:border-[#4573D2]"
                style={{ borderColor: config.color }}
              >
                <div className="flex items-center gap-2 justify-center">
                  <Target className="h-4 w-4" style={{ color: config.color }} />
                  <span className="text-sm font-medium">{goal.name}</span>
                </div>
                <div className="mt-1.5 flex items-center gap-2 justify-center">
                  <div className="h-1.5 w-20 rounded-full bg-gray-100">
                    <div
                      className="h-1.5 rounded-full"
                      style={{ width: `${progress}%`, backgroundColor: config.color }}
                    />
                  </div>
                  <span className="text-[10px] text-muted-foreground">{progress}%</span>
                </div>
              </Link>

              {/* Child goals */}
              {goal.childGoals.length > 0 && (
                <div className="mt-4">
                  {/* Connector line */}
                  <div className="mx-auto h-4 w-px bg-gray-300" />
                  <div className="flex flex-wrap items-start justify-center gap-4">
                    {goal.childGoals.map((sub) => {
                      const subConfig = STATUS_CONFIG[sub.status] || STATUS_CONFIG.ON_TRACK;
                      const subProgress = getProgress(sub.currentValue, sub.targetValue);
                      return (
                        <Link
                          key={sub.id}
                          href={`/goals/${sub.id}`}
                          className="rounded-lg border bg-white px-4 py-2.5 text-center shadow-sm transition-colors hover:border-[#4573D2]"
                        >
                          <div className="flex items-center gap-1.5 justify-center">
                            <Target className="h-3.5 w-3.5" style={{ color: subConfig.color }} />
                            <span className="text-xs font-medium">{sub.name}</span>
                          </div>
                          <div className="mt-1 flex items-center gap-1.5 justify-center">
                            <div className="h-1 w-16 rounded-full bg-gray-100">
                              <div
                                className="h-1 rounded-full"
                                style={{ width: `${subProgress}%`, backgroundColor: subConfig.color }}
                              />
                            </div>
                            <span className="text-[9px] text-muted-foreground">{subProgress}%</span>
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <>
      <div className="h-full">
        <div className="flex h-14 items-center justify-between border-b bg-white px-6">
          <h1 className="text-lg font-medium text-[#1e1f21]">Goals</h1>
          <Button
            size="sm"
            className="gap-1.5 bg-[#4573D2] hover:bg-[#3A63B8]"
            onClick={() => setCreateOpen(true)}
          >
            <Plus className="h-3.5 w-3.5" />
            New goal
          </Button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-1 border-b bg-white px-6 py-1">
          {([
            { key: "all" as GoalTab, label: "All Goals" },
            { key: "my" as GoalTab, label: "My Goals" },
            { key: "team" as GoalTab, label: "Team Goals" },
            { key: "map" as GoalTab, label: "Strategy Map", icon: Network },
          ] as const).map((tab) => (
            <Button
              key={tab.key}
              variant="ghost"
              size="sm"
              className={cn(
                "gap-1.5 text-xs",
                activeTab === tab.key
                  ? "bg-muted text-[#1e1f21]"
                  : "text-muted-foreground"
              )}
              onClick={() => setActiveTab(tab.key)}
            >
              {"icon" in tab && tab.icon && <tab.icon className="h-3.5 w-3.5" />}
              {tab.label}
            </Button>
          ))}
        </div>

        {activeTab === "map" ? (
          <div className="p-6">
            {goals && goals.length > 0 ? (
              renderStrategyMap()
            ) : (
              <div className="py-12 text-center text-sm text-muted-foreground">
                Create goals to see the strategy map
              </div>
            )}
          </div>
        ) : filteredGoals && filteredGoals.length > 0 ? (
          <div className="p-6">
            {/* Status summary */}
            <div className="mb-6 flex gap-3">
              {(["ON_TRACK", "AT_RISK", "OFF_TRACK", "CLOSED"] as const).map(
                (status) => {
                  const config = STATUS_CONFIG[status];
                  const count = filteredGoals.filter((g) => g.status === status).length;
                  return (
                    <div
                      key={status}
                      className={cn(
                        "flex items-center gap-2 rounded-lg px-3 py-2",
                        config.bg
                      )}
                    >
                      <div
                        className="h-2.5 w-2.5 rounded-full"
                        style={{ backgroundColor: config.color }}
                      />
                      <span className="text-sm font-medium">{count}</span>
                      <span className="text-xs text-muted-foreground">
                        {config.label}
                      </span>
                    </div>
                  );
                }
              )}
            </div>

            {/* Goals list */}
            <div className="space-y-2">
              {filteredGoals.map(renderGoalCard)}
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-muted/30">
              <TrendingUp className="h-10 w-10 text-muted-foreground/30" />
            </div>
            <h3 className="text-lg font-medium text-[#1e1f21]">
              {activeTab === "my" ? "No personal goals yet" : activeTab === "team" ? "No team goals yet" : "Set and track goals"}
            </h3>
            <p className="mt-1 max-w-sm text-sm text-muted-foreground">
              Create goals and OKRs to align your team&apos;s efforts and
              measure progress toward key outcomes.
            </p>
            <Button
              className="mt-4 gap-1.5 bg-[#4573D2] hover:bg-[#3A63B8]"
              onClick={() => setCreateOpen(true)}
            >
              <Plus className="h-4 w-4" />
              Create goal
            </Button>
          </div>
        )}
      </div>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>New goal</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="goal-name">Goal name</Label>
              <Input
                id="goal-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Increase revenue by 20%"
                autoFocus
              />
            </div>

            <div className="space-y-2">
              <Label>Target value</Label>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  value={targetValue}
                  onChange={(e) => setTargetValue(e.target.value)}
                  className="w-24"
                />
                <span className="text-sm text-muted-foreground">percent</span>
              </div>
            </div>

            {teams && teams.length > 0 && (
              <div className="space-y-2">
                <Label>Team</Label>
                <Select value={teamId} onValueChange={setTeamId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a team (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    {teams.map((team) => (
                      <SelectItem key={team.id} value={team.id}>
                        {team.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setCreateOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={!name.trim() || createGoal.isPending}
                className="bg-[#4573D2] hover:bg-[#3A63B8]"
              >
                {createGoal.isPending ? "Creating..." : "Create goal"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
