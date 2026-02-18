"use client";

import { useState, useRef, useCallback } from "react";
import { toast } from "sonner";
import Link from "next/link";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
  Sparkles,
  Users,
  Bell,
  ThumbsUp,
  ThumbsDown,
  MessageSquare,
  Filter,
  SlidersHorizontal,
  ArrowUpDown,
  Settings2,
  Calendar,
  Link2,
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

  const { data: members } = trpc.workspaces.getMembers.useQuery(
    { workspaceId: workspaceId! },
    { enabled: !!workspaceId }
  );

  const utils = trpc.useUtils();
  const [createOpen, setCreateOpen] = useState(false);
  const [name, setName] = useState("");
  const [teamId, setTeamId] = useState<string>("");
  const [targetValue, setTargetValue] = useState("100");
  const [expandedGoals, setExpandedGoals] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState<GoalTab>("map");

  // New state for enhanced features
  const [manageAccessOpen, setManageAccessOpen] = useState(false);
  const [accessEmail, setAccessEmail] = useState("");
  const [addFieldOpen, setAddFieldOpen] = useState(false);
  const [customFields, setCustomFields] = useState<CustomField[]>([]);
  const [descriptions, setDescriptions] = useState<Record<string, string>>({});
  const [goalPrivacy, setGoalPrivacy] = useState<"PUBLIC" | "PRIVATE" | "TEAM_ONLY">("PUBLIC");
  const [timePeriod, setTimePeriod] = useState("");
  const [goalOwner, setGoalOwner] = useState("");
  const [goalMembers, setGoalMembers] = useState<string[]>([]);
  const [notifyOnStatusChange, setNotifyOnStatusChange] = useState(true);
  const [aiSuggestions, setAiSuggestions] = useState<Record<string, string[]>>({});
  const [loadingAiGoalId, setLoadingAiGoalId] = useState<string | null>(null);
  const [fieldValues, setFieldValues] = useState<Record<string, Record<string, string>>>({});
  const [activeGoalId, setActiveGoalId] = useState<string | null>(null);
  const [newGoalDescription, setNewGoalDescription] = useState("");
  const [aiFeedback, setAiFeedback] = useState<Record<string, Record<number, "up" | "down">>>({});
  const [feedbackText, setFeedbackText] = useState<Record<string, string>>({});
  const [showFeedbackBox, setShowFeedbackBox] = useState<Record<string, boolean>>({});
  const [selectedMapGoalId, setSelectedMapGoalId] = useState<string | null>(null);
  const [statusUpdateText, setStatusUpdateText] = useState("");
  const [goalSortBy, setGoalSortBy] = useState<"name" | "status" | "progress" | "none">("none");
  const [goalGroupBy, setGoalGroupBy] = useState<"none" | "status" | "team">("none");
  const [timePeriodFilter, setTimePeriodFilter] = useState<"all" | "Q1" | "Q2" | "Q3" | "Q4" | "FY">("all");
  const [mapEditMode, setMapEditMode] = useState(false);
  const [nodePositions, setNodePositions] = useState<Record<string, { x: number; y: number }>>({});
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const dragOffset = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const mapContainerRef = useRef<HTMLDivElement>(null);

  const createGoal = trpc.goals.create.useMutation({
    onSuccess: () => {
      utils.goals.list.invalidate();
      setCreateOpen(false);
      setName("");
      setTeamId("");
      setTargetValue("100");
      setNewGoalDescription("");
      setGoalOwner("");
      setGoalMembers([]);
      setNotifyOnStatusChange(true);
      setTimePeriod("");
      setGoalPrivacy("PUBLIC");
      toast.success("Goal created");
    },
    onError: (err) => {
      toast.error(err.message || "Failed to create goal");
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
    const now = new Date();
    let timePeriodStart: string | undefined;
    let timePeriodEnd: string | undefined;
    if (timePeriod === "FY") {
      timePeriodStart = new Date(now.getFullYear(), 0, 1).toISOString();
      timePeriodEnd = new Date(now.getFullYear(), 11, 31).toISOString();
    } else if (timePeriod.startsWith("Q")) {
      const q = parseInt(timePeriod[1]) - 1;
      timePeriodStart = new Date(now.getFullYear(), q * 3, 1).toISOString();
      timePeriodEnd = new Date(now.getFullYear(), q * 3 + 3, 0).toISOString();
    }
    createGoal.mutate({
      name: name.trim(),
      description: newGoalDescription.trim() || undefined,
      workspaceId,
      teamId: teamId || undefined,
      targetValue: parseFloat(targetValue) || 100,
      privacy: goalPrivacy,
      timePeriodStart,
      timePeriodEnd,
      ownerId: goalOwner || undefined,
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

  const aiChat = trpc.ai.chat.useMutation();

  const generateAiSuggestions = async (goalId: string, goalName: string) => {
    setLoadingAiGoalId(goalId);
    try {
      const result = await aiChat.mutateAsync({
        message: `You are a goal-setting expert. Given the following goal, provide exactly 4 actionable suggestions to improve and achieve it. Return ONLY a JSON array of 4 strings, no markdown, no code fences, no explanation.\n\nGoal: "${goalName}"`,
      });
      const text = result.response.trim();
      const jsonMatch = text.match(/\[[\s\S]*\]/);
      let suggestions: string[];
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        suggestions = Array.isArray(parsed) ? parsed.map((s: any) => String(s)).slice(0, 4) : [];
      } else {
        suggestions = text.split("\n").map(l => l.replace(/^[-*\d.)\s]+/, "").trim()).filter(Boolean).slice(0, 4);
      }
      if (suggestions.length === 0) {
        suggestions = ["No suggestions could be generated. Try rephrasing your goal."];
      }
      setAiSuggestions(prev => ({ ...prev, [goalId]: suggestions }));
    } catch (err: any) {
      toast.error(err.message || "AI suggestion generation failed. Check your API key configuration.");
    } finally {
      setLoadingAiGoalId(null);
    }
  };

  // Filter goals based on active tab
  const filteredGoals = goals?.filter((goal) => {
    if (activeTab === "my") return true; // Show all goals for current user (workspace-level)
    if (activeTab === "team") return true; // Show all workspace goals as team goals
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
              <DropdownMenuItem onClick={() => {
                const url = `${window.location.origin}/goals/${goal.id}`;
                if (navigator.clipboard && window.isSecureContext) {
                  navigator.clipboard.writeText(url);
                } else {
                  const ta = document.createElement("textarea");
                  ta.value = url;
                  ta.style.position = "fixed";
                  ta.style.left = "-9999px";
                  document.body.appendChild(ta);
                  ta.select();
                  document.execCommand("copy");
                  document.body.removeChild(ta);
                }
                toast.success("Goal link copied");
              }}>
                <Link2 className="mr-2 h-3.5 w-3.5" />
                Copy goal link
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
                value={descriptions[goal.id] ?? goal.description ?? ""}
                onChange={(e) =>
                  setDescriptions((prev) => ({
                    ...prev,
                    [goal.id]: e.target.value,
                  }))
                }
                onBlur={(e) => {
                  const val = e.target.value;
                  if (val !== (goal.description ?? "")) {
                    updateGoal.mutate({ id: goal.id, description: val });
                    toast.success("Description saved");
                  }
                }}
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

            {/* AI Suggestions */}
            <div className="px-4 py-3 border-b">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5 text-[#4573D2]" />
                  <span className="text-xs font-medium text-muted-foreground">AI Suggestions</span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 text-[10px] gap-1"
                  onClick={() => generateAiSuggestions(goal.id, goal.name)}
                  disabled={loadingAiGoalId === goal.id}
                >
                  <Sparkles className="h-3 w-3" />
                  {loadingAiGoalId === goal.id ? "Generating..." : "Get suggestions"}
                </Button>
              </div>
              {aiSuggestions[goal.id] && aiSuggestions[goal.id].length > 0 ? (
                <div className="space-y-2">
                  {aiSuggestions[goal.id].map((suggestion, i) => (
                    <div key={i} className="rounded-lg bg-blue-50 p-2.5 text-xs">
                      <div className="flex items-start gap-2">
                        <Sparkles className="h-3 w-3 text-[#4573D2] mt-0.5 shrink-0" />
                        <span className="flex-1 text-[#1e1f21]">{suggestion}</span>
                      </div>
                      <div className="mt-1.5 flex items-center gap-1 pl-5">
                        <button
                          className={cn(
                            "rounded p-1 hover:bg-green-100",
                            aiFeedback[goal.id]?.[i] === "up" ? "bg-green-100 text-green-600" : "text-muted-foreground"
                          )}
                          onClick={() => {
                            setAiFeedback(prev => ({
                              ...prev,
                              [goal.id]: { ...(prev[goal.id] || {}), [i]: "up" },
                            }));
                            toast.success("Thanks for the feedback!");
                          }}
                          title="Helpful"
                        >
                          <ThumbsUp className="h-3 w-3" />
                        </button>
                        <button
                          className={cn(
                            "rounded p-1 hover:bg-red-100",
                            aiFeedback[goal.id]?.[i] === "down" ? "bg-red-100 text-red-600" : "text-muted-foreground"
                          )}
                          onClick={() => {
                            setAiFeedback(prev => ({
                              ...prev,
                              [goal.id]: { ...(prev[goal.id] || {}), [i]: "down" },
                            }));
                            toast.info("Feedback noted. We'll improve suggestions.");
                          }}
                          title="Not helpful"
                        >
                          <ThumbsDown className="h-3 w-3" />
                        </button>
                        <div className="mx-1 h-3 w-px bg-gray-200" />
                        <button
                          className="rounded px-1.5 py-0.5 text-[10px] text-green-600 hover:bg-green-100"
                          onClick={() => {
                            const currentDesc = descriptions[goal.id] ?? goal.description ?? "";
                            const newDesc = currentDesc
                              ? `${currentDesc}\n• ${suggestion}`
                              : `• ${suggestion}`;
                            setDescriptions((prev) => ({
                              ...prev,
                              [goal.id]: newDesc,
                            }));
                            updateGoal.mutate({ id: goal.id, description: newDesc });
                            // Remove applied suggestion from the list
                            setAiSuggestions((prev) => ({
                              ...prev,
                              [goal.id]: prev[goal.id].filter((_, j) => j !== i),
                            }));
                            toast.success("Suggestion applied to description");
                          }}
                        >
                          Apply
                        </button>
                        <button
                          className="rounded px-1.5 py-0.5 text-[10px] text-muted-foreground hover:bg-muted"
                          onClick={() => {
                            setAiSuggestions(prev => ({
                              ...prev,
                              [goal.id]: prev[goal.id].filter((_, j) => j !== i),
                            }));
                          }}
                        >
                          Dismiss
                        </button>
                      </div>
                    </div>
                  ))}

                  {/* Feedback box */}
                  {!showFeedbackBox[goal.id] ? (
                    <button
                      className="flex items-center gap-1.5 text-[10px] text-muted-foreground hover:text-[#4573D2] mt-1"
                      onClick={() => setShowFeedbackBox(prev => ({ ...prev, [goal.id]: true }))}
                    >
                      <MessageSquare className="h-3 w-3" />
                      Share feedback on these suggestions
                    </button>
                  ) : (
                    <div className="mt-2 space-y-2">
                      <Textarea
                        value={feedbackText[goal.id] || ""}
                        onChange={(e) => setFeedbackText(prev => ({ ...prev, [goal.id]: e.target.value }))}
                        placeholder="Tell us how we can improve these suggestions..."
                        className="min-h-[60px] text-xs resize-none"
                      />
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          className="h-6 text-[10px] bg-[#4573D2] hover:bg-[#3A63B8]"
                          onClick={() => {
                            console.log("[AI Feedback]", {
                              goalId: goal.id,
                              goalName: goal.name,
                              feedback: feedbackText[goal.id],
                              ratings: aiFeedback[goal.id],
                              suggestions: aiSuggestions[goal.id],
                              timestamp: new Date().toISOString(),
                            });
                            toast.success("Feedback received — thank you! Your input helps improve AI suggestions.");
                            setFeedbackText(prev => ({ ...prev, [goal.id]: "" }));
                            setShowFeedbackBox(prev => ({ ...prev, [goal.id]: false }));
                          }}
                          disabled={!feedbackText[goal.id]?.trim()}
                        >
                          Submit feedback
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 text-[10px]"
                          onClick={() => setShowFeedbackBox(prev => ({ ...prev, [goal.id]: false }))}
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              ) : loadingAiGoalId !== goal.id ? (
                <p className="text-[10px] text-muted-foreground">Click &quot;Get suggestions&quot; to receive AI-powered recommendations for this goal.</p>
              ) : null}
            </div>

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

  const formatTimePeriod = (startStr?: string | null, endStr?: string | null): string => {
    if (!startStr || !endStr) return "—";
    const start = new Date(startStr);
    const end = new Date(endStr);
    const startMonth = start.getMonth(); // 0-indexed
    const endMonth = end.getMonth();
    const year = start.getFullYear();
    const fyLabel = `FY${String(year).slice(2)}`;

    // Full year: Jan 1 to Dec 31
    if (startMonth === 0 && endMonth === 11 && start.getDate() === 1) {
      return fyLabel;
    }

    // Quarter detection
    if (startMonth % 3 === 0 && start.getDate() === 1) {
      const quarter = Math.floor(startMonth / 3) + 1;
      return `Q${quarter} ${fyLabel}`;
    }

    return fyLabel;
  };

  const renderGoalTable = (tab: "my" | "team") => {
    const currentUserName = session?.user?.name || "Me";

    return (
      <div className="p-6">
        {/* Toolbar */}
        <div className="mb-4 flex items-center gap-2 flex-wrap">
          <Button
            size="sm"
            className="gap-1.5 bg-[#4573D2] hover:bg-[#3A63B8] text-xs"
            onClick={() => setCreateOpen(true)}
          >
            <Plus className="h-3.5 w-3.5" />
            Create goal
          </Button>

          <div className="h-5 w-px bg-gray-200 mx-1" />

          {/* Time periods dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className={cn("gap-1.5 text-xs h-8", timePeriodFilter !== "all" && "border-[#4573D2] bg-blue-50 text-[#4573D2]")}>
                <Calendar className="h-3.5 w-3.5" />
                Time periods: {timePeriodFilter === "all" ? "All" : timePeriodFilter}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={() => setTimePeriodFilter("all")}>All</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setTimePeriodFilter("Q1")}>Q1 FY26</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setTimePeriodFilter("Q2")}>Q2 FY26</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setTimePeriodFilter("Q3")}>Q3 FY26</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setTimePeriodFilter("Q4")}>Q4 FY26</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setTimePeriodFilter("FY")}>Full Year</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Filter dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="gap-1.5 text-xs h-8">
                <Filter className="h-3.5 w-3.5" />
                Filter
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={() => toast.success("Showing all goals")}>All statuses</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => toast.success("Filtered: On track")}>On track</DropdownMenuItem>
              <DropdownMenuItem onClick={() => toast.success("Filtered: At risk")}>At risk</DropdownMenuItem>
              <DropdownMenuItem onClick={() => toast.success("Filtered: Off track")}>Off track</DropdownMenuItem>
              <DropdownMenuItem onClick={() => toast.success("Filtered: Closed")}>Closed</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Sort dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className={cn("gap-1.5 text-xs h-8", goalSortBy !== "none" && "border-[#4573D2] bg-blue-50 text-[#4573D2]")}>
                <ArrowUpDown className="h-3.5 w-3.5" />
                Sort
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={() => setGoalSortBy("none")}>Default</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setGoalSortBy("name")}>Name (A-Z)</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setGoalSortBy("status")}>Status</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setGoalSortBy("progress")}>Progress</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Group dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className={cn("gap-1.5 text-xs h-8", goalGroupBy !== "none" && "border-[#4573D2] bg-blue-50 text-[#4573D2]")}>
                <SlidersHorizontal className="h-3.5 w-3.5" />
                Group
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={() => setGoalGroupBy("none")}>No grouping</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setGoalGroupBy("status")}>By status</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setGoalGroupBy("team")}>By team</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Options dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="gap-1.5 text-xs h-8">
                <Settings2 className="h-3.5 w-3.5" />
                Options
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={() => toast.success("Columns customization coming soon")}>Customize columns</DropdownMenuItem>
              <DropdownMenuItem onClick={() => toast.success("Export coming soon")}>Export goals</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <div className="flex-1" />

          {/* Filter badge */}
          {tab === "team" && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 border border-blue-200 px-2.5 py-1 text-xs font-medium text-blue-700">
              <Users className="h-3 w-3" />
              Team: My workspace
            </span>
          )}
          {tab === "my" && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-purple-50 border border-purple-200 px-2.5 py-1 text-xs font-medium text-purple-700">
              Owner: {currentUserName}
            </span>
          )}
        </div>

        {/* Table */}
        {filteredGoals && filteredGoals.length > 0 ? (
          <div className="rounded-lg border bg-white overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-gray-50/80">
                  <th className="w-10 px-3 py-2.5 text-left">
                    <input type="checkbox" className="h-3.5 w-3.5 rounded border-gray-300" />
                  </th>
                  <th className="px-3 py-2.5 text-left text-xs font-medium text-muted-foreground">Name</th>
                  <th className="px-3 py-2.5 text-left text-xs font-medium text-muted-foreground w-28">Status</th>
                  <th className="px-3 py-2.5 text-left text-xs font-medium text-muted-foreground w-36">Progress</th>
                  <th className="px-3 py-2.5 text-left text-xs font-medium text-muted-foreground w-28">Time period</th>
                  <th className="px-3 py-2.5 text-left text-xs font-medium text-muted-foreground w-32">Accountable team</th>
                  <th className="px-3 py-2.5 text-left text-xs font-medium text-muted-foreground w-40">Owner</th>
                </tr>
              </thead>
              <tbody>
                {[...filteredGoals].sort((a, b) => {
                  if (goalSortBy === "name") return a.name.localeCompare(b.name);
                  if (goalSortBy === "status") return a.status.localeCompare(b.status);
                  if (goalSortBy === "progress") {
                    const pA = getProgress(a.currentValue, a.targetValue);
                    const pB = getProgress(b.currentValue, b.targetValue);
                    return pB - pA;
                  }
                  return 0;
                }).map((goal) => {
                  const config = STATUS_CONFIG[goal.status] || STATUS_CONFIG.ON_TRACK;
                  const progress = getProgress(goal.currentValue, goal.targetValue);
                  const ownerName = (goal as any).owner?.name || "—";
                  const ownerInitial = ownerName !== "—" ? ownerName.charAt(0).toUpperCase() : "?";
                  const tp = formatTimePeriod(
                    (goal as any).timePeriodStart,
                    (goal as any).timePeriodEnd
                  );

                  return (
                    <tr key={goal.id} className="border-b last:border-b-0 hover:bg-gray-50/50 transition-colors">
                      <td className="px-3 py-2.5">
                        <input type="checkbox" className="h-3.5 w-3.5 rounded border-gray-300" />
                      </td>
                      <td className="px-3 py-2.5">
                        <Link
                          href={`/goals/${goal.id}`}
                          className="text-sm font-medium text-[#1e1f21] hover:text-[#4573D2] hover:underline"
                        >
                          {goal.name}
                        </Link>
                      </td>
                      <td className="px-3 py-2.5">
                        <span
                          className="inline-block rounded-full px-2 py-0.5 text-[10px] font-medium text-white"
                          style={{ backgroundColor: config.color }}
                        >
                          {config.label}
                        </span>
                      </td>
                      <td className="px-3 py-2.5">
                        <div className="flex items-center gap-2">
                          <div className="h-1.5 w-20 rounded-full bg-gray-100">
                            <div
                              className="h-1.5 rounded-full transition-all"
                              style={{
                                width: `${progress}%`,
                                backgroundColor: config.color,
                              }}
                            />
                          </div>
                          <span className="text-xs text-muted-foreground font-medium">
                            {progress}%
                          </span>
                        </div>
                      </td>
                      <td className="px-3 py-2.5">
                        <span className="text-xs text-muted-foreground">{tp}</span>
                      </td>
                      <td className="px-3 py-2.5">
                        <span className="text-xs text-muted-foreground">
                          {goal.team?.name || "My workspace"}
                        </span>
                      </td>
                      <td className="px-3 py-2.5">
                        {ownerName !== "—" ? (
                          <div className="flex items-center gap-2">
                            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-[#4573D2] text-white text-[10px] font-medium shrink-0">
                              {ownerInitial}
                            </div>
                            <span className="text-xs text-[#1e1f21] truncate">{ownerName}</span>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-muted/30">
              <TrendingUp className="h-10 w-10 text-muted-foreground/30" />
            </div>
            <h3 className="text-lg font-medium text-[#1e1f21]">
              {tab === "my" ? "No personal goals yet" : "No team goals yet"}
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
    );
  };

  const selectedMapGoal = goals?.find((g) => g.id === selectedMapGoalId);

  // n8n-style node dimensions — larger boxes
  const NODE_W = 400;
  const NODE_H = 120;
  const NODE_GAP_Y = 70;
  const CHILD_GAP_X = 50;

  // Drag handlers for n8n-style node dragging
  const handleMouseDown = useCallback((e: React.MouseEvent, goalId: string) => {
    if (!mapEditMode) return;
    e.preventDefault();
    e.stopPropagation();
    const container = mapContainerRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    // Get position from the node element itself (works even before user has dragged it)
    const nodeEl = e.currentTarget as HTMLElement;
    const nodeLeft = parseFloat(nodeEl.style.left) || 0;
    const nodeTop = parseFloat(nodeEl.style.top) || 0;
    dragOffset.current = {
      x: e.clientX - rect.left + container.scrollLeft - nodeLeft,
      y: e.clientY - rect.top + container.scrollTop - nodeTop,
    };
    // Initialize position in state if not already there
    if (!nodePositions[goalId]) {
      setNodePositions((prev) => ({ ...prev, [goalId]: { x: nodeLeft, y: nodeTop } }));
    }
    setDraggingId(goalId);
  }, [mapEditMode, nodePositions]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!draggingId) return;
    const container = mapContainerRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    const newX = e.clientX - rect.left + container.scrollLeft - dragOffset.current.x;
    const newY = e.clientY - rect.top + container.scrollTop - dragOffset.current.y;
    setNodePositions((prev) => ({
      ...prev,
      [draggingId]: { x: Math.max(0, newX), y: Math.max(0, newY) },
    }));
  }, [draggingId]);

  const handleMouseUp = useCallback(() => {
    setDraggingId(null);
  }, []);

  const renderStrategyMap = () => {
    if (!goals || goals.length === 0) return null;

    const allGoals = goals.map((g) => ({
      ...g,
      children: g.childGoals || [],
    }));

    // Compute default positions centered in available space
    type NodePos = { id: string; x: number; y: number; isChild: boolean; parentId?: string };
    const defaultPositions: NodePos[] = [];
    let currentY = 40;

    // Calculate the total content width needed
    let maxRowWidth = NODE_W;
    allGoals.forEach((goal) => {
      if (goal.children.length > 0) {
        const childRowWidth = goal.children.length * NODE_W + (goal.children.length - 1) * CHILD_GAP_X;
        maxRowWidth = Math.max(maxRowWidth, childRowWidth);
      }
    });

    const CANVAS_W = Math.max(maxRowWidth + 200, 900);
    const CENTER_X = CANVAS_W / 2;

    allGoals.forEach((goal) => {
      const parentX = CENTER_X - NODE_W / 2;
      defaultPositions.push({ id: goal.id, x: parentX, y: currentY, isChild: false });
      currentY += NODE_H + NODE_GAP_Y;

      if (goal.children.length > 0) {
        const totalChildWidth = goal.children.length * NODE_W + (goal.children.length - 1) * CHILD_GAP_X;
        let childStartX = CENTER_X - totalChildWidth / 2;
        goal.children.forEach((child) => {
          defaultPositions.push({ id: child.id, x: childStartX, y: currentY, isChild: true, parentId: goal.id });
          childStartX += NODE_W + CHILD_GAP_X;
        });
        currentY += NODE_H + NODE_GAP_Y;
      }
    });

    // Merge default positions with any user-dragged positions
    const getNodePos = (id: string) => {
      if (nodePositions[id]) return nodePositions[id];
      const def = defaultPositions.find((p) => p.id === id);
      return def ? { x: def.x, y: def.y } : { x: 0, y: 0 };
    };

    const parentPositions = defaultPositions.filter((p) => !p.isChild);

    // Compute canvas size based on all node positions
    let canvasMaxY = 0;
    let canvasMaxX = 0;
    defaultPositions.forEach((p) => {
      const pos = getNodePos(p.id);
      canvasMaxX = Math.max(canvasMaxX, pos.x + NODE_W + 40);
      canvasMaxY = Math.max(canvasMaxY, pos.y + NODE_H + 40);
    });
    const svgHeight = Math.max(canvasMaxY + 60, currentY + 60);
    const svgWidth = Math.max(canvasMaxX + 40, CANVAS_W);

    const renderNode = (goal: any, nodeId: string) => {
      const pos = getNodePos(nodeId);
      const config = STATUS_CONFIG[goal.status] || STATUS_CONFIG.ON_TRACK;
      const progress = getProgress(goal.currentValue, goal.targetValue);
      const isDragging = draggingId === nodeId;

      return (
        <div
          key={nodeId}
          className={cn(
            "absolute rounded-xl text-left shadow-lg transition-shadow select-none",
            isDragging
              ? "shadow-2xl ring-2 ring-[#4573D2] z-50"
              : selectedMapGoalId === nodeId
                ? "ring-2 ring-[#4573D2] ring-offset-2"
                : "hover:shadow-xl hover:ring-1 hover:ring-white/30",
            mapEditMode && "cursor-grab active:cursor-grabbing"
          )}
          style={{
            left: pos.x,
            top: pos.y,
            width: NODE_W,
            height: NODE_H,
            backgroundColor: "#1e2a2a",
            zIndex: isDragging ? 50 : 1,
            transition: isDragging ? "none" : "box-shadow 0.2s",
          }}
          onMouseDown={(e) => handleMouseDown(e, nodeId)}
          onClick={(e) => {
            if (mapEditMode) return;
            e.stopPropagation();
            setSelectedMapGoalId(nodeId);
          }}
        >
          {/* n8n-style connection handle - top */}
          <div className="absolute -top-[6px] left-1/2 -translate-x-1/2 h-[12px] w-[12px] rounded-full border-2 border-gray-500 bg-[#1e2a2a] z-10" />
          {/* n8n-style connection handle - bottom */}
          <div className="absolute -bottom-[6px] left-1/2 -translate-x-1/2 h-[12px] w-[12px] rounded-full border-2 border-gray-500 bg-[#1e2a2a] z-10" />

          <div className="px-6 py-4 h-full flex flex-col justify-between">
            <div className="flex items-center gap-3">
              <Target className="h-5 w-5 text-emerald-400 shrink-0" />
              <span className="text-base font-semibold text-white truncate">{goal.name}</span>
              <span className="ml-auto text-xs text-white/60 font-medium shrink-0">{progress}%</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="h-2.5 flex-1 rounded-full bg-white/15 overflow-hidden">
                <div
                  className="h-2.5 rounded-full transition-all"
                  style={{ width: `${Math.max(progress, 2)}%`, backgroundColor: config.color }}
                />
              </div>
            </div>
            <div className="flex items-center gap-2.5">
              <span
                className="rounded-full px-3 py-0.5 text-[11px] font-semibold text-white"
                style={{ backgroundColor: config.color }}
              >
                {config.label}
              </span>
              {goal.team && (
                <span className="text-[11px] text-white/40">{goal.team.name}</span>
              )}
            </div>
          </div>
        </div>
      );
    };

    return (
      <div
        ref={mapContainerRef}
        className="relative overflow-auto flex justify-center"
        style={{ minHeight: svgHeight }}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        <div className="relative" style={{ width: svgWidth, height: svgHeight }}>
          {/* SVG connection lines layer */}
          <svg
            className="pointer-events-none absolute inset-0"
            width={svgWidth}
            height={svgHeight}
            style={{ zIndex: 0 }}
          >
            {/* Bezier curves between consecutive parent nodes */}
            {parentPositions.map((defPos, i) => {
              if (i === 0) return null;
              const prev = parentPositions[i - 1];
              const prevGoal = allGoals.find((g) => g.id === prev.id);
              const prevHasChildren = prevGoal && prevGoal.children.length > 0;

              let fromY: number;
              let fromX: number;
              if (prevHasChildren) {
                const childDefs = defaultPositions.filter((p) => p.parentId === prev.id);
                const midChild = childDefs[Math.floor(childDefs.length / 2)];
                const midPos = getNodePos(midChild.id);
                fromX = midPos.x + NODE_W / 2;
                fromY = midPos.y + NODE_H + 6;
              } else {
                const prevPos = getNodePos(prev.id);
                fromX = prevPos.x + NODE_W / 2;
                fromY = prevPos.y + NODE_H + 6;
              }
              const curPos = getNodePos(defPos.id);
              const toX = curPos.x + NODE_W / 2;
              const toY = curPos.y - 6;
              const midY = (fromY + toY) / 2;

              return (
                <path
                  key={`parent-${prev.id}-${defPos.id}`}
                  d={`M ${fromX} ${fromY} C ${fromX} ${midY}, ${toX} ${midY}, ${toX} ${toY}`}
                  fill="none"
                  stroke="#6b7280"
                  strokeWidth="2"
                  opacity={0.5}
                />
              );
            })}

            {/* Bezier curves from parent to children */}
            {allGoals.map((goal) => {
              if (goal.children.length === 0) return null;
              const parentPos = getNodePos(goal.id);
              const fromX = parentPos.x + NODE_W / 2;
              const fromY = parentPos.y + NODE_H + 6;

              return goal.children.map((child) => {
                const childPos = getNodePos(child.id);
                const toX = childPos.x + NODE_W / 2;
                const toY = childPos.y - 6;
                const midY = (fromY + toY) / 2;

                return (
                  <path
                    key={`child-${goal.id}-${child.id}`}
                    d={`M ${fromX} ${fromY} C ${fromX} ${midY}, ${toX} ${midY}, ${toX} ${toY}`}
                    fill="none"
                    stroke="#6b7280"
                    strokeWidth="2"
                    opacity={0.5}
                  />
                );
              });
            })}
          </svg>

          {/* Node cards layer */}
          {allGoals.map((goal) => renderNode(goal, goal.id))}
          {allGoals.flatMap((goal) =>
            goal.children.map((child) => renderNode(child, child.id))
          )}
        </div>

        {/* Add goal button at bottom */}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2">
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 text-xs"
            onClick={() => setCreateOpen(true)}
          >
            <Plus className="h-3.5 w-3.5" />
            Add goal
          </Button>
        </div>
      </div>
    );
  };

  const renderGoalDetailPanel = () => {
    if (!selectedMapGoalId) return null;

    // Find goal in all goals (including children)
    let goal: any = goals?.find((g) => g.id === selectedMapGoalId);
    if (!goal) {
      for (const g of goals || []) {
        const child = g.childGoals?.find((c: any) => c.id === selectedMapGoalId);
        if (child) {
          goal = child;
          break;
        }
      }
    }
    if (!goal) return null;

    const config = STATUS_CONFIG[goal.status] || STATUS_CONFIG.ON_TRACK;
    const progress = getProgress(goal.currentValue, goal.targetValue);
    const ownerName = (goal as any).owner?.name || session?.user?.name || "—";
    const tp = formatTimePeriod((goal as any).timePeriodStart, (goal as any).timePeriodEnd);

    return (
      <div className="w-[380px] shrink-0 overflow-y-auto border-l bg-white">
        {/* Panel header */}
        <div className="flex items-center justify-between border-b px-4 py-3">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Target className="h-3.5 w-3.5 text-[#4573D2]" />
            <span>View goal</span>
          </div>
          <button
            onClick={() => setSelectedMapGoalId(null)}
            className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-[#1e1f21]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          {/* Goal name */}
          <h2 className="text-lg font-semibold text-[#1e1f21]">{goal.name}</h2>

          {/* Progress */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-muted-foreground">Progress</span>
              <span className="text-xs font-medium" style={{ color: config.color }}>
                {progress}%
              </span>
            </div>
            <div className="h-2 w-full rounded-full bg-gray-100">
              <div
                className="h-2 rounded-full transition-all"
                style={{ width: `${progress}%`, backgroundColor: config.color }}
              />
            </div>
          </div>

          {/* Fields */}
          <div className="space-y-3 rounded-lg border p-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Goal owner</span>
              <span className="text-xs font-medium text-[#1e1f21]">{ownerName}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Time period</span>
              <span className="text-xs font-medium text-[#1e1f21]">{tp || "—"}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Accountable team</span>
              <span className="text-xs font-medium text-[#1e1f21]">
                {goal.team?.name || "My workspace"}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Status</span>
              <span
                className="rounded-full px-2 py-0.5 text-[10px] font-medium text-white"
                style={{ backgroundColor: config.color }}
              >
                {config.label}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Due deliverables</span>
              <span className="text-xs text-muted-foreground italic">no deliverables set</span>
            </div>
          </div>

          {/* Share a status update */}
          <div className="rounded-lg border p-3">
            <h3 className="mb-2 text-xs font-medium text-[#1e1f21]">Share a status update</h3>
            <Textarea
              placeholder="How is this goal progressing?"
              value={statusUpdateText}
              onChange={(e) => setStatusUpdateText(e.target.value)}
              className="min-h-[60px] text-sm resize-none mb-2"
            />
            <div className="flex justify-end">
              <Button
                size="sm"
                className="h-7 text-xs bg-[#4573D2] hover:bg-[#3A63B8]"
                disabled={!statusUpdateText.trim()}
                onClick={() => {
                  toast.success("Status update shared");
                  setStatusUpdateText("");
                }}
              >
                Update status
              </Button>
            </div>
          </div>

          {/* Description */}
          {goal.description && (
            <div className="rounded-lg border p-3">
              <h3 className="mb-1 text-xs font-medium text-[#1e1f21]">Description</h3>
              <p className="text-sm text-muted-foreground">{goal.description}</p>
            </div>
          )}

          {/* Quick actions */}
          <div className="flex gap-2">
            <Link
              href={`/goals/${goal.id}`}
              className="flex-1"
            >
              <Button variant="outline" size="sm" className="w-full gap-1.5 text-xs">
                <FileText className="h-3 w-3" />
                View full details
              </Button>
            </Link>
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 text-xs"
              onClick={() => {
                const next = goal.status === "ON_TRACK" ? "AT_RISK" : goal.status === "AT_RISK" ? "OFF_TRACK" : goal.status === "OFF_TRACK" ? "CLOSED" : "ON_TRACK";
                updateGoal.mutate({ id: goal.id, status: next });
              }}
            >
              <CheckCircle2 className="h-3 w-3" />
              Status
            </Button>
          </div>

          {/* Comment input */}
          <div className="rounded-lg border p-3">
            <div className="flex items-start gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#4573D2] text-white text-[10px] font-medium shrink-0 mt-0.5">
                {session?.user?.name?.charAt(0).toUpperCase() || "U"}
              </div>
              <Input
                placeholder="Ask a question or share a thought..."
                className="text-sm border-0 shadow-none px-0 focus-visible:ring-0"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && (e.target as HTMLInputElement).value.trim()) {
                    toast.success("Comment posted");
                    (e.target as HTMLInputElement).value = "";
                  }
                }}
              />
            </div>
          </div>
        </div>
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
            Create goal
          </Button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-1 border-b bg-white px-6 py-1">
          {([
            { key: "map" as GoalTab, label: "Strategy map", icon: Network },
            { key: "team" as GoalTab, label: "Team goals" },
            { key: "my" as GoalTab, label: "My goals" },
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
          <Button
            variant="ghost"
            size="sm"
            className="text-xs text-muted-foreground"
            onClick={() => toast("Custom views coming soon")}
          >
            <Plus className="h-3.5 w-3.5" />
          </Button>
        </div>

        {activeTab === "map" ? (
          <div className="flex flex-1 overflow-hidden">
            {/* Strategy map area */}
            <div className="flex-1 overflow-y-auto p-6">
              {/* Toolbar */}
              <div className="mb-4 flex items-center gap-2 flex-wrap">
                <Button
                  size="sm"
                  className="gap-1.5 bg-[#4573D2] hover:bg-[#3A63B8] text-xs"
                  onClick={() => setCreateOpen(true)}
                >
                  <Plus className="h-3.5 w-3.5" />
                  Create goal
                </Button>
                <div className="h-5 w-px bg-gray-200 mx-1" />
                <Button variant="outline" size="sm" className="gap-1.5 text-xs h-8">
                  <Calendar className="h-3.5 w-3.5" />
                  Time periods: All
                </Button>
                <div className="flex-1" />
                <button
                  onClick={() => {
                    setMapEditMode((prev) => !prev);
                    toast(mapEditMode ? "View mode: click nodes to see details" : "Edit mode: drag nodes to rearrange");
                  }}
                  className={cn(
                    "flex items-center gap-1.5 rounded-md px-2 py-1 text-xs transition-colors",
                    mapEditMode
                      ? "bg-[#4573D2] text-white"
                      : "text-muted-foreground hover:bg-muted hover:text-[#1e1f21]"
                  )}
                >
                  <Pencil className="h-3.5 w-3.5" />
                  {mapEditMode ? "Editing" : "Edit"}
                </button>
              </div>

              {/* Mission header */}
              <div className="mb-6 text-center">
                <h2 className="text-base font-medium text-[#1e1f21]">Our mission: My workspace</h2>
              </div>
              {goals && goals.length > 0 ? (
                renderStrategyMap()
              ) : (
                <div className="flex flex-col items-center justify-center py-16">
                  <div className="mb-6 rounded-2xl bg-blue-600 p-8">
                    <div className="flex items-end gap-1">
                      <div className="h-12 w-4 rounded bg-white/80" />
                      <div className="h-20 w-4 rounded bg-white/90" />
                      <div className="h-8 w-4 rounded bg-white/70" />
                    </div>
                    <div className="mt-2 flex items-center gap-1">
                      <div className="h-2 w-2 rounded-full bg-red-400" />
                      <div className="h-px w-6 bg-white/50" />
                    </div>
                  </div>
                  <h3 className="text-lg font-medium text-[#1e1f21]">Create goals to build your strategy map</h3>
                  <p className="mt-1 max-w-sm text-center text-sm text-muted-foreground">
                    Goals you create will appear here as a visual hierarchy of your team&apos;s strategy.
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

            {/* Goal detail side panel */}
            {selectedMapGoalId && renderGoalDetailPanel()}
          </div>
        ) : activeTab === "my" || activeTab === "team" ? (
          renderGoalTable(activeTab)
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
              Set and track goals
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
            <DialogTitle>Add company goal</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4">
            {/* Goal title */}
            <div className="space-y-2">
              <Label htmlFor="goal-name">Goal title</Label>
              <Input
                id="goal-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Increase revenue by 20%"
                autoFocus
              />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="goal-desc">Description</Label>
              <Textarea
                id="goal-desc"
                value={newGoalDescription}
                onChange={(e) => setNewGoalDescription(e.target.value)}
                placeholder="What is this goal about?"
                className="min-h-[70px] text-sm resize-none"
              />
            </div>

            {/* Owner + Time period + Privacy row */}
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-2">
                <Label>Goal owner</Label>
                {members && members.length > 0 ? (
                  <Select value={goalOwner} onValueChange={setGoalOwner}>
                    <SelectTrigger className="truncate">
                      <SelectValue placeholder="Select owner" />
                    </SelectTrigger>
                    <SelectContent>
                      {members.map((m) => (
                        <SelectItem key={m.user.id} value={m.user.id}>
                          {m.user.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input placeholder="Owner" disabled />
                )}
              </div>
              <div className="space-y-2">
                <Label>Time period</Label>
                <Select value={timePeriod} onValueChange={setTimePeriod}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select period" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="FY">Full Year</SelectItem>
                    <SelectItem value="Q1">Q1 FY26</SelectItem>
                    <SelectItem value="Q2">Q2 FY26</SelectItem>
                    <SelectItem value="Q3">Q3 FY26</SelectItem>
                    <SelectItem value="Q4">Q4 FY26</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Privacy</Label>
                <Select value={goalPrivacy} onValueChange={(v) => setGoalPrivacy(v as any)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PUBLIC">Public</SelectItem>
                    <SelectItem value="PRIVATE">Private</SelectItem>
                    <SelectItem value="TEAM_ONLY">Team only</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Members */}
            {members && members.length > 0 && (
              <div className="space-y-2">
                <Label>Members</Label>
                <div className="flex flex-wrap gap-1.5 min-h-[36px] rounded-md border p-1.5">
                  {goalMembers.map((mId) => {
                    const member = members.find(m => m.user.id === mId);
                    return member ? (
                      <span key={mId} className="flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs">
                        {member.user.name}
                        <button onClick={() => setGoalMembers(prev => prev.filter(id => id !== mId))}>
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    ) : null;
                  })}
                  <select
                    className="h-6 flex-1 min-w-[100px] border-none bg-transparent text-xs focus:outline-none"
                    value=""
                    onChange={(e) => {
                      if (e.target.value && !goalMembers.includes(e.target.value)) {
                        setGoalMembers(prev => [...prev, e.target.value]);
                      }
                    }}
                  >
                    <option value="">Add member...</option>
                    {members.filter(m => !goalMembers.includes(m.user.id)).map((m) => (
                      <option key={m.user.id} value={m.user.id}>{m.user.name}</option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            {/* Notify checkbox */}
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="notify-checkbox"
                checked={notifyOnStatusChange}
                onChange={(e) => setNotifyOnStatusChange(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-[#4573D2]"
              />
              <Label htmlFor="notify-checkbox" className="text-sm font-normal cursor-pointer">
                <Bell className="mr-1 inline h-3.5 w-3.5 text-muted-foreground" />
                Notify new members about joining this goal
              </Label>
            </div>

            <p className="text-[11px] text-muted-foreground leading-relaxed">
              Tipping: You can link team member email and project linkages while creating this goal.
            </p>

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
                {createGoal.isPending ? "Saving..." : "Save goal"}
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
