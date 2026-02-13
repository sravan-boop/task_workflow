import { PrismaClient } from "../../../prisma/generated/prisma/client";

type RuleTriggerType = "TASK_ADDED" | "TASK_MOVED" | "TASK_COMPLETED" | "FIELD_CHANGED" | "DUE_DATE_APPROACHING";
type RuleActionType = "SET_ASSIGNEE" | "MOVE_TO_SECTION" | "SET_FIELD" | "ADD_COMMENT" | "COMPLETE_TASK" | "SET_DUE_DATE";

interface RuleAction {
  type: RuleActionType;
  config?: string;
}

interface RuleCondition {
  field: string;
  operator: "equals" | "not_equals" | "greater_than" | "less_than" | "contains" | "not_contains" | "is_empty" | "is_not_empty";
  value?: string;
}

interface RuleConditions {
  logic?: "AND" | "OR";
  conditions?: RuleCondition[];
}

export async function executeRules(
  prisma: PrismaClient,
  triggerType: RuleTriggerType,
  context: {
    projectId: string;
    taskId: string;
    userId: string;
    data?: Record<string, unknown>;
  }
): Promise<void> {
  // 1. Find all active rules for the project with matching trigger type
  const rules = await prisma.rule.findMany({
    where: {
      projectId: context.projectId,
      isActive: true,
    },
  });

  // 2. Filter rules by trigger type
  const matchingRules = rules.filter((rule) => {
    const trigger = rule.trigger as { type: string };
    return trigger.type === triggerType;
  });

  // 3. Execute each matching rule's actions (after evaluating conditions)
  for (const rule of matchingRules) {
    // Evaluate conditions if present
    const ruleConditions = rule.conditions as unknown as RuleConditions | null;
    if (ruleConditions?.conditions && ruleConditions.conditions.length > 0) {
      const conditionsMet = await evaluateConditions(prisma, ruleConditions, context);
      if (!conditionsMet) {
        // Log skipped rule
        await logRuleExecution(prisma, rule.id, context.taskId, "SKIPPED", "Conditions not met");
        continue;
      }
    }

    const actions = rule.actions as unknown as RuleAction[];
    try {
      for (const action of actions) {
        await executeAction(prisma, action, context);
      }
      await logRuleExecution(prisma, rule.id, context.taskId, "SUCCESS", null);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      await logRuleExecution(prisma, rule.id, context.taskId, "FAILED", message);
    }
  }
}

async function evaluateConditions(
  prisma: PrismaClient,
  ruleConditions: RuleConditions,
  context: { taskId: string }
): Promise<boolean> {
  const { logic = "AND", conditions = [] } = ruleConditions;
  if (conditions.length === 0) return true;

  // Fetch the task with its custom field values
  const task = await prisma.task.findUnique({
    where: { id: context.taskId },
    include: {
      assignee: true,
      taskProjects: { include: { section: true } },
      customFieldValues: { include: { customField: true } },
    },
  });

  if (!task) return false;

  const results = conditions.map((condition) => {
    return evaluateSingleCondition(condition, task);
  });

  if (logic === "OR") {
    return results.some((r) => r);
  }
  return results.every((r) => r);
}

function evaluateSingleCondition(
  condition: RuleCondition,
  task: {
    title: string;
    status: string;
    assigneeId: string | null;
    dueDate: Date | null;
    assignee: { name: string } | null;
    taskProjects: { section: { name: string } | null }[];
    customFieldValues: { customField: { name: string }; stringValue: string | null; numberValue: number | null }[];
  }
): boolean {
  // Resolve field value
  let fieldValue: string | number | null = null;

  switch (condition.field) {
    case "title":
      fieldValue = task.title;
      break;
    case "status":
      fieldValue = task.status;
      break;
    case "assignee":
      fieldValue = task.assignee?.name ?? null;
      break;
    case "section":
      fieldValue = task.taskProjects[0]?.section?.name ?? null;
      break;
    case "dueDate":
      fieldValue = task.dueDate?.toISOString() ?? null;
      break;
    default: {
      // Check custom fields
      const cfv = task.customFieldValues.find(
        (v) => v.customField.name === condition.field
      );
      if (cfv) {
        fieldValue = cfv.numberValue ?? cfv.stringValue ?? null;
      }
    }
  }

  const conditionValue = condition.value ?? "";

  switch (condition.operator) {
    case "equals":
      return String(fieldValue) === conditionValue;
    case "not_equals":
      return String(fieldValue) !== conditionValue;
    case "greater_than": {
      const num = parseFloat(String(fieldValue));
      const cmp = parseFloat(conditionValue);
      return !isNaN(num) && !isNaN(cmp) && num > cmp;
    }
    case "less_than": {
      const num = parseFloat(String(fieldValue));
      const cmp = parseFloat(conditionValue);
      return !isNaN(num) && !isNaN(cmp) && num < cmp;
    }
    case "contains":
      return String(fieldValue ?? "").toLowerCase().includes(conditionValue.toLowerCase());
    case "not_contains":
      return !String(fieldValue ?? "").toLowerCase().includes(conditionValue.toLowerCase());
    case "is_empty":
      return fieldValue === null || fieldValue === "" || fieldValue === undefined;
    case "is_not_empty":
      return fieldValue !== null && fieldValue !== "" && fieldValue !== undefined;
    default:
      return false;
  }
}

async function logRuleExecution(
  prisma: PrismaClient,
  ruleId: string,
  taskId: string | null,
  status: string,
  message: string | null
): Promise<void> {
  try {
    await prisma.ruleExecutionLog.create({
      data: { ruleId, taskId, status, message },
    });
  } catch {
    // Don't let logging failures affect rule execution
  }
}

async function executeAction(
  prisma: PrismaClient,
  action: RuleAction,
  context: { projectId: string; taskId: string; userId: string }
): Promise<void> {
  switch (action.type) {
    case "COMPLETE_TASK":
      await prisma.task.update({
        where: { id: context.taskId },
        data: { status: "COMPLETE", completedAt: new Date() },
      });
      break;
    case "SET_ASSIGNEE":
      if (action.config) {
        await prisma.task.update({
          where: { id: context.taskId },
          data: { assigneeId: action.config },
        });
      }
      break;
    case "MOVE_TO_SECTION":
      if (action.config) {
        await prisma.taskProject.updateMany({
          where: { taskId: context.taskId, projectId: context.projectId },
          data: { sectionId: action.config },
        });
      }
      break;
    case "ADD_COMMENT":
      if (action.config) {
        await prisma.comment.create({
          data: {
            taskId: context.taskId,
            authorId: context.userId,
            body: { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: action.config }] }] },
          },
        });
      }
      break;
    case "SET_DUE_DATE":
      if (action.config) {
        const daysFromNow = parseInt(action.config, 10);
        if (!isNaN(daysFromNow)) {
          const dueDate = new Date();
          dueDate.setDate(dueDate.getDate() + daysFromNow);
          await prisma.task.update({
            where: { id: context.taskId },
            data: { dueDate },
          });
        }
      }
      break;
    case "SET_FIELD":
      // Config format: "fieldId:value"
      if (action.config) {
        const [fieldId, ...valueParts] = action.config.split(":");
        const value = valueParts.join(":");
        if (fieldId && value) {
          await prisma.taskCustomFieldValue.upsert({
            where: {
              taskId_customFieldId: {
                taskId: context.taskId,
                customFieldId: fieldId,
              },
            },
            create: {
              taskId: context.taskId,
              customFieldId: fieldId,
              stringValue: value,
            },
            update: {
              stringValue: value,
            },
          });
        }
      }
      break;
  }
}
