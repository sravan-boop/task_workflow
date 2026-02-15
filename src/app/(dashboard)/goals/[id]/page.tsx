"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
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
} from "lucide-react";

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

  const [editingName, setEditingName] = useState(false);
  const [nameValue, setNameValue] = useState("");
  const [editingProgress, setEditingProgress] = useState(false);
  const [progressValue, setProgressValue] = useState("");

  const updateGoal = trpc.goals.update.useMutation({
    onSuccess: () => {
      utils.goals.get.invalidate({ id: goalId });
      utils.goals.list.invalidate();
      setEditingName(false);
      setEditingProgress(false);
    },
  });

  const deleteGoal = trpc.goals.delete.useMutation({
    onSuccess: () => {
      utils.goals.list.invalidate();
      toast.success("Goal deleted");
      router.push("/goals");
    },
  });

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
      <div className="flex h-14 items-center gap-3 border-b bg-white px-6">
        <Link href="/goals" className="text-muted-foreground hover:text-[#1e1f21]">
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Link href="/goals" className="hover:text-[#1e1f21]">Goals</Link>
          <ChevronRight className="h-3 w-3" />
          <span className="text-[#1e1f21] font-medium truncate max-w-[300px]">{goal.name}</span>
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
                className="group flex cursor-pointer items-center gap-2 text-xl font-semibold text-[#1e1f21]"
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
          <h2 className="mb-4 text-sm font-medium text-[#6d6e6f]">Progress</h2>
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <div className="h-3 w-full rounded-full bg-gray-100">
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
          <h2 className="mb-4 text-sm font-medium text-[#6d6e6f]">Details</h2>
          <div className="space-y-3">
            {/* Owner */}
            <div className="flex items-center">
              <span className="w-36 text-sm text-muted-foreground">Goal owner</span>
              <span className="text-sm">{goal.ownerId ? "Assigned" : "Not set"}</span>
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
              <span className="text-sm">{goal.team?.name || "No team"}</span>
            </div>
            {/* Description */}
            <div className="flex items-start">
              <span className="w-36 pt-1 text-sm text-muted-foreground">Description</span>
              <span className="text-sm text-[#1e1f21]">{goal.description || "No description"}</span>
            </div>
          </div>
        </div>

        {/* Sub-goals */}
        {goal.childGoals && goal.childGoals.length > 0 && (
          <div className="mt-8">
            <h2 className="mb-3 text-sm font-medium text-[#6d6e6f]">
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
                      <p className="text-sm font-medium text-[#1e1f21] truncate">{sub.name}</p>
                      <div className="mt-1 flex items-center gap-2">
                        <div className="h-1.5 w-32 rounded-full bg-gray-100">
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
