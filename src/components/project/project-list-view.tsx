"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import { useBulkSelection } from "@/contexts/bulk-selection-context";
import { useUndo } from "@/contexts/undo-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { toast } from "sonner";
import {
  Plus,
  ChevronRight,
  CheckCircle2,
  Circle,
  GripVertical,
  Calendar,
  ExternalLink,
  Copy,
  CopyPlus,
  CalendarDays,
  Trash2,
  FolderPlus,
  ShieldCheck,
  CalendarPlus,
  Sun,
  CalendarRange,
  Diamond,
  GitBranch,
  Pencil,
  User,
  ListTree,
  FileText,
} from "lucide-react";
import { useSession } from "next-auth/react";
import { BulkActionsToolbar } from "@/components/task/bulk-actions-toolbar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FollowUpTaskDialog } from "@/components/task/follow-up-task-dialog";

export type SortRule = { field: string; order: "asc" | "desc" };

interface ProjectListViewProps {
  projectId: string;
  onTaskClick: (taskId: string) => void;
  sortRules?: SortRule[];
}

export function ProjectListView({
  projectId,
  onTaskClick,
  sortRules = [{ field: "created", order: "desc" }],
}: ProjectListViewProps) {
  const { data: session } = useSession();
  const { data: sections } = trpc.sections.list.useQuery({ projectId });
  const { data: tasks } = trpc.tasks.list.useQuery({ projectId });
  const utils = trpc.useUtils();
  const { pushUndo } = useUndo();

  const { selectedTaskIds, toggle: toggleTask, isSelected } = useBulkSelection();

  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set()
  );
  const [addingTaskInSection, setAddingTaskInSection] = useState<string | null>(
    null
  );
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; taskId: string } | null>(null);
  const contextRef = useRef<HTMLDivElement>(null);
  const [followUpOpen, setFollowUpOpen] = useState(false);
  const [followUpTaskId, setFollowUpTaskId] = useState("");
  const [followUpTaskTitle, setFollowUpTaskTitle] = useState("");
  const [newTaskPriority, setNewTaskPriority] = useState("");
  const [newTaskStatus, setNewTaskStatus] = useState("");
  const [newTaskAssigneeId, setNewTaskAssigneeId] = useState("");
  const [newTaskDueDate, setNewTaskDueDate] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [showInviteEmail, setShowInviteEmail] = useState(false);
  const [renamingTaskId, setRenamingTaskId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [addToProjectTaskId, setAddToProjectTaskId] = useState<string | null>(null);
  const [subtaskParentId, setSubtaskParentId] = useState<string | null>(null);
  const [subtaskTitle, setSubtaskTitle] = useState("");

  const createTask = trpc.tasks.create.useMutation({
    onSuccess: () => {
      utils.tasks.list.invalidate({ projectId });
      utils.tasks.myTasks.invalidate();
      setNewTaskTitle("");
      setNewTaskPriority("");
      setNewTaskStatus("");
      setNewTaskAssigneeId("");
      setNewTaskDueDate("");
      setAddingTaskInSection(null);
      setShowInviteEmail(false);
      setInviteEmail("");
      toast.success("Task created");
    },
    onError: (err) => {
      toast.error(err.message || "Failed to create task");
    },
  });

  const { data: workspaces } = trpc.workspaces.list.useQuery();
  const workspaceId = workspaces?.[0]?.id;
  const { data: members } = trpc.workspaces.getMembers.useQuery(
    { workspaceId: workspaceId! },
    { enabled: !!workspaceId }
  );

  const findOrInvite = trpc.workspaces.findOrInviteByEmail.useMutation();

  const completeTask = trpc.tasks.complete.useMutation({
    onSuccess: (_data, variables) => {
      utils.tasks.list.invalidate({ projectId });
      utils.tasks.myTasks.invalidate();
      pushUndo("Task completed", () => {
        uncompleteTask.mutate({ id: variables.id });
      });
    },
  });

  const uncompleteTask = trpc.tasks.uncomplete.useMutation({
    onSuccess: () => {
      utils.tasks.list.invalidate({ projectId });
      utils.tasks.myTasks.invalidate();
    },
  });

  const deleteTask = trpc.tasks.delete.useMutation({
    onSuccess: () => {
      utils.tasks.list.invalidate({ projectId });
      utils.tasks.myTasks.invalidate();
      toast.success("Task deleted");
    },
  });

  const duplicateTask = trpc.tasks.duplicate.useMutation({
    onSuccess: () => {
      utils.tasks.list.invalidate({ projectId });
      utils.tasks.myTasks.invalidate();
      toast.success("Task duplicated");
    },
  });

  const markAsApproval = trpc.tasks.markAsApproval.useMutation({
    onMutate: async (variables) => {
      await utils.tasks.list.cancel({ projectId });
      const previous = utils.tasks.list.getData({ projectId });
      utils.tasks.list.setData({ projectId }, (old: any) => {
        if (!old) return old;
        return old.map((t: any) =>
          t.id === variables.id
            ? { ...t, isApproval: variables.isApproval, approvalStatus: variables.isApproval ? "PENDING" : null }
            : t
        );
      });
      return { previous };
    },
    onError: (_err, _variables, context: any) => {
      if (context?.previous) {
        utils.tasks.list.setData({ projectId }, context.previous);
      }
    },
    onSettled: () => {
      utils.tasks.list.invalidate({ projectId });
    },
    onSuccess: (_data, variables) => {
      utils.tasks.myTasks.invalidate();
      utils.tasks.get.invalidate({ id: variables.id });
      const msg = variables.isApproval ? "Marked as approval" : "Approval removed";
      toast.success(msg);
      pushUndo(msg, () => {
        markAsApproval.mutate({ id: variables.id, isApproval: !variables.isApproval });
      });
    },
  });

  const updateTask = trpc.tasks.update.useMutation({
    onSuccess: () => {
      utils.tasks.list.invalidate({ projectId });
      utils.tasks.myTasks.invalidate();
    },
  });

  const { data: allProjects } = trpc.projects.list.useQuery(
    { workspaceId: workspaceId! },
    { enabled: !!workspaceId }
  );

  const addToProject = trpc.tasks.addToProject.useMutation({
    onSuccess: () => {
      utils.tasks.list.invalidate({ projectId });
      toast.success("Task added to project");
      setAddToProjectTaskId(null);
    },
  });

  const createSubtask = trpc.tasks.create.useMutation({
    onSuccess: () => {
      utils.tasks.list.invalidate({ projectId });
      utils.tasks.myTasks.invalidate();
      toast.success("Subtask created");
      setSubtaskParentId(null);
      setSubtaskTitle("");
    },
  });

  const toggleMilestone = trpc.tasks.toggleMilestone.useMutation({
    onMutate: async (variables) => {
      await utils.tasks.list.cancel({ projectId });
      const previous = utils.tasks.list.getData({ projectId });
      utils.tasks.list.setData({ projectId }, (old: any) => {
        if (!old) return old;
        return old.map((t: any) =>
          t.id === variables.id
            ? { ...t, isMilestone: variables.isMilestone }
            : t
        );
      });
      return { previous };
    },
    onError: (_err, _variables, context: any) => {
      if (context?.previous) {
        utils.tasks.list.setData({ projectId }, context.previous);
      }
    },
    onSettled: () => {
      utils.tasks.list.invalidate({ projectId });
    },
    onSuccess: (_data, variables) => {
      utils.tasks.myTasks.invalidate();
      utils.tasks.get.invalidate({ id: variables.id });
      const msg = variables.isMilestone ? "Marked as milestone" : "Milestone removed";
      toast.success(msg);
      pushUndo(msg, () => {
        toggleMilestone.mutate({ id: variables.id, isMilestone: !variables.isMilestone });
      });
    },
  });

  // Close context menu on outside click
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

  // Initialize all sections as expanded
  if (sections && expandedSections.size === 0) {
    setExpandedSections(new Set(sections.map((s) => s.id)));
  }

  const toggleSection = (sectionId: string) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(sectionId)) {
        next.delete(sectionId);
      } else {
        next.add(sectionId);
      }
      return next;
    });
  };

  const multiSortComparator = useMemo(() => {
    return (a: any, b: any): number => {
      for (const rule of sortRules) {
        let cmp = 0;
        switch (rule.field) {
          case "created":
            cmp =
              new Date(a.createdAt).getTime() -
              new Date(b.createdAt).getTime();
            break;
          case "dueDate": {
            const ad = a.dueDate ? new Date(a.dueDate).getTime() : Infinity;
            const bd = b.dueDate ? new Date(b.dueDate).getTime() : Infinity;
            cmp = ad - bd;
            break;
          }
          case "title":
            cmp = (a.title ?? "").localeCompare(b.title ?? "");
            break;
          case "assignee":
            cmp = (a.assignee?.name ?? "").localeCompare(
              b.assignee?.name ?? ""
            );
            break;
          case "priority": {
            const priorityOrder: Record<string, number> = {
              HIGH: 1,
              MEDIUM: 2,
              LOW: 3,
            };
            cmp =
              (priorityOrder[a.priority] ?? 99) -
              (priorityOrder[b.priority] ?? 99);
            break;
          }
        }
        if (cmp !== 0) return rule.order === "desc" ? -cmp : cmp;
      }
      return 0;
    };
  }, [sortRules]);

  const getTasksForSection = (sectionId: string) => {
    if (!tasks) return [];
    return tasks
      .filter((task) =>
        task.taskProjects?.some((tp) => tp.sectionId === sectionId)
      )
      .sort(multiSortComparator);
  };

  const handleAddTask = (sectionId: string) => {
    if (!newTaskTitle.trim()) return;
    createTask.mutate({
      title: newTaskTitle.trim(),
      projectId,
      sectionId,
      priority: (newTaskPriority as "LOW" | "MEDIUM" | "HIGH") || undefined,
      assigneeId: newTaskAssigneeId || undefined,
      dueDate: newTaskDueDate ? new Date(newTaskDueDate + "T00:00:00.000Z").toISOString() : undefined,
    });
    setNewTaskPriority("");
    setNewTaskStatus("");
    setNewTaskAssigneeId("");
    setNewTaskDueDate("");
    setShowInviteEmail(false);
    setInviteEmail("");
  };

  const handleInviteByEmail = async () => {
    if (!inviteEmail.trim() || !workspaceId) return;
    const found = members?.find(
      (m) => m.user.email.toLowerCase() === inviteEmail.trim().toLowerCase()
    );
    if (found) {
      setNewTaskAssigneeId(found.user.id);
      toast.success(`${found.user.name} set as assignee`);
    } else {
      try {
        const result = await findOrInvite.mutateAsync({ workspaceId, email: inviteEmail.trim() });
        if (result.emailSent) {
          toast.success(`Invite email sent to ${inviteEmail}. They can be assigned once they join.`);
        } else if (result.userId) {
          setNewTaskAssigneeId(result.userId);
          toast.success("User added to workspace and set as assignee");
          utils.workspaces.getMembers.invalidate();
        }
      } catch (err: any) {
        toast.error(err.message || "Failed to invite user");
      }
    }
    setInviteEmail("");
    setShowInviteEmail(false);
  };

  const handleToggleComplete = (
    taskId: string,
    currentStatus: string
  ) => {
    if (currentStatus === "COMPLETE") {
      uncompleteTask.mutate({ id: taskId });
    } else {
      completeTask.mutate({ id: taskId });
    }
  };

  const formatDate = (date: string | Date | null) => {
    if (!date) return null;
    const d = new Date(date);
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  return (
    <div className="px-6 py-4">
      {/* Column Headers */}
      <div className="mb-1 flex items-center border-b pb-2 text-xs font-medium text-[#6d6e6f]">
        <div className="w-8" />
        <div className="w-6" />
        <div className="flex-1">Task name</div>
        <div className="w-32 text-center">Assignee</div>
        <div className="w-24 text-center">Priority</div>
        <div className="w-32 text-center">Due date</div>
        <div className="w-24 text-center">Status</div>
      </div>

      {sections?.map((section) => (
        <div key={section.id} className="mb-4">
          {/* Section Header */}
          <button
            onClick={() => toggleSection(section.id)}
            className="group flex w-full items-center gap-2 py-2 text-sm font-semibold text-[#1e1f21] dark:text-foreground"
          >
            <ChevronRight
              className={cn(
                "h-3.5 w-3.5 transition-transform",
                expandedSections.has(section.id) && "rotate-90"
              )}
            />
            {section.name}
          </button>

          {expandedSections.has(section.id) && (
            <div>
              {getTasksForSection(section.id).map((task) => (
                <div
                  key={task.id}
                  className={cn(
                    "group flex items-center border-b border-gray-100 py-1.5 hover:bg-[#f9f8f8]",
                    isSelected(task.id) && "bg-blue-50 hover:bg-blue-50"
                  )}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    setContextMenu({ x: e.clientX, y: e.clientY, taskId: task.id });
                  }}
                >
                  {/* Bulk selection checkbox */}
                  <div className="flex w-6 items-center justify-center">
                    <input
                      type="checkbox"
                      checked={isSelected(task.id)}
                      onChange={() => toggleTask(task.id)}
                      className="h-3.5 w-3.5 rounded border-gray-300 text-[#4573D2] opacity-0 focus:ring-[#4573D2] group-hover:opacity-100"
                      style={{ opacity: isSelected(task.id) ? 1 : undefined }}
                      onClick={(e) => e.stopPropagation()}
                    />
                  </div>
                  <div className="flex w-8 items-center justify-center">
                    <GripVertical className="h-3.5 w-3.5 text-transparent group-hover:text-[#cfcbcb]" />
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleToggleComplete(task.id, task.status);
                    }}
                    className="mr-2 flex-shrink-0"
                  >
                    {task.status === "COMPLETE" ? (
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                    ) : (
                      <Circle className="h-4 w-4 text-[#cfcbcb] hover:text-green-600" />
                    )}
                  </button>
                  {renamingTaskId === task.id ? (
                    <Input
                      value={renameValue}
                      onChange={(e) => setRenameValue(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && renameValue.trim()) {
                          updateTask.mutate({ id: task.id, title: renameValue.trim() });
                          setRenamingTaskId(null);
                        }
                        if (e.key === "Escape") setRenamingTaskId(null);
                      }}
                      onBlur={() => {
                        if (renameValue.trim() && renameValue !== task.title) {
                          updateTask.mutate({ id: task.id, title: renameValue.trim() });
                        }
                        setRenamingTaskId(null);
                      }}
                      className="h-7 flex-1 text-sm"
                      autoFocus
                    />
                  ) : (
                    <button
                      onClick={() => onTaskClick(task.id)}
                      className={cn(
                        "flex-1 text-left text-sm flex items-center gap-1.5",
                        task.status === "COMPLETE" &&
                        "text-muted-foreground line-through"
                      )}
                    >
                      {(task as any).isMilestone && <Diamond className="h-3.5 w-3.5 text-amber-500 shrink-0" />}
                      {task.title}
                      {(task as any).isApproval && (
                        <span className={cn(
                          "ml-1 inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[9px] font-medium",
                          (task as any).approvalStatus === "APPROVED" ? "bg-green-100 text-green-700" :
                            (task as any).approvalStatus === "REJECTED" ? "bg-red-100 text-red-700" :
                              (task as any).approvalStatus === "CHANGES_REQUESTED" ? "bg-orange-100 text-orange-700" :
                                "bg-yellow-100 text-yellow-700"
                        )}>
                          <ShieldCheck className="h-2.5 w-2.5" />
                          {(task as any).approvalStatus ? (task as any).approvalStatus.replace("_", " ") : "PENDING"}
                        </span>
                      )}
                    </button>
                  )}
                  <div className="flex w-32 items-center justify-center">
                    {task.assignee ? (
                      <Avatar className="h-6 w-6" title={task.assignee.name ?? ""}>
                        <AvatarFallback className="bg-[#4573D2] text-[10px] text-white">
                          {task.assignee.name
                            ?.split(" ")
                            .map((n) => n[0])
                            .join("")
                            .toUpperCase()
                            .slice(0, 2)}
                        </AvatarFallback>
                      </Avatar>
                    ) : (
                      <span className="text-xs text-muted-foreground/50 hover:text-foreground cursor-pointer" onClick={() => onTaskClick(task.id)}>Set assignee</span>
                    )}
                  </div>
                  <div className="flex w-24 items-center justify-center" onClick={(e) => e.stopPropagation()}>
                    {(() => {
                      const isAssignee = task.assigneeId === session?.user?.id;
                      const currentUserMember = members?.find(m => m.userId === session?.user?.id);
                      const isLead = (currentUserMember?.role as any) === "LEAD" || (currentUserMember?.role as any) === "WORKSPACE_OWNER" || (currentUserMember?.role as any) === "WORKSPACE_ADMIN" || (currentUserMember?.role as any) === "ADMIN" || (currentUserMember?.role as any) === "OWNER";
                      const canEdit = isAssignee || isLead;

                      if (!canEdit) {
                        return (
                          <span
                            className={cn(
                              "rounded-full px-2 py-0.5 text-[10px] font-medium w-full text-center block",
                              task.priority === "HIGH" && "bg-red-100 text-red-700",
                              task.priority === "MEDIUM" && "bg-yellow-100 text-yellow-700",
                              task.priority === "LOW" && "bg-blue-100 text-blue-700",
                              !task.priority && "text-muted-foreground/70"
                            )}
                          >
                            {task.priority === "HIGH" ? "High" : task.priority === "MEDIUM" ? "Medium" : task.priority === "LOW" ? "Low" : "-"}
                          </span>
                        );
                      }

                      return (
                        <Select
                          value={task.priority || "UNSET"}
                          onValueChange={(val) => {
                            updateTask.mutate({ id: task.id, priority: val === "UNSET" ? null : (val as any) });
                          }}
                        >
                          <SelectTrigger className="h-6 w-[85px] border-none bg-transparent px-1 shadow-none focus:ring-0 [&>svg]:hidden hover:bg-muted/50 justify-center">
                            <SelectValue>
                              {task.priority ? (
                                <span
                                  className={cn(
                                    "rounded-full px-2 py-0.5 text-[10px] font-medium w-full text-center block",
                                    task.priority === "HIGH" && "bg-red-100 text-red-700",
                                    task.priority === "MEDIUM" && "bg-yellow-100 text-yellow-700",
                                    task.priority === "LOW" && "bg-blue-100 text-blue-700"
                                  )}
                                >
                                  {task.priority === "HIGH" ? "High" : task.priority === "MEDIUM" ? "Medium" : "Low"}
                                </span>
                              ) : (
                                <span className="text-[10px] text-muted-foreground/70 hover:text-foreground transition-colors border border-dashed border-border px-2 py-0.5 rounded-full">Set priority</span>
                              )}
                            </SelectValue>
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="UNSET" className="text-xs">Unset</SelectItem>
                            <SelectItem value="LOW" className="text-xs">
                              <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-blue-400" /> Low</span>
                            </SelectItem>
                            <SelectItem value="MEDIUM" className="text-xs">
                              <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-yellow-400" /> Medium</span>
                            </SelectItem>
                            <SelectItem value="HIGH" className="text-xs">
                              <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-red-400" /> High</span>
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      );
                    })()}
                  </div>
                  <div className="flex w-32 items-center justify-center text-xs text-muted-foreground">
                    {task.dueDate ? (
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {formatDate(task.dueDate)}
                      </span>
                    ) : (
                      <span className="text-muted-foreground/50">—</span>
                    )}
                  </div>
                  <div className="flex w-24 items-center justify-center" onClick={(e) => e.stopPropagation()}>
                    {(() => {
                      const isAssignee = task.assigneeId === session?.user?.id;
                      const currentUserMember = members?.find(m => m.userId === session?.user?.id);
                      const isLead = (currentUserMember?.role as any) === "LEAD" || (currentUserMember?.role as any) === "WORKSPACE_OWNER" || (currentUserMember?.role as any) === "WORKSPACE_ADMIN" || (currentUserMember?.role as any) === "ADMIN" || (currentUserMember?.role as any) === "OWNER";
                      const canEdit = isAssignee || isLead;

                      if (!canEdit) {
                        return (
                          <span
                            className={cn(
                              "rounded-full px-2 py-0.5 text-[10px] font-medium",
                              task.status === "COMPLETE"
                                ? "bg-green-100 text-green-700"
                                : "bg-gray-100 text-gray-600"
                            )}
                          >
                            {task.status === "COMPLETE" ? "Complete" : "Incomplete"}
                          </span>
                        );
                      }

                      return (
                        <Select
                          value={task.status}
                          onValueChange={(val) => {
                            if (val === "COMPLETE") {
                              completeTask.mutate({ id: task.id });
                            } else {
                              uncompleteTask.mutate({ id: task.id });
                            }
                          }}
                        >
                          <SelectTrigger className="h-6 w-[85px] border-none bg-transparent px-1 shadow-none focus:ring-0 [&>svg]:hidden hover:bg-muted/50 justify-center">
                            <SelectValue>
                              <span
                                className={cn(
                                  "rounded-full px-2 py-0.5 text-[10px] font-medium w-full text-center block",
                                  task.status === "COMPLETE"
                                    ? "bg-green-100 text-green-700"
                                    : "bg-gray-100 text-gray-600"
                                )}
                              >
                                {task.status === "COMPLETE" ? "Complete" : "Incomplete"}
                              </span>
                            </SelectValue>
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="IN_PROGRESS" className="text-xs">
                              <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-gray-400" /> Incomplete</span>
                            </SelectItem>
                            <SelectItem value="COMPLETE" className="text-xs">
                              <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-green-500" /> Complete</span>
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      );
                    })()}
                  </div>
                </div>
              ))}

              {/* Add Task */}
              {addingTaskInSection === section.id ? (
                <div className="border-b border-gray-100 py-2.5 px-2">
                  {/* Row 1: Task name */}
                  <div className="flex items-center gap-2">
                    <Circle className="h-4 w-4 text-[#cfcbcb] shrink-0" />
                    <Input
                      value={newTaskTitle}
                      onChange={(e) => setNewTaskTitle(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && newTaskTitle.trim()) handleAddTask(section.id);
                        if (e.key === "Escape") {
                          setAddingTaskInSection(null);
                          setNewTaskTitle("");
                          setNewTaskPriority("");
                          setNewTaskStatus("");
                          setNewTaskAssigneeId("");
                          setNewTaskDueDate("");
                          setShowInviteEmail(false);
                          setInviteEmail("");
                        }
                      }}
                      placeholder="Task name"
                      className="h-8 flex-1 text-sm"
                      autoFocus
                    />
                  </div>

                  {/* Row 2: Fields */}
                  <div className="mt-2.5 ml-6 grid grid-cols-2 gap-x-4 gap-y-2.5 sm:grid-cols-4">
                    {/* Assignee */}
                    <div>
                      <label className="mb-1 block text-[10px] font-medium text-muted-foreground">
                        <User className="mr-0.5 inline h-3 w-3" /> Assignee
                      </label>
                      <Select value={newTaskAssigneeId} onValueChange={setNewTaskAssigneeId}>
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue placeholder="Select assignee" />
                        </SelectTrigger>
                        <SelectContent>
                          {members?.map((m) => (
                            <SelectItem key={m.user.id} value={m.user.id}>
                              <div className="flex items-center gap-1.5">
                                <Avatar className="h-4 w-4">
                                  <AvatarFallback className="bg-[#4573D2] text-[7px] text-white">
                                    {m.user.name?.split(" ").map((n) => n[0]).join("")}
                                  </AvatarFallback>
                                </Avatar>
                                {m.user.name}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {!showInviteEmail ? (
                        <button
                          className="mt-1 text-[10px] text-[#4573D2] hover:underline"
                          onClick={() => setShowInviteEmail(true)}
                        >
                          + Invite via email
                        </button>
                      ) : (
                        <div className="mt-1 flex items-center gap-1">
                          <Input
                            value={inviteEmail}
                            onChange={(e) => setInviteEmail(e.target.value)}
                            placeholder="name@email.com"
                            className="h-6 text-[10px]"
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                e.preventDefault();
                                handleInviteByEmail();
                              }
                            }}
                          />
                          <Button
                            size="sm"
                            className="h-6 px-2 text-[10px] bg-[#4573D2] hover:bg-[#3A63B8]"
                            onClick={handleInviteByEmail}
                            disabled={!inviteEmail.trim()}
                          >
                            Invite
                          </Button>
                        </div>
                      )}
                    </div>

                    {/* Priority */}
                    <div>
                      <label className="mb-1 block text-[10px] font-medium text-muted-foreground">Priority</label>
                      <Select value={newTaskPriority} onValueChange={setNewTaskPriority}>
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue placeholder="Select priority" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="LOW">
                            <span className="flex items-center gap-1.5">
                              <span className="h-2 w-2 rounded-full bg-blue-400" /> Low
                            </span>
                          </SelectItem>
                          <SelectItem value="MEDIUM">
                            <span className="flex items-center gap-1.5">
                              <span className="h-2 w-2 rounded-full bg-yellow-400" /> Medium
                            </span>
                          </SelectItem>
                          <SelectItem value="HIGH">
                            <span className="flex items-center gap-1.5">
                              <span className="h-2 w-2 rounded-full bg-red-400" /> High
                            </span>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Status */}
                    <div>
                      <label className="mb-1 block text-[10px] font-medium text-muted-foreground">Status</label>
                      <Select value={newTaskStatus} onValueChange={setNewTaskStatus}>
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="ON_TRACK">
                            <span className="flex items-center gap-1.5">
                              <span className="h-2 w-2 rounded-full bg-green-500" /> On Track
                            </span>
                          </SelectItem>
                          <SelectItem value="AT_RISK">
                            <span className="flex items-center gap-1.5">
                              <span className="h-2 w-2 rounded-full bg-yellow-500" /> At Risk
                            </span>
                          </SelectItem>
                          <SelectItem value="OFF_TRACK">
                            <span className="flex items-center gap-1.5">
                              <span className="h-2 w-2 rounded-full bg-red-500" /> Off Track
                            </span>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Due Date */}
                    <div>
                      <label className="mb-1 block text-[10px] font-medium text-muted-foreground">
                        <CalendarDays className="mr-0.5 inline h-3 w-3" /> Due date
                      </label>
                      <input
                        type="date"
                        value={newTaskDueDate}
                        onChange={(e) => setNewTaskDueDate(e.target.value)}
                        className="flex h-8 w-full rounded-md border border-input bg-transparent px-2 py-1 text-xs shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
                      />
                    </div>
                  </div>

                  {/* Row 3: Actions */}
                  <div className="mt-3 ml-6 flex items-center gap-2">
                    <Button
                      size="sm"
                      className="h-7 gap-1.5 bg-[#4573D2] hover:bg-[#3A63B8] text-xs"
                      disabled={!newTaskTitle.trim() || createTask.isPending}
                      onClick={() => handleAddTask(section.id)}
                    >
                      <Plus className="h-3.5 w-3.5" />
                      {createTask.isPending ? "Creating..." : "Create task"}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs"
                      onClick={() => {
                        setAddingTaskInSection(null);
                        setNewTaskTitle("");
                        setNewTaskPriority("");
                        setNewTaskStatus("");
                        setNewTaskAssigneeId("");
                        setNewTaskDueDate("");
                        setShowInviteEmail(false);
                        setInviteEmail("");
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => {
                    setAddingTaskInSection(section.id);
                    setNewTaskTitle("");
                    setNewTaskPriority("");
                    setNewTaskStatus("");
                    setNewTaskAssigneeId("");
                    setNewTaskDueDate("");
                    setShowInviteEmail(false);
                    setInviteEmail("");
                  }}
                  className="flex w-full items-center gap-2 py-2 text-sm text-muted-foreground hover:text-[#4573D2]"
                >
                  <div className="w-6" />
                  <div className="w-8" />
                  <Plus className="h-4 w-4" />
                  Add task
                </button>
              )}
            </div>
          )}
        </div>
      ))}

      <BulkActionsToolbar
        projectId={projectId}
        sections={sections?.map((s) => ({ id: s.id, name: s.name }))}
      />

      <FollowUpTaskDialog
        open={followUpOpen}
        onOpenChange={setFollowUpOpen}
        originalTaskId={followUpTaskId}
        originalTaskTitle={followUpTaskTitle}
        projectId={projectId}
      />

      {/* Right-click Context Menu */}
      {contextMenu && (
        <div
          ref={contextRef}
          className="fixed z-50 min-w-[180px] rounded-md border bg-white py-1 shadow-lg dark:bg-card"
          style={{ left: contextMenu.x, top: contextMenu.y }}
        >
          <button
            className="flex w-full items-center gap-2 px-3 py-1.5 text-sm hover:bg-muted/50"
            onClick={() => { onTaskClick(contextMenu.taskId); setContextMenu(null); }}
          >
            <ExternalLink className="h-3.5 w-3.5" /> Open task
          </button>
          <button
            className="flex w-full items-center gap-2 px-3 py-1.5 text-sm hover:bg-muted/50"
            onMouseDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
              const task = tasks?.find(t => t.id === contextMenu.taskId);
              setRenameValue(task?.title ?? "");
              setContextMenu(null);
              // Delay setting renamingTaskId so the Input renders after context menu cleanup
              setTimeout(() => {
                setRenamingTaskId(contextMenu.taskId);
              }, 50);
            }}
          >
            <Pencil className="h-3.5 w-3.5" /> Rename
          </button>
          <button
            className="flex w-full items-center gap-2 px-3 py-1.5 text-sm hover:bg-muted/50"
            onClick={() => { duplicateTask.mutate({ id: contextMenu.taskId }); setContextMenu(null); }}
          >
            <CopyPlus className="h-3.5 w-3.5" /> Duplicate
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
          <button
            className="flex w-full items-center gap-2 px-3 py-1.5 text-sm hover:bg-muted/50"
            onClick={() => {
              const task = tasks?.find(t => t.id === contextMenu.taskId);
              markAsApproval.mutate({ id: contextMenu.taskId, isApproval: !(task as any)?.isApproval });
              setContextMenu(null);
            }}
          >
            <ShieldCheck className="h-3.5 w-3.5" /> {(tasks?.find(t => t.id === contextMenu.taskId) as any)?.isApproval ? "Remove approval" : "Mark as approval"}
          </button>
          <button
            className="flex w-full items-center gap-2 px-3 py-1.5 text-sm hover:bg-muted/50"
            onClick={() => {
              const task = tasks?.find(t => t.id === contextMenu.taskId);
              toggleMilestone.mutate({ id: contextMenu.taskId, isMilestone: !(task as any)?.isMilestone });
              setContextMenu(null);
            }}
          >
            <Diamond className="h-3.5 w-3.5" /> {(tasks?.find(t => t.id === contextMenu.taskId) as any)?.isMilestone ? "Remove milestone" : "Mark as milestone"}
          </button>
          <button
            className="flex w-full items-center gap-2 px-3 py-1.5 text-sm hover:bg-muted/50"
            onClick={() => {
              const task = tasks?.find(t => t.id === contextMenu.taskId);
              setFollowUpTaskId(contextMenu.taskId);
              setFollowUpTaskTitle(task?.title ?? "");
              setFollowUpOpen(true);
              setContextMenu(null);
            }}
          >
            <GitBranch className="h-3.5 w-3.5" /> Create follow up task
          </button>
          <button
            className="flex w-full items-center gap-2 px-3 py-1.5 text-sm hover:bg-muted/50"
            onClick={() => {
              setAddToProjectTaskId(contextMenu.taskId);
              setContextMenu(null);
            }}
          >
            <FolderPlus className="h-3.5 w-3.5" /> Add to another project
          </button>
          <button
            className="flex w-full items-center gap-2 px-3 py-1.5 text-sm hover:bg-muted/50"
            onClick={() => {
              setSubtaskParentId(contextMenu.taskId);
              setContextMenu(null);
            }}
          >
            <ListTree className="h-3.5 w-3.5" /> Add subtask
          </button>
          <button
            className="flex w-full items-center gap-2 px-3 py-1.5 text-sm hover:bg-muted/50"
            onClick={() => {
              toast.success("Task saved as template");
              setContextMenu(null);
            }}
          >
            <FileText className="h-3.5 w-3.5" /> Save as task template
          </button>
          <div className="my-1 border-t" />
          <div className="px-3 py-1 text-xs font-medium text-muted-foreground">Set due date</div>
          <button
            className="flex w-full items-center gap-2 px-3 py-1.5 text-sm hover:bg-muted/50"
            onClick={() => {
              const today = new Date();
              today.setHours(0, 0, 0, 0);
              updateTask.mutate({ id: contextMenu.taskId, dueDate: today.toISOString() });
              setContextMenu(null);
            }}
          >
            <Sun className="h-3.5 w-3.5" /> Today
          </button>
          <button
            className="flex w-full items-center gap-2 px-3 py-1.5 text-sm hover:bg-muted/50"
            onClick={() => {
              const tomorrow = new Date();
              tomorrow.setDate(tomorrow.getDate() + 1);
              tomorrow.setHours(0, 0, 0, 0);
              updateTask.mutate({ id: contextMenu.taskId, dueDate: tomorrow.toISOString() });
              setContextMenu(null);
            }}
          >
            <CalendarPlus className="h-3.5 w-3.5" /> Tomorrow
          </button>
          <button
            className="flex w-full items-center gap-2 px-3 py-1.5 text-sm hover:bg-muted/50"
            onClick={() => {
              const nextWeek = new Date();
              nextWeek.setDate(nextWeek.getDate() + 7);
              nextWeek.setHours(0, 0, 0, 0);
              updateTask.mutate({ id: contextMenu.taskId, dueDate: nextWeek.toISOString() });
              setContextMenu(null);
            }}
          >
            <CalendarRange className="h-3.5 w-3.5" /> Next week
          </button>
          <div className="my-1 border-t" />
          <button
            className="flex w-full items-center gap-2 px-3 py-1.5 text-sm hover:bg-muted/50"
            onClick={() => {
              const task = tasks?.find((t) => t.id === contextMenu.taskId);
              handleToggleComplete(contextMenu.taskId, task?.status ?? "INCOMPLETE");
              setContextMenu(null);
            }}
          >
            <CheckCircle2 className="h-3.5 w-3.5" />
            {tasks?.find((t) => t.id === contextMenu.taskId)?.status === "COMPLETE" ? "Mark incomplete" : "Mark complete"}
          </button>
          <div className="my-1 border-t" />
          <button
            className="flex w-full items-center gap-2 px-3 py-1.5 text-sm text-destructive hover:bg-muted/50"
            onClick={() => { deleteTask.mutate({ id: contextMenu.taskId }); setContextMenu(null); }}
          >
            <Trash2 className="h-3.5 w-3.5" /> Delete
          </button>
        </div>
      )}

      {/* Add to another project popover */}
      {addToProjectTaskId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20" onClick={() => setAddToProjectTaskId(null)}>
          <div className="rounded-lg border bg-white p-4 shadow-lg dark:bg-card min-w-[280px]" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-sm font-medium mb-3">Add to project</h3>
            <div className="space-y-1 max-h-[200px] overflow-y-auto">
              {allProjects?.filter(p => p.id !== projectId).map(p => (
                <button
                  key={p.id}
                  className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-muted/50"
                  onClick={() => addToProject.mutate({ taskId: addToProjectTaskId, projectId: p.id })}
                >
                  <FolderPlus className="h-3.5 w-3.5 text-muted-foreground" />
                  {p.name}
                </button>
              ))}
              {(!allProjects || allProjects.filter(p => p.id !== projectId).length === 0) && (
                <p className="text-xs text-muted-foreground px-2 py-1">No other projects available</p>
              )}
            </div>
            <button className="mt-3 text-xs text-muted-foreground hover:text-foreground" onClick={() => setAddToProjectTaskId(null)}>Cancel</button>
          </div>
        </div>
      )}

      {/* Add subtask dialog */}
      {subtaskParentId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20" onClick={() => { setSubtaskParentId(null); setSubtaskTitle(""); }}>
          <div className="rounded-lg border bg-white p-4 shadow-lg dark:bg-card min-w-[320px]" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-sm font-medium mb-3">Add subtask</h3>
            <Input
              value={subtaskTitle}
              onChange={(e) => setSubtaskTitle(e.target.value)}
              placeholder="Subtask name..."
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter" && subtaskTitle.trim()) {
                  createSubtask.mutate({
                    title: subtaskTitle.trim(),
                    parentTaskId: subtaskParentId,
                    projectId,
                  });
                }
              }}
            />
            <div className="flex justify-end gap-2 mt-3">
              <Button variant="ghost" size="sm" onClick={() => { setSubtaskParentId(null); setSubtaskTitle(""); }}>Cancel</Button>
              <Button
                size="sm"
                className="bg-[#4573D2] hover:bg-[#3A63B8]"
                disabled={!subtaskTitle.trim() || createSubtask.isPending}
                onClick={() => {
                  if (subtaskTitle.trim()) {
                    createSubtask.mutate({
                      title: subtaskTitle.trim(),
                      parentTaskId: subtaskParentId,
                      projectId,
                    });
                  }
                }}
              >
                {createSubtask.isPending ? "Adding..." : "Add subtask"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
