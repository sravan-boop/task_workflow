"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ArrowLeft,
  Target,
  ChevronRight,
  Pencil,
  Trash2,
  Sparkles,
  User,
  Users,
  ThumbsUp,
  ThumbsDown,
  MessageSquare,
} from "lucide-react";
import { cn } from "@/lib/utils";

const STATUS_CONFIG: Record<string, { color: string; bg: string; label: string }> = {
  ON_TRACK: { color: "#7BC86C", bg: "bg-green-50", label: "On track" },
  AT_RISK: { color: "#FD9A00", bg: "bg-orange-50", label: "At risk" },
  OFF_TRACK: { color: "#E8384F", bg: "bg-red-50", label: "Off track" },
  CLOSED: { color: "#6D6E6F", bg: "bg-gray-50", label: "Closed" },
};

export default function GoalDetailPage() {
  const params = useParams();
  const router = useRouter();
  const goalId = params.id as string;

  const { data: goalData, isLoading } = trpc.goals.get.useQuery({ id: goalId });
  const goal = goalData as any;
  const utils = trpc.useUtils();

  const { data: workspaces } = trpc.workspaces.list.useQuery();
  const workspaceId = workspaces?.[0]?.id;
  const { data: members } = trpc.workspaces.getMembers.useQuery(
    { workspaceId: workspaceId! },
    { enabled: !!workspaceId }
  );
  const { data: teams } = trpc.teams.list.useQuery(
    { workspaceId: workspaceId! },
    { enabled: !!workspaceId }
  );

  const [ownerOpen, setOwnerOpen] = useState(false);
  const [ownerSearch, setOwnerSearch] = useState("");
  const [teamOpen, setTeamOpen] = useState(false);

  const [editingName, setEditingName] = useState(false);
  const [nameValue, setNameValue] = useState("");
  const [editingProgress, setEditingProgress] = useState(false);
  const [progressValue, setProgressValue] = useState("");
  const [descriptionValue, setDescriptionValue] = useState<string | null>(null);
  const [aiSuggestions, setAiSuggestions] = useState<string[]>([]);
  const [loadingAi, setLoadingAi] = useState(false);
  const [aiFeedback, setAiFeedback] = useState<Record<number, "up" | "down">>({});
  const [showFeedbackBox, setShowFeedbackBox] = useState(false);
  const [feedbackText, setFeedbackText] = useState("");

  const updateGoal = trpc.goals.update.useMutation({
    onSuccess: () => {
      utils.goals.get.invalidate({ id: goalId });
      utils.goals.list.invalidate();
      setEditingName(false);
      setEditingProgress(false);
    },
  });

  // Silent auto-save for description (no toast)
  const autoSaveDescription = trpc.goals.update.useMutation({
    onSuccess: () => utils.goals.get.invalidate({ id: goalId }),
  });

  const deleteGoal = trpc.goals.delete.useMutation({
    onSuccess: () => {
      utils.goals.list.invalidate();
      toast.success("Goal deleted");
      router.push("/goals");
    },
  });

  const aiChat = trpc.ai.chat.useMutation();

  // Debounced auto-save for description
  useEffect(() => {
    if (descriptionValue === null || !goal) return;
    if (descriptionValue === (goal.description ?? "")) return;
    const timer = setTimeout(() => {
      autoSaveDescription.mutate({ id: goalId, description: descriptionValue });
    }, 1500);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [descriptionValue]);

  const generateAiSuggestions = async () => {
    if (!goal) return;
    setLoadingAi(true);
    const statusLabel = STATUS_CONFIG[goal.status]?.label || goal.status;
    const progress = goal.targetValue > 0 ? Math.round((goal.currentValue / goal.targetValue) * 100) : 0;
    const contextParts = [
      `Goal: "${goal.name}"`,
      `Status: ${statusLabel}`,
      `Progress: ${progress}% (${goal.currentValue} / ${goal.targetValue})`,
      goal.description ? `Description: ${goal.description}` : "",
      goal.team?.name ? `Team: ${goal.team.name}` : "",
    ].filter(Boolean).join("\n");
    try {
      const result = await aiChat.mutateAsync({
        message: `You are a strategic advisor. Given the following goal and its current state, provide exactly 4 practical strategies or recommendations on how to achieve this goal. Focus on implementation steps, potential challenges to watch for, and concrete approaches the team can take. Each suggestion should be 1-2 sentences of actionable advice. Return ONLY a JSON array of 4 strings, no markdown, no code fences, no explanation.\n\n${contextParts}`,
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
      setAiSuggestions(suggestions);
    } catch (err: any) {
      toast.error(err.message || "AI suggestion generation failed. Check your API key configuration.");
    } finally {
      setLoadingAi(false);
    }
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <Skeleton className="mb-4 h-8 w-64" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  if (!goal) {
    return (
      <div className="flex items-center justify-center p-12">
        <p className="text-muted-foreground">Goal not found</p>
      </div>
    );
  }

  const config = STATUS_CONFIG[goal.status] || STATUS_CONFIG.ON_TRACK;
  const progress = goal.targetValue > 0 ? Math.round((goal.currentValue / goal.targetValue) * 100) : 0;

  return (
    <div className="h-full">
      <div className="flex h-14 items-center gap-3 border-b bg-white dark:bg-card px-6">
        <Link href="/goals" className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Link href="/goals" className="hover:text-foreground">Goals</Link>
          <ChevronRight className="h-3 w-3" />
          <span className="text-foreground font-medium truncate max-w-[300px]">{goal.name}</span>
        </div>
      </div>

      <div className="mx-auto max-w-3xl p-6">
        {/* Goal Header */}
        <div className="flex items-start gap-4">
          <Target className="mt-1 h-6 w-6 shrink-0" style={{ color: config.color }} />
          <div className="flex-1">
            {editingName ? (
              <div className="flex items-center gap-2">
                <Input
                  value={nameValue}
                  onChange={(e) => setNameValue(e.target.value)}
                  className="text-xl font-semibold"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      updateGoal.mutate({ id: goalId, name: nameValue });
                    }
                    if (e.key === "Escape") setEditingName(false);
                  }}
                />
                <Button size="sm" onClick={() => updateGoal.mutate({ id: goalId, name: nameValue })}>
                  Save
                </Button>
              </div>
            ) : (
              <h1
                className="group flex cursor-pointer items-center gap-2 text-xl font-semibold text-foreground"
                onClick={() => { setEditingName(true); setNameValue(goal.name); }}
              >
                {goal.name}
                <Pencil className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100" />
              </h1>
            )}
            <div className="mt-1 flex items-center gap-3">
              <span
                className="rounded-full px-2 py-0.5 text-xs font-medium text-white"
                style={{ backgroundColor: config.color }}
              >
                {config.label}
              </span>
              {goal.team && (
                <span className="text-sm text-muted-foreground">{goal.team.name}</span>
              )}
              {goal.parentGoal && (
                <Link
                  href={`/goals/${goal.parentGoal.id}`}
                  className="text-sm text-[#4573D2] hover:underline"
                >
                  Parent: {goal.parentGoal.name}
                </Link>
              )}
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-destructive"
            onClick={() => {
              if (window.confirm(`Delete goal "${goal.name}"?`)) {
                deleteGoal.mutate({ id: goalId });
              }
            }}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>

        {/* Status & Progress */}
        <div className="mt-8 rounded-lg border p-5">
          <h2 className="mb-4 text-sm font-medium text-muted-foreground">Progress</h2>
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <div className="h-3 w-full rounded-full bg-gray-100 dark:bg-muted">
                <div
                  className="h-3 rounded-full transition-all"
                  style={{ width: `${Math.min(progress, 100)}%`, backgroundColor: config.color }}
                />
              </div>
            </div>
            <span className="text-lg font-semibold" style={{ color: config.color }}>
              {progress}%
            </span>
          </div>
          <div className="mt-4 flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Current:</span>
              {editingProgress ? (
                <div className="flex items-center gap-1">
                  <Input
                    type="number"
                    value={progressValue}
                    onChange={(e) => setProgressValue(e.target.value)}
                    className="h-7 w-20 text-sm"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        updateGoal.mutate({ id: goalId, currentValue: parseFloat(progressValue) || 0 });
                      }
                      if (e.key === "Escape") setEditingProgress(false);
                    }}
                  />
                  <Button size="sm" className="h-7" onClick={() => updateGoal.mutate({ id: goalId, currentValue: parseFloat(progressValue) || 0 })}>
                    Save
                  </Button>
                </div>
              ) : (
                <button
                  className="rounded px-2 py-0.5 text-sm font-medium hover:bg-muted"
                  onClick={() => { setEditingProgress(true); setProgressValue(String(goal.currentValue)); }}
                >
                  {goal.currentValue}
                </button>
              )}
              <span className="text-sm text-muted-foreground">/ {goal.targetValue}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Status:</span>
              <Select
                value={goal.status}
                onValueChange={(val) => updateGoal.mutate({ id: goalId, status: val as any })}
              >
                <SelectTrigger className="h-7 w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
                    <SelectItem key={key} value={key}>
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-2 rounded-full" style={{ backgroundColor: cfg.color }} />
                        {cfg.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Goal Details */}
        <div className="mt-6 rounded-lg border p-5">
          <h2 className="mb-4 text-sm font-medium text-muted-foreground">Details</h2>
          <div className="space-y-3">
            {/* Owner */}
            <div className="flex items-center">
              <span className="w-36 text-sm text-muted-foreground">Goal owner</span>
              <Popover open={ownerOpen} onOpenChange={(open) => { setOwnerOpen(open); if (!open) setOwnerSearch(""); }}>
                <PopoverTrigger asChild>
                  <button className="flex items-center gap-2 rounded px-2 py-1 hover:bg-muted/50">
                    {goal.owner ? (
                      <>
                        <Avatar className="h-6 w-6">
                          <AvatarFallback className="bg-[#4573D2] text-[10px] text-white">
                            {goal.owner.name?.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2)}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-sm">{goal.owner.name}</span>
                      </>
                    ) : (
                      <>
                        <User className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">Assign owner</span>
                      </>
                    )}
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-60 p-2" align="start">
                  <Input
                    value={ownerSearch}
                    onChange={(e) => setOwnerSearch(e.target.value)}
                    placeholder="Search people..."
                    className="mb-2 h-7 text-sm"
                    autoFocus
                  />
                  <div className="max-h-48 overflow-y-auto">
                    {members
                      ?.filter((m) =>
                        m.user.name?.toLowerCase().includes(ownerSearch.toLowerCase())
                      )
                      .map((m) => (
                        <button
                          key={m.user.id}
                          className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-muted/50"
                          onClick={() => {
                            updateGoal.mutate({ id: goalId, ownerId: m.user.id });
                            setOwnerOpen(false);
                            setOwnerSearch("");
                          }}
                        >
                          <Avatar className="h-5 w-5">
                            <AvatarFallback className="bg-[#4573D2] text-[8px] text-white">
                              {m.user.name?.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2)}
                            </AvatarFallback>
                          </Avatar>
                          {m.user.name}
                          {goal.ownerId === m.user.id && (
                            <span className="ml-auto text-[10px] text-[#4573D2]">Current</span>
                          )}
                        </button>
                      ))}
                    {members?.filter((m) =>
                      m.user.name?.toLowerCase().includes(ownerSearch.toLowerCase())
                    ).length === 0 && (
                      <p className="px-2 py-1.5 text-xs text-muted-foreground">No people found</p>
                    )}
                  </div>
                </PopoverContent>
              </Popover>
            </div>
            {/* Time Period */}
            <div className="flex items-center">
              <span className="w-36 text-sm text-muted-foreground">Time period</span>
              <div className="flex items-center gap-2">
                <input
                  type="date"
                  className="rounded border border-transparent bg-transparent px-2 py-1 text-sm hover:border-gray-200 focus:border-[#4573D2] focus:outline-none"
                  value={goal.timePeriodStart ? new Date(goal.timePeriodStart).toISOString().split("T")[0] : ""}
                  onChange={(e) => {
                    const val = e.target.value;
                    updateGoal.mutate({ id: goalId, timePeriodStart: val ? new Date(val + "T00:00:00.000Z").toISOString() : undefined } as any);
                  }}
                />
                <span className="text-xs text-muted-foreground">to</span>
                <input
                  type="date"
                  className="rounded border border-transparent bg-transparent px-2 py-1 text-sm hover:border-gray-200 focus:border-[#4573D2] focus:outline-none"
                  value={goal.timePeriodEnd ? new Date(goal.timePeriodEnd).toISOString().split("T")[0] : ""}
                  onChange={(e) => {
                    const val = e.target.value;
                    updateGoal.mutate({ id: goalId, timePeriodEnd: val ? new Date(val + "T00:00:00.000Z").toISOString() : undefined } as any);
                  }}
                />
              </div>
            </div>
            {/* Accountable Team */}
            <div className="flex items-center">
              <span className="w-36 text-sm text-muted-foreground">Accountable team</span>
              <Popover open={teamOpen} onOpenChange={setTeamOpen}>
                <PopoverTrigger asChild>
                  <button className="flex items-center gap-2 rounded px-2 py-1 hover:bg-muted/50">
                    {goal.team ? (
                      <>
                        <Users className="h-4 w-4 text-[#4573D2]" />
                        <span className="text-sm">{goal.team.name}</span>
                      </>
                    ) : (
                      <>
                        <Users className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">Select team</span>
                      </>
                    )}
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-56 p-1" align="start">
                  <button
                    className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-muted/50"
                    onClick={() => {
                      updateGoal.mutate({ id: goalId, teamId: null });
                      setTeamOpen(false);
                    }}
                  >
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">No team</span>
                  </button>
                  {teams?.map((team) => (
                    <button
                      key={team.id}
                      className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-muted/50"
                      onClick={() => {
                        updateGoal.mutate({ id: goalId, teamId: team.id });
                        setTeamOpen(false);
                      }}
                    >
                      <Users className="h-4 w-4 text-[#4573D2]" />
                      <span className="flex-1 text-left">{team.name}</span>
                      <span className="text-[10px] text-muted-foreground">{team._count?.members ?? 0} members</span>
                    </button>
                  ))}
                  {(!teams || teams.length === 0) && (
                    <p className="px-2 py-1.5 text-xs text-muted-foreground">No teams available</p>
                  )}
                </PopoverContent>
              </Popover>
            </div>
            {/* Description */}
            <div className="flex items-start">
              <span className="w-36 pt-1 text-sm text-muted-foreground">Description</span>
              <div className="flex-1">
                <Textarea
                  value={descriptionValue ?? goal.description ?? ""}
                  onChange={(e) => setDescriptionValue(e.target.value)}
                  onBlur={(e) => {
                    const val = e.target.value;
                    if (val !== (goal.description ?? "")) {
                      updateGoal.mutate({ id: goalId, description: val });
                      toast.success("Description saved");
                    }
                  }}
                  placeholder="Add a description for this goal..."
                  className="min-h-[80px] text-sm resize-none"
                />
              </div>
            </div>
          </div>
        </div>

        {/* AI Suggestions */}
        <div className="mt-6 rounded-lg border p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-[#4573D2]" />
              <h2 className="text-sm font-medium text-muted-foreground">AI Suggestions</h2>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 text-xs"
              onClick={() => generateAiSuggestions()}
              disabled={loadingAi}
            >
              <Sparkles className="h-3.5 w-3.5" />
              {loadingAi ? "Generating..." : "Get suggestions"}
            </Button>
          </div>
          {aiSuggestions.length > 0 ? (
            <div className="space-y-2.5">
              {aiSuggestions.map((suggestion, i) => (
                <div key={i} className="rounded-lg bg-blue-50/70 dark:bg-blue-950/30 p-3.5 text-sm">
                  <div className="flex items-start gap-2.5">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#4573D2] text-[10px] font-semibold text-white shrink-0 mt-0.5">
                      {i + 1}
                    </span>
                    <span className="flex-1 text-foreground leading-relaxed">{suggestion}</span>
                  </div>
                  <div className="mt-2 flex items-center gap-1 pl-7">
                    <button
                      className={cn(
                        "rounded p-1 hover:bg-green-100 dark:hover:bg-green-900/30",
                        aiFeedback[i] === "up" ? "bg-green-100 dark:bg-green-900/30 text-green-600" : "text-muted-foreground"
                      )}
                      onClick={() => {
                        setAiFeedback((prev) => ({ ...prev, [i]: "up" }));
                        toast.success("Thanks for the feedback!");
                      }}
                      title="Helpful"
                    >
                      <ThumbsUp className="h-3 w-3" />
                    </button>
                    <button
                      className={cn(
                        "rounded p-1 hover:bg-red-100 dark:hover:bg-red-900/30",
                        aiFeedback[i] === "down" ? "bg-red-100 dark:bg-red-900/30 text-red-600" : "text-muted-foreground"
                      )}
                      onClick={() => {
                        setAiFeedback((prev) => ({ ...prev, [i]: "down" }));
                        toast.info("Feedback noted. We'll improve suggestions.");
                      }}
                      title="Not helpful"
                    >
                      <ThumbsDown className="h-3 w-3" />
                    </button>
                    <div className="mx-1 h-3 w-px bg-gray-200 dark:bg-gray-700" />
                    <button
                      className="rounded px-1.5 py-0.5 text-[10px] text-green-600 hover:bg-green-100 dark:hover:bg-green-900/30"
                      onClick={() => {
                        const currentDesc = descriptionValue ?? goal.description ?? "";
                        const newDesc = currentDesc
                          ? `${currentDesc}\n• ${suggestion}`
                          : `• ${suggestion}`;
                        setDescriptionValue(newDesc);
                        updateGoal.mutate({ id: goalId, description: newDesc });
                        setAiSuggestions((prev) => prev.filter((_, j) => j !== i));
                        toast.success("Suggestion applied to description");
                      }}
                    >
                      Apply
                    </button>
                    <button
                      className="rounded px-1.5 py-0.5 text-[10px] text-muted-foreground hover:bg-muted"
                      onClick={() => {
                        setAiSuggestions((prev) => prev.filter((_, j) => j !== i));
                      }}
                    >
                      Dismiss
                    </button>
                  </div>
                </div>
              ))}

              {/* Feedback box */}
              {!showFeedbackBox ? (
                <button
                  className="flex items-center gap-1.5 text-[10px] text-muted-foreground hover:text-[#4573D2] mt-1"
                  onClick={() => setShowFeedbackBox(true)}
                >
                  <MessageSquare className="h-3 w-3" />
                  Share feedback on these suggestions
                </button>
              ) : (
                <div className="mt-2 space-y-2">
                  <Textarea
                    value={feedbackText}
                    onChange={(e) => setFeedbackText(e.target.value)}
                    placeholder="Tell us how we can improve these suggestions..."
                    className="min-h-[60px] text-xs resize-none"
                  />
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      className="h-6 text-[10px] bg-[#4573D2] hover:bg-[#3A63B8]"
                      onClick={() => {
                        console.log("[AI Feedback]", {
                          goalId,
                          goalName: goal.name,
                          feedback: feedbackText,
                          ratings: aiFeedback,
                          suggestions: aiSuggestions,
                          timestamp: new Date().toISOString(),
                        });
                        toast.success("Feedback received — thank you! Your input helps improve AI suggestions.");
                        setFeedbackText("");
                        setShowFeedbackBox(false);
                      }}
                      disabled={!feedbackText.trim()}
                    >
                      Submit feedback
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 text-[10px]"
                      onClick={() => setShowFeedbackBox(false)}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              )}
            </div>
          ) : !loadingAi ? (
            <p className="text-sm text-muted-foreground">
              Click &quot;Get suggestions&quot; to receive AI-powered recommendations for improving this goal.
            </p>
          ) : null}
        </div>

        {/* Sub-goals */}
        {goal.childGoals && goal.childGoals.length > 0 && (
          <div className="mt-8">
            <h2 className="mb-3 text-sm font-medium text-muted-foreground">
              Sub-goals ({goal.childGoals.length})
            </h2>
            <div className="space-y-2">
              {goal.childGoals.map((sub: any) => {
                const subConfig = STATUS_CONFIG[sub.status] || STATUS_CONFIG.ON_TRACK;
                const subProgress = sub.targetValue > 0 ? Math.round((sub.currentValue / sub.targetValue) * 100) : 0;
                return (
                  <Link
                    key={sub.id}
                    href={`/goals/${sub.id}`}
                    className="flex items-center gap-3 rounded-lg border px-4 py-3 transition-colors hover:bg-muted/30"
                  >
                    <Target className="h-4 w-4 shrink-0" style={{ color: subConfig.color }} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{sub.name}</p>
                      <div className="mt-1 flex items-center gap-2">
                        <div className="h-1.5 w-32 rounded-full bg-gray-100 dark:bg-muted">
                          <div
                            className="h-1.5 rounded-full"
                            style={{ width: `${subProgress}%`, backgroundColor: subConfig.color }}
                          />
                        </div>
                        <span className="text-[10px] text-muted-foreground">{subProgress}%</span>
                      </div>
                    </div>
                    <span
                      className="rounded-full px-2 py-0.5 text-[10px] font-medium text-white"
                      style={{ backgroundColor: subConfig.color }}
                    >
                      {subConfig.label}
                    </span>
                    {sub.team && (
                      <span className="text-xs text-muted-foreground">{sub.team.name}</span>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
