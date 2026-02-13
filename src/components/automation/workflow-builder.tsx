"use client";

import { useState, useCallback } from "react";
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
import {
  Zap,
  GitBranch,
  Play,
  Plus,
  Trash2,
  ArrowDown,
  ChevronDown,
  ChevronRight,
  Settings2,
} from "lucide-react";

// ── Types ──────────────────────────────────────────────────

type TriggerType = "TASK_ADDED" | "TASK_MOVED" | "TASK_COMPLETED" | "FIELD_CHANGED" | "DUE_DATE_APPROACHING";
type ActionType = "SET_ASSIGNEE" | "MOVE_TO_SECTION" | "SET_FIELD" | "ADD_COMMENT" | "COMPLETE_TASK" | "SET_DUE_DATE";
type ConditionOperator = "equals" | "not_equals" | "greater_than" | "less_than" | "contains" | "is_empty" | "is_not_empty";

interface WorkflowNode {
  id: string;
  type: "trigger" | "condition" | "action";
  data: {
    triggerType?: TriggerType;
    actionType?: ActionType;
    config?: string;
    field?: string;
    operator?: ConditionOperator;
    value?: string;
    label?: string;
  };
}

interface WorkflowBuilderProps {
  onSave?: (rule: {
    trigger: { type: TriggerType };
    conditions: { logic: string; conditions: { field: string; operator: string; value: string }[] };
    actions: { type: ActionType; config: string }[];
  }) => void;
  initialNodes?: WorkflowNode[];
}

const TRIGGER_OPTIONS: { value: TriggerType; label: string }[] = [
  { value: "TASK_ADDED", label: "Task is added" },
  { value: "TASK_MOVED", label: "Task is moved" },
  { value: "TASK_COMPLETED", label: "Task is completed" },
  { value: "FIELD_CHANGED", label: "Field is changed" },
  { value: "DUE_DATE_APPROACHING", label: "Due date approaching" },
];

const ACTION_OPTIONS: { value: ActionType; label: string }[] = [
  { value: "SET_ASSIGNEE", label: "Set assignee" },
  { value: "MOVE_TO_SECTION", label: "Move to section" },
  { value: "COMPLETE_TASK", label: "Complete task" },
  { value: "ADD_COMMENT", label: "Add comment" },
  { value: "SET_DUE_DATE", label: "Set due date" },
  { value: "SET_FIELD", label: "Set field value" },
];

const OPERATOR_OPTIONS: { value: ConditionOperator; label: string }[] = [
  { value: "equals", label: "equals" },
  { value: "not_equals", label: "does not equal" },
  { value: "greater_than", label: "greater than" },
  { value: "less_than", label: "less than" },
  { value: "contains", label: "contains" },
  { value: "is_empty", label: "is empty" },
  { value: "is_not_empty", label: "is not empty" },
];

const FIELD_OPTIONS = [
  { value: "title", label: "Title" },
  { value: "status", label: "Status" },
  { value: "assignee", label: "Assignee" },
  { value: "section", label: "Section" },
  { value: "dueDate", label: "Due Date" },
];

// ── Component ──────────────────────────────────────────────

export function WorkflowBuilder({ onSave, initialNodes }: WorkflowBuilderProps) {
  const [nodes, setNodes] = useState<WorkflowNode[]>(
    initialNodes ?? [
      {
        id: "trigger-1",
        type: "trigger",
        data: { triggerType: "TASK_ADDED" },
      },
    ]
  );

  const [conditionLogic, setConditionLogic] = useState<"AND" | "OR">("AND");
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set(nodes.map((n) => n.id)));

  const toggleExpand = (id: string) => {
    setExpandedNodes((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const addCondition = useCallback(() => {
    const newNode: WorkflowNode = {
      id: `condition-${Date.now()}`,
      type: "condition",
      data: { field: "status", operator: "equals", value: "" },
    };
    // Insert conditions before actions
    const actionIdx = nodes.findIndex((n) => n.type === "action");
    if (actionIdx === -1) {
      setNodes([...nodes, newNode]);
    } else {
      const updated = [...nodes];
      updated.splice(actionIdx, 0, newNode);
      setNodes(updated);
    }
    setExpandedNodes((prev) => new Set([...prev, newNode.id]));
  }, [nodes]);

  const addAction = useCallback(() => {
    const newNode: WorkflowNode = {
      id: `action-${Date.now()}`,
      type: "action",
      data: { actionType: "COMPLETE_TASK", config: "" },
    };
    setNodes([...nodes, newNode]);
    setExpandedNodes((prev) => new Set([...prev, newNode.id]));
  }, [nodes]);

  const removeNode = (id: string) => {
    setNodes(nodes.filter((n) => n.id !== id));
  };

  const updateNode = (id: string, data: Partial<WorkflowNode["data"]>) => {
    setNodes(nodes.map((n) => (n.id === id ? { ...n, data: { ...n.data, ...data } } : n)));
  };

  const handleSave = () => {
    const triggerNode = nodes.find((n) => n.type === "trigger");
    if (!triggerNode?.data.triggerType) return;

    const conditionNodes = nodes.filter((n) => n.type === "condition");
    const actionNodes = nodes.filter((n) => n.type === "action");

    const rule = {
      trigger: { type: triggerNode.data.triggerType },
      conditions: {
        logic: conditionLogic,
        conditions: conditionNodes.map((n) => ({
          field: n.data.field ?? "status",
          operator: n.data.operator ?? "equals",
          value: n.data.value ?? "",
        })),
      },
      actions: actionNodes.map((n) => ({
        type: n.data.actionType ?? ("COMPLETE_TASK" as ActionType),
        config: n.data.config ?? "",
      })),
    };

    onSave?.(rule);
  };

  const triggerNodes = nodes.filter((n) => n.type === "trigger");
  const conditionNodes = nodes.filter((n) => n.type === "condition");
  const actionNodes = nodes.filter((n) => n.type === "action");

  return (
    <div className="space-y-3">
      {/* Trigger Section */}
      {triggerNodes.map((node) => (
        <Card key={node.id} className="border-blue-200 bg-blue-50/50 dark:border-blue-900 dark:bg-blue-950/30">
          <CardHeader
            className="cursor-pointer pb-2 pt-3"
            onClick={() => toggleExpand(node.id)}
          >
            <div className="flex items-center gap-2">
              {expandedNodes.has(node.id) ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
              <Zap className="h-4 w-4 text-blue-600" />
              <CardTitle className="text-sm font-medium">
                Trigger: {TRIGGER_OPTIONS.find((o) => o.value === node.data.triggerType)?.label ?? "Select trigger"}
              </CardTitle>
            </div>
          </CardHeader>
          {expandedNodes.has(node.id) && (
            <CardContent className="pt-0">
              <Select
                value={node.data.triggerType}
                onValueChange={(val) => updateNode(node.id, { triggerType: val as TriggerType })}
              >
                <SelectTrigger className="h-8">
                  <SelectValue placeholder="Select trigger" />
                </SelectTrigger>
                <SelectContent>
                  {TRIGGER_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          )}
        </Card>
      ))}

      {/* Arrow connector */}
      <div className="flex justify-center">
        <ArrowDown className="h-5 w-5 text-muted-foreground" />
      </div>

      {/* Conditions Section */}
      {conditionNodes.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 px-1">
            <GitBranch className="h-4 w-4 text-amber-600" />
            <span className="text-xs font-medium text-amber-700 dark:text-amber-400">
              Conditions ({conditionLogic})
            </span>
            <Select
              value={conditionLogic}
              onValueChange={(val) => setConditionLogic(val as "AND" | "OR")}
            >
              <SelectTrigger className="h-6 w-16 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="AND">AND</SelectItem>
                <SelectItem value="OR">OR</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {conditionNodes.map((node) => (
            <Card key={node.id} className="border-amber-200 bg-amber-50/50 dark:border-amber-900 dark:bg-amber-950/30">
              <CardHeader
                className="cursor-pointer pb-2 pt-3"
                onClick={() => toggleExpand(node.id)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {expandedNodes.has(node.id) ? (
                      <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ChevronRight className="h-4 w-4" />
                    )}
                    <Settings2 className="h-3.5 w-3.5 text-amber-600" />
                    <span className="text-xs font-medium">
                      If {node.data.field} {node.data.operator} {node.data.value || "..."}
                    </span>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 text-destructive"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeNode(node.id);
                    }}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </CardHeader>
              {expandedNodes.has(node.id) && (
                <CardContent className="space-y-2 pt-0">
                  <div className="grid grid-cols-3 gap-2">
                    <Select
                      value={node.data.field}
                      onValueChange={(val) => updateNode(node.id, { field: val })}
                    >
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue placeholder="Field" />
                      </SelectTrigger>
                      <SelectContent>
                        {FIELD_OPTIONS.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <Select
                      value={node.data.operator}
                      onValueChange={(val) => updateNode(node.id, { operator: val as ConditionOperator })}
                    >
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue placeholder="Operator" />
                      </SelectTrigger>
                      <SelectContent>
                        {OPERATOR_OPTIONS.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <Input
                      value={node.data.value ?? ""}
                      onChange={(e) => updateNode(node.id, { value: e.target.value })}
                      placeholder="Value"
                      className="h-8 text-xs"
                    />
                  </div>
                </CardContent>
              )}
            </Card>
          ))}

          <div className="flex justify-center">
            <ArrowDown className="h-5 w-5 text-muted-foreground" />
          </div>
        </div>
      )}

      {/* Actions Section */}
      {actionNodes.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 px-1">
            <Play className="h-4 w-4 text-green-600" />
            <span className="text-xs font-medium text-green-700 dark:text-green-400">
              Actions
            </span>
          </div>

          {actionNodes.map((node, idx) => (
            <div key={node.id}>
              <Card className="border-green-200 bg-green-50/50 dark:border-green-900 dark:bg-green-950/30">
                <CardHeader
                  className="cursor-pointer pb-2 pt-3"
                  onClick={() => toggleExpand(node.id)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {expandedNodes.has(node.id) ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronRight className="h-4 w-4" />
                      )}
                      <span className="text-xs font-medium">
                        {ACTION_OPTIONS.find((o) => o.value === node.data.actionType)?.label ?? "Select action"}
                      </span>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 text-destructive"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeNode(node.id);
                      }}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </CardHeader>
                {expandedNodes.has(node.id) && (
                  <CardContent className="space-y-2 pt-0">
                    <Select
                      value={node.data.actionType}
                      onValueChange={(val) => updateNode(node.id, { actionType: val as ActionType })}
                    >
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue placeholder="Select action" />
                      </SelectTrigger>
                      <SelectContent>
                        {ACTION_OPTIONS.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    {node.data.actionType !== "COMPLETE_TASK" && (
                      <Input
                        value={node.data.config ?? ""}
                        onChange={(e) => updateNode(node.id, { config: e.target.value })}
                        placeholder={
                          node.data.actionType === "ADD_COMMENT"
                            ? "Comment text..."
                            : node.data.actionType === "SET_DUE_DATE"
                              ? "Days from now (e.g. 7)"
                              : "Configuration value..."
                        }
                        className="h-8 text-xs"
                      />
                    )}
                  </CardContent>
                )}
              </Card>
              {idx < actionNodes.length - 1 && (
                <div className="flex justify-center py-1">
                  <ArrowDown className="h-4 w-4 text-muted-foreground" />
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Add buttons */}
      <div className="flex items-center justify-center gap-2 pt-2">
        <Button variant="outline" size="sm" onClick={addCondition} className="h-7 text-xs">
          <GitBranch className="mr-1.5 h-3 w-3" />
          Add Condition
        </Button>
        <Button variant="outline" size="sm" onClick={addAction} className="h-7 text-xs">
          <Plus className="mr-1.5 h-3 w-3" />
          Add Action
        </Button>
      </div>

      {/* Save */}
      {onSave && (
        <div className="flex justify-end pt-2">
          <Button size="sm" onClick={handleSave}>
            Save Workflow
          </Button>
        </div>
      )}
    </div>
  );
}
