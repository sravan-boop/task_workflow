"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Zap, Plus, Trash2, Power } from "lucide-react";

interface RulesManagerProps {
  projectId: string;
}

const TRIGGER_TYPES = [
  { value: "TASK_ADDED", label: "Task Added" },
  { value: "TASK_MOVED", label: "Task Moved" },
  { value: "TASK_COMPLETED", label: "Task Completed" },
  { value: "FIELD_CHANGED", label: "Field Changed" },
  { value: "DUE_DATE_APPROACHING", label: "Due Date Approaching" },
] as const;

const ACTION_TYPES = [
  { value: "SET_ASSIGNEE", label: "Set Assignee" },
  { value: "MOVE_TO_SECTION", label: "Move to Section" },
  { value: "COMPLETE_TASK", label: "Complete Task" },
  { value: "ADD_COMMENT", label: "Add Comment" },
  { value: "SET_DUE_DATE", label: "Set Due Date" },
] as const;

type TriggerType = (typeof TRIGGER_TYPES)[number]["value"];
type ActionType = (typeof ACTION_TYPES)[number]["value"];

const TRIGGER_BADGE_COLORS: Record<TriggerType, string> = {
  TASK_ADDED:
    "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800",
  TASK_MOVED:
    "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-800",
  TASK_COMPLETED:
    "bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-950 dark:text-violet-300 dark:border-violet-800",
  FIELD_CHANGED:
    "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-800",
  DUE_DATE_APPROACHING:
    "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950 dark:text-rose-300 dark:border-rose-800",
};

function getTriggerLabel(value: string): string {
  return TRIGGER_TYPES.find((t) => t.value === value)?.label ?? value;
}

function getActionLabel(value: string): string {
  return ACTION_TYPES.find((a) => a.value === value)?.label ?? value;
}

export function RulesManager({ projectId }: RulesManagerProps) {
  const utils = trpc.useUtils();

  const { data: rules, isLoading } = trpc.rules.list.useQuery({ projectId });

  const createRule = trpc.rules.create.useMutation({
    onSuccess: () => {
      utils.rules.list.invalidate({ projectId });
      resetForm();
      setDialogOpen(false);
    },
  });

  const toggleRule = trpc.rules.toggle.useMutation({
    onSuccess: () => {
      utils.rules.list.invalidate({ projectId });
    },
  });

  const deleteRule = trpc.rules.delete.useMutation({
    onSuccess: () => {
      utils.rules.list.invalidate({ projectId });
    },
  });

  const [dialogOpen, setDialogOpen] = useState(false);
  const [ruleName, setRuleName] = useState("");
  const [triggerType, setTriggerType] = useState<TriggerType | "">("");
  const [actionType, setActionType] = useState<ActionType | "">("");
  const [actionConfig, setActionConfig] = useState("");

  function resetForm() {
    setRuleName("");
    setTriggerType("");
    setActionType("");
    setActionConfig("");
  }

  function handleCreate() {
    if (!ruleName.trim() || !triggerType || !actionType) return;

    createRule.mutate({
      projectId,
      name: ruleName.trim(),
      trigger: { type: triggerType },
      actions: [{ type: actionType, config: actionConfig.trim() || undefined }],
    });
  }

  function handleToggle(ruleId: string, currentActive: boolean) {
    toggleRule.mutate({ id: ruleId, isActive: !currentActive });
  }

  function handleDelete(ruleId: string) {
    deleteRule.mutate({ id: ruleId });
  }

  const isFormValid = ruleName.trim() && triggerType && actionType;

  // Loading skeleton
  if (isLoading) {
    return (
      <div className="space-y-3 p-6">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-20 animate-pulse rounded-lg border border-gray-100 bg-gray-50 dark:border-gray-800 dark:bg-gray-900"
          />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-orange-400 to-pink-500">
            <Zap className="h-4.5 w-4.5 text-white" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-[#1e1f21] dark:text-gray-100">
              Rules
            </h2>
            <p className="text-xs text-[#6d6e6f] dark:text-gray-400">
              Automate your workflow with custom rules
            </p>
          </div>
        </div>
        <Button
          onClick={() => setDialogOpen(true)}
          size="sm"
          className="gap-1.5 bg-[#4573D2] text-white hover:bg-[#3a63b8]"
        >
          <Plus className="h-3.5 w-3.5" />
          Create rule
        </Button>
      </div>

      {/* Rules List */}
      {!rules || rules.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-200 bg-gray-50/50 px-6 py-16 dark:border-gray-800 dark:bg-gray-900/50">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800">
            <Zap className="h-6 w-6 text-[#6d6e6f] dark:text-gray-400" />
          </div>
          <h3 className="mb-1 text-sm font-semibold text-[#1e1f21] dark:text-gray-200">
            No rules yet
          </h3>
          <p className="mb-5 max-w-sm text-center text-xs text-[#6d6e6f] dark:text-gray-400">
            Rules let you automate repetitive actions. When a trigger fires, the
            action runs automatically, saving your team time and effort.
          </p>
          <Button
            onClick={() => setDialogOpen(true)}
            variant="outline"
            size="sm"
            className="gap-1.5"
          >
            <Plus className="h-3.5 w-3.5" />
            Create your first rule
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          {rules.map((rule) => (
            <div
              key={rule.id}
              className={cn(
                "group relative rounded-lg border bg-white p-4 transition-all hover:shadow-sm dark:bg-gray-950",
                rule.isActive
                  ? "border-gray-200 dark:border-gray-800"
                  : "border-gray-100 bg-gray-50/50 opacity-60 dark:border-gray-800/50 dark:bg-gray-900/50"
              )}
            >
              <div className="flex items-start justify-between gap-4">
                {/* Left: Rule info */}
                <div className="min-w-0 flex-1 space-y-2">
                  <div className="flex items-center gap-2.5">
                    <Power
                      className={cn(
                        "h-4 w-4 shrink-0",
                        rule.isActive
                          ? "text-emerald-500"
                          : "text-[#cfcbcb] dark:text-gray-600"
                      )}
                    />
                    <span className="truncate text-sm font-medium text-[#1e1f21] dark:text-gray-100">
                      {rule.name}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 pl-6.5">
                    <Badge
                      variant="outline"
                      className={cn(
                        "text-[11px] font-medium",
                        TRIGGER_BADGE_COLORS[
                          (rule.trigger as any)?.type as TriggerType
                        ] ?? "bg-gray-50 text-gray-600 border-gray-200"
                      )}
                    >
                      {getTriggerLabel((rule.trigger as any)?.type)}
                    </Badge>
                    <span className="text-[11px] text-[#6d6e6f] dark:text-gray-500">
                      then
                    </span>
                    <Badge
                      variant="secondary"
                      className="text-[11px] font-medium"
                    >
                      {getActionLabel((rule.actions as any)?.[0]?.type)}
                    </Badge>
                    {(rule.actions as any)?.[0]?.config && (
                      <span className="truncate text-[11px] text-[#6d6e6f] dark:text-gray-500">
                        &mdash; {(rule.actions as any)?.[0]?.config}
                      </span>
                    )}
                  </div>
                </div>

                {/* Right: Controls */}
                <div className="flex shrink-0 items-center gap-3">
                  <Switch
                    checked={rule.isActive}
                    onCheckedChange={() =>
                      handleToggle(rule.id, rule.isActive)
                    }
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDelete(rule.id)}
                    className="text-[#cfcbcb] opacity-0 transition-opacity hover:text-red-500 group-hover:opacity-100 dark:text-gray-600 dark:hover:text-red-400"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Rule Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-orange-500" />
              Create rule
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            {/* Rule Name */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-[#6d6e6f] dark:text-gray-400">
                Rule name
              </label>
              <Input
                value={ruleName}
                onChange={(e) => setRuleName(e.target.value)}
                placeholder="e.g., Auto-assign new tasks"
                className="h-9 text-sm"
              />
            </div>

            {/* Trigger Type */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-[#6d6e6f] dark:text-gray-400">
                When this happens (Trigger)
              </label>
              <Select
                value={triggerType}
                onValueChange={(value) =>
                  setTriggerType(value as TriggerType)
                }
              >
                <SelectTrigger className="h-9 w-full text-sm">
                  <SelectValue placeholder="Select a trigger..." />
                </SelectTrigger>
                <SelectContent>
                  {TRIGGER_TYPES.map((trigger) => (
                    <SelectItem key={trigger.value} value={trigger.value}>
                      {trigger.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Action Type */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-[#6d6e6f] dark:text-gray-400">
                Do this (Action)
              </label>
              <Select
                value={actionType}
                onValueChange={(value) =>
                  setActionType(value as ActionType)
                }
              >
                <SelectTrigger className="h-9 w-full text-sm">
                  <SelectValue placeholder="Select an action..." />
                </SelectTrigger>
                <SelectContent>
                  {ACTION_TYPES.map((action) => (
                    <SelectItem key={action.value} value={action.value}>
                      {action.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Action Config */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-[#6d6e6f] dark:text-gray-400">
                Action configuration
              </label>
              <Input
                value={actionConfig}
                onChange={(e) => setActionConfig(e.target.value)}
                placeholder="e.g., section name, assignee email, comment text..."
                className="h-9 text-sm"
              />
              <p className="text-[11px] text-[#9ca0a4] dark:text-gray-500">
                Provide additional context for the action, such as an assignee
                email or a section name.
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2 pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                resetForm();
                setDialogOpen(false);
              }}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              disabled={!isFormValid || createRule.isPending}
              onClick={handleCreate}
              className="gap-1.5 bg-[#4573D2] text-white hover:bg-[#3a63b8]"
            >
              {createRule.isPending ? "Creating..." : "Create rule"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
