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
import { Textarea } from "@/components/ui/textarea";
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
  DropdownMenuSeparator,
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
  Pencil,
  FileText,
  Shield,
  X,
} from "lucide-react";

const STATUS_CONFIG: Record<string, { color: string; bg: string; label: string }> = {
  ON_TRACK: { color: "#7BC86C", bg: "bg-green-50", label: "On track" },
  AT_RISK: { color: "#FD9A00", bg: "bg-orange-50", label: "At risk" },
  OFF_TRACK: { color: "#E8384F", bg: "bg-red-50", label: "Off track" },
  CLOSED: { color: "#6D6E6F", bg: "bg-gray-50", label: "Closed" },
};

type GoalTab = "all" | "my" | "team" | "map";

interface CustomField {
  id: string;
  type: "priority" | "status" | "stage";
  name: string;
}

const FIELD_OPTIONS: Record<string, string[]> = {
  priority: ["Low", "Medium", "High", "Urgent"],
  status: ["Not started", "In progress", "Completed"],
  stage: ["Planning", "Execution", "Review", "Done"],
};

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

  // New state for enhanced features
  const [manageAccessOpen, setManageAccessOpen] = useState(false);
  const [accessEmail, setAccessEmail] = useState("");
  const [addFieldOpen, setAddFieldOpen] = useState(false);
  const [customFields, setCustomFields] = useState<CustomField[]>([]);
  const [descriptions, setDescriptions] = useState<Record<string, string>>({});
  const [fieldValues, setFieldValues] = useState<Record<string, Record<string, string>>>({});
  const [activeGoalId, setActiveGoalId] = useState<string | null>(null);

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

  const addCustomField = (type: "priority" | "status" | "stage", label: string) => {
    const newField: CustomField = {
      id: `field-${Date.now()}`,
      type,
      name: label,
    };
    setCustomFields((prev) => [...prev, newField]);
    toast.success(`${label} field added`);
  };

  const removeCustomField = (fieldId: string) => {
    setCustomFields((prev) => prev.filter((f) => f.id !== fieldId));
    // Clean up field values
    setFieldValues((prev) => {
      const next = { ...prev };
      for (const goalId of Object.keys(next)) {
        if (next[goalId]) {
          const goalFields = { ...next[goalId] };
          delete goalFields[fieldId];
          next[goalId] = goalFields;
        }
      }
      return next;
    });
  };

  const handleAddAccess = () => {
    if (!accessEmail.trim()) return;
    toast.success(`Invitation sent to ${accessEmail}`);
    setAccessEmail("");
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
          <button onClick={() => toggleExpand(goal.id)}>
            <ChevronRight
              className={cn(
                "h-4 w-4 text-muted-foreground transition-transform",
                isExpanded && "rotate-90"
              )}
            />
          </button>
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
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => {
                if (!expandedGoals.has(goal.id)) {
                  toggleExpand(goal.id);
                }
              }}>
                <FileText className="mr-2 h-3.5 w-3.5" />
                Edit description
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => {
                setActiveGoalId(goal.id);
                setAddFieldOpen(true);
              }}>
                <Pencil className="mr-2 h-3.5 w-3.5" />
                Add field
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => {
                setActiveGoalId(goal.id);
                setManageAccessOpen(true);
              }}>
                <Shield className="mr-2 h-3.5 w-3.5" />
                Manage access
              </DropdownMenuItem>
              <DropdownMenuSeparator />
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

        {/* Expanded view: description, custom fields, sub-goals */}
        {isExpanded && (
          <div className="border-t">
            {/* Description textarea */}
            <div className="px-4 py-3 border-b">
              <Label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                Description
              </Label>
              <Textarea
                placeholder="Add a description for this goal..."
                value={descriptions[goal.id] || ""}
                onChange={(e) =>
                  setDescriptions((prev) => ({
                    ...prev,
                    [goal.id]: e.target.value,
                  }))
                }
                className="min-h-[80px] text-sm resize-none"
              />
            </div>

            {/* Custom fields display */}
            {customFields.length > 0 && (
              <div className="px-4 py-3 border-b space-y-3">
                <span className="text-xs font-medium text-muted-foreground">
                  Custom fields
                </span>
                <div className="grid grid-cols-2 gap-3">
                  {customFields.map((field) => (
                    <div key={field.id} className="space-y-1">
                      <Label className="text-xs text-muted-foreground">
                        {field.name}
                      </Label>
                      <Select
                        value={fieldValues[goal.id]?.[field.id] || ""}
                        onValueChange={(value) =>
                          setFieldValues((prev) => ({
                            ...prev,
                            [goal.id]: {
                              ...(prev[goal.id] || {}),
                              [field.id]: value,
                            },
                          }))
                        }
                      >
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue placeholder={`Select ${field.name.toLowerCase()}`} />
                        </SelectTrigger>
                        <SelectContent>
                          {FIELD_OPTIONS[field.type]?.map((option) => (
                            <SelectItem key={option} value={option}>
                              {option}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Sub-goals */}
            {goal.childGoals.length > 0 && (
              <div>
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

      {/* Create Goal Dialog */}
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

      {/* Add Field Dialog */}
      <Dialog open={addFieldOpen} onOpenChange={setAddFieldOpen}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>Add field</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Choose a field type to add to your goal.
            </p>
            <div className="grid grid-cols-3 gap-3">
              <button
                className="flex flex-col items-center gap-2 rounded-lg border p-4 hover:border-[#4573D2] hover:bg-muted/30 transition-colors"
                onClick={() => addCustomField("priority", "Priority")}
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-orange-50">
                  <TrendingUp className="h-5 w-5 text-orange-500" />
                </div>
                <span className="text-sm font-medium">Priority</span>
                <span className="text-[10px] text-muted-foreground text-center">
                  Low, Medium, High, Urgent
                </span>
              </button>
              <button
                className="flex flex-col items-center gap-2 rounded-lg border p-4 hover:border-[#4573D2] hover:bg-muted/30 transition-colors"
                onClick={() => addCustomField("status", "Status")}
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-50">
                  <CheckCircle2 className="h-5 w-5 text-blue-500" />
                </div>
                <span className="text-sm font-medium">Status</span>
                <span className="text-[10px] text-muted-foreground text-center">
                  Not started, In progress, Completed
                </span>
              </button>
              <button
                className="flex flex-col items-center gap-2 rounded-lg border p-4 hover:border-[#4573D2] hover:bg-muted/30 transition-colors"
                onClick={() => addCustomField("stage", "Stage")}
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-purple-50">
                  <Network className="h-5 w-5 text-purple-500" />
                </div>
                <span className="text-sm font-medium">Stage</span>
                <span className="text-[10px] text-muted-foreground text-center">
                  Planning, Execution, Review, Done
                </span>
              </button>
            </div>

            {/* Added fields section */}
            {customFields.length > 0 && (
              <div className="space-y-2 pt-2 border-t">
                <span className="text-xs font-medium text-muted-foreground">
                  Added fields
                </span>
                <div className="space-y-1.5">
                  {customFields.map((field) => (
                    <div
                      key={field.id}
                      className="flex items-center justify-between rounded-md border px-3 py-2"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-sm">{field.name}</span>
                        <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
                          {field.type}
                        </span>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => removeCustomField(field.id)}
                      >
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-end pt-2">
              <Button
                variant="ghost"
                onClick={() => setAddFieldOpen(false)}
              >
                Done
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Manage Access Dialog */}
      <Dialog open={manageAccessOpen} onOpenChange={setManageAccessOpen}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>Manage access</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Input
                placeholder="Add people by email or phone"
                value={accessEmail}
                onChange={(e) => setAccessEmail(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAddAccess();
                  }
                }}
                className="flex-1"
              />
              <Button
                size="sm"
                className="bg-[#4573D2] hover:bg-[#3A63B8]"
                onClick={handleAddAccess}
                disabled={!accessEmail.trim()}
              >
                Add
              </Button>
            </div>

            <div className="space-y-2 pt-2 border-t">
              <span className="text-xs font-medium text-muted-foreground">
                Who has access
              </span>
              <div className="flex items-center justify-between rounded-md border px-3 py-2.5">
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#4573D2] text-white text-xs font-medium">
                    {session?.user?.name
                      ? session.user.name
                          .split(" ")
                          .map((n) => n[0])
                          .join("")
                          .toUpperCase()
                          .slice(0, 2)
                      : "ME"}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-[#1e1f21]">
                      {session?.user?.name || "You"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {session?.user?.email || "Current user"}
                    </p>
                  </div>
                </div>
                <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                  Owner
                </span>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <Button
                className="bg-[#4573D2] hover:bg-[#3A63B8]"
                onClick={() => setManageAccessOpen(false)}
              >
                Done
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
