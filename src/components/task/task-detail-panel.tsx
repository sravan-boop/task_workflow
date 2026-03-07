"use client";

import { useState, useRef, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  X,
  CheckCircle2,
  Circle,
  ThumbsUp,
  Paperclip,
  CalendarDays,
  User,
  ArrowRight,
  Copy,
  Trash2,
  Link2,
  FileText,
  Download,
  CopyPlus,
  Printer,
  ShieldCheck,
  Hash,
  Pencil,
  Clock,
  Plus,
  FolderPlus,
  Maximize2,
  Minimize2,
  Upload,
  UserPlus,
  Diamond,
  MoreHorizontal,
  ArrowRightLeft,
} from "lucide-react";
import { AiTaskSummary } from "@/components/ai/ai-task-summary";
import { RichTextEditor } from "@/components/editor/rich-text-editor";
import { ReactionGroup } from "@/components/reactions/reaction-group";
import { ImageProofing } from "@/components/proofing/image-proofing";
import { VideoRecorder } from "@/components/comments/video-recorder";
import { useUndo } from "@/contexts/undo-context";
import { useSession } from "next-auth/react";
import { FollowUpTaskDialog } from "@/components/task/follow-up-task-dialog";

interface TaskDetailPanelProps {
  taskId: string;
  onClose: () => void;
}

export function TaskDetailPanel({ taskId, onClose }: TaskDetailPanelProps) {
  const { data: session } = useSession();
  const { data: task, isLoading } = trpc.tasks.get.useQuery({ id: taskId });
  const { data: taskReactions } = trpc.reactions.listForTask.useQuery(
    { taskId },
    { enabled: !!taskId }
  );
  const utils = trpc.useUtils();
  const { pushUndo } = useUndo();
  const [newComment, setNewComment] = useState("");
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editCommentBody, setEditCommentBody] = useState("");
  const [proofingAttachment, setProofingAttachment] = useState<{ id: string; url: string; name: string } | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [videoDuration, setVideoDuration] = useState<number>(0);
  const [addProjectOpen, setAddProjectOpen] = useState(false);
  const [projectSearch, setProjectSearch] = useState("");
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showAddSubtask, setShowAddSubtask] = useState(false);
  const [newSubtaskTitle, setNewSubtaskTitle] = useState("");
  const [newSubtaskAssigneeId, setNewSubtaskAssigneeId] = useState<string | null>(null);
  const [depSearch, setDepSearch] = useState("");
  const [blockingSearch, setBlockingSearch] = useState("");
  const [followUpOpen, setFollowUpOpen] = useState(false);
  const [viewingSubtaskId, setViewingSubtaskId] = useState<string | null>(null);

  const [transferTaskOpen, setTransferTaskOpen] = useState(false);
  const [transferSearch, setTransferSearch] = useState("");

  // Queries for editable fields
  const { data: workspaces } = trpc.workspaces.list.useQuery();
  const workspaceId = workspaces?.[0]?.id;
  const { data: members } = trpc.workspaces.getMembers.useQuery(
    { workspaceId: workspaceId! },
    { enabled: !!workspaceId }
  );
  const { data: allProjects } = trpc.projects.list.useQuery(
    { workspaceId: workspaceId! },
    { enabled: !!workspaceId }
  );

  const updateTask = trpc.tasks.update.useMutation({
    onSuccess: () => {
      utils.tasks.get.invalidate({ id: taskId });
      utils.tasks.list.invalidate();
      utils.tasks.myTasks.invalidate();
    },
    onError: (err) => {
      toast.error(err.message || "Failed to update task");
    },
  });

  const transferOwnership = trpc.tasks.transferOwnership.useMutation({
    onSuccess: () => {
      toast.success("Task ownership transferred!");
      setTransferTaskOpen(false);
      utils.tasks.get.invalidate({ id: taskId });
    },
    onError: (err) => toast.error(err.message || "Failed to transfer ownership"),
  });

  const createComment = trpc.comments.create.useMutation({
    onSuccess: () => {
      utils.tasks.get.invalidate({ id: taskId });
      setNewComment("");
    },
  });

  const updateComment = trpc.comments.update.useMutation({
    onSuccess: () => {
      utils.tasks.get.invalidate({ id: taskId });
      setEditingCommentId(null);
      setEditCommentBody("");
    },
  });

  const createTask = trpc.tasks.create.useMutation({
    onSuccess: () => {
      utils.tasks.list.invalidate();
      utils.tasks.myTasks.invalidate();
      utils.tasks.get.invalidate({ id: taskId });
    },
  });

  const completeTask = trpc.tasks.complete.useMutation({
    onSuccess: () => {
      utils.tasks.get.invalidate({ id: taskId });
      utils.tasks.list.invalidate();
      utils.tasks.myTasks.invalidate();
      pushUndo("Task completed", () => {
        uncompleteTask.mutate({ id: taskId });
      });
    },
  });

  const uncompleteTask = trpc.tasks.uncomplete.useMutation({
    onSuccess: () => {
      utils.tasks.get.invalidate({ id: taskId });
      utils.tasks.list.invalidate();
      utils.tasks.myTasks.invalidate();
    },
  });

  const deleteTask = trpc.tasks.delete.useMutation({
    onSuccess: () => {
      utils.tasks.list.invalidate();
      utils.tasks.myTasks.invalidate();
      // Capture task data before it's gone for undo
      if (task) {
        const captured = {
          title: task.title,
          description: typeof task.description === "string" ? task.description : undefined,
          projectId: task.taskProjects?.[0]?.projectId,
          sectionId: task.taskProjects?.[0]?.sectionId ?? undefined,
          assigneeId: task.assigneeId ?? undefined,
        };
        pushUndo("Task deleted", () => {
          if (captured.projectId) {
            createTask.mutate({
              title: captured.title,
              projectId: captured.projectId,
              sectionId: captured.sectionId,
            });
          }
        });
      } else {
        toast.success("Task deleted");
      }
      onClose();
    },
    onError: (err) => {
      toast.error(err.message || "Failed to delete task");
    },
  });

  const duplicateTask = trpc.tasks.duplicate.useMutation({
    onSuccess: (newTask) => {
      utils.tasks.list.invalidate();
      utils.tasks.myTasks.invalidate();
      toast.success("Task duplicated", {
        action: {
          label: "View",
          onClick: () => {
            // Would navigate to new task
          },
        },
      });
    },
  });

  const toggleMilestone = trpc.tasks.toggleMilestone.useMutation({
    onSuccess: (data) => {
      utils.tasks.get.invalidate({ id: taskId });
      utils.tasks.list.invalidate();
      utils.tasks.myTasks.invalidate();
      const wasMilestone = data.isMilestone;
      pushUndo(wasMilestone ? "Marked as milestone" : "Removed milestone", () => {
        toggleMilestone.mutate({ id: taskId, isMilestone: !wasMilestone });
      });
    },
  });

  const createAttachment = trpc.attachments.create.useMutation({
    onSuccess: () => {
      utils.tasks.get.invalidate({ id: taskId });
      toast.success("File attached");
    },
  });

  const deleteAttachment = trpc.attachments.delete.useMutation({
    onSuccess: () => {
      utils.tasks.get.invalidate({ id: taskId });
      toast.success("File removed");
    },
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const formData = new FormData();
    formData.append("file", file);
    try {
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      if (!res.ok) throw new Error("Upload failed");
      const data = await res.json();
      createAttachment.mutate({
        taskId,
        fileName: data.fileName,
        fileUrl: data.fileUrl,
        fileSize: data.fileSize,
        mimeType: data.mimeType,
      });
    } catch {
      toast.error("Failed to upload file");
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const markAsApproval = trpc.tasks.markAsApproval.useMutation({
    onSuccess: (_data, variables) => {
      utils.tasks.get.invalidate({ id: taskId });
      utils.tasks.list.invalidate();
      utils.tasks.myTasks.invalidate();
      const msg = variables.isApproval ? "Marked as approval" : "Approval removed";
      toast.success(msg);
      pushUndo(msg, () => {
        markAsApproval.mutate({ id: taskId, isApproval: !variables.isApproval });
      });
    },
  });

  const setApprovalStatus = trpc.tasks.setApprovalStatus.useMutation({
    onSuccess: () => {
      utils.tasks.get.invalidate({ id: taskId });
    },
  });

  const addFollower = trpc.tasks.addFollower.useMutation({
    onSuccess: () => {
      utils.tasks.get.invalidate({ id: taskId });
      toast.success("Collaborator added");
    },
  });

  const removeFollower = trpc.tasks.removeFollower.useMutation({
    onSuccess: () => {
      utils.tasks.get.invalidate({ id: taskId });
      toast.success("Collaborator removed");
    },
  });

  const [peopleOpen, setPeopleOpen] = useState(false);
  const [peopleSearch, setPeopleSearch] = useState("");

  const removeDependency = trpc.tasks.removeDependency.useMutation({
    onSuccess: () => {
      utils.tasks.get.invalidate({ id: taskId });
    },
  });

  const addToProject = trpc.tasks.addToProject.useMutation({
    onSuccess: () => {
      utils.tasks.get.invalidate({ id: taskId });
      utils.tasks.list.invalidate();
      setAddProjectOpen(false);
      setProjectSearch("");
      toast.success("Added to project");
    },
  });

  const addDependency = trpc.tasks.addDependency.useMutation({
    onSuccess: () => {
      utils.tasks.get.invalidate({ id: taskId });
      toast.success("Dependency added");
      setDepSearch("");
      setBlockingSearch("");
    },
  });

  const { data: depSearchResults } = trpc.tasks.searchAll.useQuery(
    { workspaceId: workspaceId!, query: depSearch },
    { enabled: !!workspaceId && depSearch.length > 0 }
  );

  const { data: blockingSearchResults } = trpc.tasks.searchAll.useQuery(
    { workspaceId: workspaceId!, query: blockingSearch },
    { enabled: !!workspaceId && blockingSearch.length > 0 }
  );

  if (isLoading) {
    return (
      <div className={cn("border-l bg-white dark:bg-card", isFullscreen ? "fixed inset-0 z-[60] w-full" : "w-[500px]")}>
        <div className="p-6">
          <Skeleton className="h-8 w-3/4" />
          <Skeleton className="mt-4 h-20 w-full" />
        </div>
      </div>
    );
  }

  if (!task) {
    return (
      <div className={cn("flex items-center justify-center border-l bg-white dark:bg-card", isFullscreen ? "fixed inset-0 z-[60] w-full" : "w-[500px]")}>
        <p className="text-muted-foreground">Task not found</p>
      </div>
    );
  }

  const handleToggleComplete = () => {
    if (task.status === "COMPLETE") {
      uncompleteTask.mutate({ id: taskId });
    } else {
      completeTask.mutate({ id: taskId });
    }
  };

  const handlePrint = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;
    printWindow.document.write(`
      <html>
        <head>
          <title>${task.title}</title>
          <style>
            body { font-family: system-ui, sans-serif; padding: 40px; max-width: 800px; margin: 0 auto; }
            h1 { font-size: 24px; margin-bottom: 8px; }
            .meta { color: #666; font-size: 14px; margin-bottom: 24px; }
            .field { display: flex; gap: 12px; margin-bottom: 8px; font-size: 14px; }
            .field-label { color: #666; width: 120px; }
            .section { margin-top: 24px; }
            .section h2 { font-size: 16px; color: #666; margin-bottom: 8px; }
            .subtask { padding: 4px 0; font-size: 14px; }
            .comment { border-top: 1px solid #eee; padding: 12px 0; }
            .comment-author { font-weight: 600; font-size: 14px; }
            .comment-body { font-size: 14px; margin-top: 4px; }
            @media print { body { padding: 20px; } }
          </style>
        </head>
        <body>
          <h1>${task.title}</h1>
          <div class="meta">#${task.id.slice(0, 8)} &middot; ${task.status === "COMPLETE" ? "Complete" : "Incomplete"}</div>
          <div class="field"><span class="field-label">Assignee</span><span>${task.assignee?.name ?? "Unassigned"}</span></div>
          <div class="field"><span class="field-label">Due date</span><span>${task.dueDate ? new Date(task.dueDate).toLocaleDateString() : "None"}</span></div>
          ${task.subtasks && task.subtasks.length > 0 ? `
            <div class="section">
              <h2>Subtasks</h2>
              ${task.subtasks.map((s) => `<div class="subtask">${s.status === "COMPLETE" ? "\u2713" : "\u25CB"} ${s.title}</div>`).join("")}
            </div>
          ` : ""}
          ${task.comments && task.comments.length > 0 ? `
            <div class="section">
              <h2>Comments</h2>
              ${task.comments.map((c) => `
                <div class="comment">
                  <div class="comment-author">${c.author?.name ?? "Unknown"} &middot; ${new Date(c.createdAt).toLocaleDateString()}</div>
                  <div class="comment-body">${typeof c.body === "string" ? c.body : JSON.stringify(c.body)}</div>
                </div>
              `).join("")}
            </div>
          ` : ""}
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  const approvalBadge = task.isApproval && task.approvalStatus ? (
    <span
      className={cn(
        "ml-2 rounded-full px-2 py-0.5 text-[10px] font-medium",
        task.approvalStatus === "APPROVED" && "bg-green-100 text-green-700",
        task.approvalStatus === "REJECTED" && "bg-red-100 text-red-700",
        task.approvalStatus === "PENDING" && "bg-yellow-100 text-yellow-700",
        task.approvalStatus === "CHANGES_REQUESTED" && "bg-orange-100 text-orange-700"
      )}
    >
      {task.approvalStatus.replace("_", " ")}
    </span>
  ) : null;

  return (
    <div className={cn(
      "flex flex-col border-l bg-white dark:bg-card",
      isFullscreen ? "fixed inset-0 z-[60] w-full" : "w-[500px]"
    )}>
      {/* Header */}
      <div className="flex items-center justify-between border-b px-4 py-2">
        <div className="flex items-center gap-1">
          {task.isMilestone && (
            <Diamond className="h-4 w-4 text-amber-500 mr-1" />
          )}
          <Button
            variant="ghost"
            size="sm"
            className={cn(
              "gap-1.5 text-xs",
              task.status === "COMPLETE" && "text-green-600"
            )}
            onClick={handleToggleComplete}
          >
            {task.status === "COMPLETE" ? (
              <CheckCircle2 className="h-4 w-4" />
            ) : (
              <Circle className="h-4 w-4" />
            )}
            {task.status === "COMPLETE" ? "Completed" : "Mark complete"}
          </Button>
          {approvalBadge}
        </div>
        <div className="flex items-center gap-1">
          <button onClick={() => setIsFullscreen(!isFullscreen)} className="rounded-full p-1.5 hover:bg-muted" title="Toggle fullscreen">
            {isFullscreen ? <Minimize2 className="h-3.5 w-3.5 text-muted-foreground" /> : <Maximize2 className="h-3.5 w-3.5 text-muted-foreground" />}
          </button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => duplicateTask.mutate({ id: taskId })}
            title="Duplicate task"
          >
            <CopyPlus className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={handlePrint}
            title="Print task"
          >
            <Printer className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className={cn("h-7 w-7", task.isApproval && "text-blue-600")}
            onClick={() =>
              markAsApproval.mutate({
                id: taskId,
                isApproval: !task.isApproval,
              })
            }
            title={task.isApproval ? "Remove approval" : "Mark as approval"}
          >
            <ShieldCheck className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => {
              const url = `${window.location.origin}/my-tasks?task=${taskId}`;
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
              toast.success("Task link copied to clipboard");
            }}
            title="Copy task link"
          >
            <Copy className="h-3.5 w-3.5" />
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7">
                <MoreHorizontal className="h-3.5 w-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              <DropdownMenuItem onClick={() => {
                if (allProjects && allProjects.length > 0) {
                  setAddProjectOpen(true);
                }
              }}>
                <FolderPlus className="mr-2 h-4 w-4" />
                Add to another project
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => toggleMilestone.mutate({ id: taskId, isMilestone: !task?.isMilestone })}>
                <Diamond className="mr-2 h-4 w-4" />
                {task?.isMilestone ? "Remove milestone" : "Convert to milestone"}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => markAsApproval.mutate({ id: taskId, isApproval: !task?.isApproval })}>
                <ShieldCheck className="mr-2 h-4 w-4" />
                {task?.isApproval ? "Remove approval" : "Convert to approval"}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setShowAddSubtask(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Add subtask
              </DropdownMenuItem>
              {task.createdById === session?.user?.id && (
                <DropdownMenuItem onClick={() => setTransferTaskOpen(true)}>
                  <ArrowRightLeft className="mr-2 h-4 w-4" />
                  Transfer ownership
                </DropdownMenuItem>
              )}
              <DropdownMenuItem onClick={() => setFollowUpOpen(true)}>
                <CopyPlus className="mr-2 h-4 w-4" />
                Create follow-up task
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => toast.success("Select a parent task in the task detail panel")}>
                <ArrowRight className="mr-2 h-4 w-4" />
                Convert to subtask
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => toast.success("Task saved as template")}>
                <FileText className="mr-2 h-4 w-4" />
                Save as task template
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handlePrint}>
                <Printer className="mr-2 h-4 w-4" />
                Print task
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => duplicateTask.mutate({ id: taskId })}>
                <CopyPlus className="mr-2 h-4 w-4" />
                Duplicate task
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => {
                const url = `${window.location.origin}/my-tasks?task=${taskId}`;
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
                toast.success("Task link copied");
              }}>
                <Copy className="mr-2 h-4 w-4" />
                Copy task link
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-destructive hover:text-destructive"
            onClick={() => deleteTask.mutate({ id: taskId })}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={onClose}
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {/* Task ID */}
        <button
          onClick={() => {
            navigator.clipboard.writeText(task.id);
            toast.success("Task ID copied");
          }}
          className="mb-1 flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
          title="Click to copy full task ID"
        >
          <Hash className="h-3 w-3" />
          {task.id.slice(0, 8)}
        </button>

        {/* Title */}
        <Input
          defaultValue={task.title}
          onBlur={(e) => {
            if (e.target.value !== task.title) {
              updateTask.mutate({ id: taskId, title: e.target.value });
            }
          }}
          className="border-none px-0 text-xl font-medium shadow-none focus-visible:ring-0"
        />

        {/* Approval Actions */}
        {task.isApproval && task.approvalStatus === "PENDING" && (
          <div className="mt-3 flex gap-2">
            <Button
              size="sm"
              variant="outline"
              className="text-green-600 border-green-200 hover:bg-green-50"
              onClick={() =>
                setApprovalStatus.mutate({
                  id: taskId,
                  approvalStatus: "APPROVED",
                })
              }
            >
              Approve
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="text-red-600 border-red-200 hover:bg-red-50"
              onClick={() =>
                setApprovalStatus.mutate({
                  id: taskId,
                  approvalStatus: "REJECTED",
                })
              }
            >
              Reject
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="text-orange-600 border-orange-200 hover:bg-orange-50"
              onClick={() =>
                setApprovalStatus.mutate({
                  id: taskId,
                  approvalStatus: "CHANGES_REQUESTED",
                })
              }
            >
              Request Changes
            </Button>
          </div>
        )}

        {/* Reactions on task */}
        {taskReactions && session?.user?.id && (
          <div className="mt-3">
            <ReactionGroup
              taskId={taskId}
              reactions={taskReactions as any}
              currentUserId={session.user.id}
            />
          </div>
        )}

        {/* Fields */}
        <div className="mt-6 space-y-4">
          {/* Assignee */}
          <div className="flex items-center">
            <div className="flex w-32 items-center gap-2 text-sm text-muted-foreground">
              <User className="h-4 w-4" />
              Assignee
            </div>
            <Popover>
              <PopoverTrigger asChild>
                <button className="flex items-center gap-2 rounded px-2 py-1 hover:bg-muted/50">
                  {task.assignee ? (
                    <>
                      <Avatar className="h-6 w-6">
                        <AvatarFallback className="bg-[#4573D2] text-[10px] text-white">
                          {task.assignee.name
                            ?.split(" ")
                            .map((n) => n[0])
                            .join("")}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-sm">{task.assignee.name}</span>
                    </>
                  ) : (
                    <span className="text-sm text-muted-foreground">
                      No assignee
                    </span>
                  )}
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-56 p-1" align="start">
                <button
                  className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-muted/50"
                  onClick={() => updateTask.mutate({ id: taskId, assigneeId: null })}
                >
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Unassigned</span>
                </button>
                {members?.map((m) => (
                  <button
                    key={m.user.id}
                    className={cn(
                      "flex w-full items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-muted/50",
                      task.assigneeId === m.user.id && "bg-muted"
                    )}
                    onClick={() => updateTask.mutate({ id: taskId, assigneeId: m.user.id })}
                  >
                    <Avatar className="h-5 w-5">
                      <AvatarFallback className="bg-[#4573D2] text-[8px] text-white">
                        {m.user.name?.split(" ").map((n) => n[0]).join("")}
                      </AvatarFallback>
                    </Avatar>
                    {m.user.name}
                  </button>
                ))}
              </PopoverContent>
            </Popover>
          </div>

          {/* Due Date */}
          <div className="flex items-center">
            <div className="flex w-32 items-center gap-2 text-sm text-muted-foreground">
              <CalendarDays className="h-4 w-4" />
              Due date
            </div>
            <div className="flex items-center gap-2">
              <input
                type="date"
                className="rounded border border-transparent bg-transparent px-2 py-1 text-sm hover:border-gray-200 focus:border-[#4573D2] focus:outline-none"
                value={task.dueDate ? new Date(task.dueDate).toISOString().split("T")[0] : ""}
                onChange={(e) => {
                  const val = e.target.value;
                  updateTask.mutate({
                    id: taskId,
                    dueDate: val ? new Date(val + "T00:00:00.000Z").toISOString() : null,
                  });
                }}
              />
              {task.dueDate && (
                <button
                  onClick={() => updateTask.mutate({ id: taskId, dueDate: null })}
                  className="text-muted-foreground hover:text-destructive"
                  title="Clear due date"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>
          </div>

          {/* Quick Schedule */}
          <div className="flex items-center">
            <div className="flex w-32 items-center gap-2 text-sm text-muted-foreground">
              <CalendarDays className="h-4 w-4" />
              Schedule
            </div>
            <div className="flex gap-1.5">
              <Button
                variant="outline"
                size="sm"
                className="h-6 text-[10px] px-2"
                onClick={() => {
                  const today = new Date();
                  today.setHours(0, 0, 0, 0);
                  updateTask.mutate({ id: taskId, dueDate: today.toISOString() });
                  toast.success("Scheduled for today");
                }}
              >
                Today
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-6 text-[10px] px-2"
                onClick={() => {
                  const nextWeek = new Date();
                  nextWeek.setDate(nextWeek.getDate() + 7);
                  nextWeek.setHours(0, 0, 0, 0);
                  updateTask.mutate({ id: taskId, dueDate: nextWeek.toISOString() });
                  toast.success("Scheduled for next week");
                }}
              >
                Next week
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-6 text-[10px] px-2"
                onClick={() => {
                  const later = new Date();
                  later.setDate(later.getDate() + 30);
                  later.setHours(0, 0, 0, 0);
                  updateTask.mutate({ id: taskId, dueDate: later.toISOString() });
                  toast.success("Scheduled for later");
                }}
              >
                Later
              </Button>
            </div>
          </div>

          {/* Estimated Hours */}
          <div className="flex items-center">
            <div className="flex w-32 items-center gap-2 text-sm text-muted-foreground">
              <Clock className="h-4 w-4" />
              Estimate
            </div>
            <Input
              type="number"
              step="0.5"
              min="0"
              placeholder="Hours"
              defaultValue={task.estimatedHours ?? ""}
              onBlur={(e) => {
                const val = e.target.value ? parseFloat(e.target.value) : null;
                if (val !== task.estimatedHours) {
                  updateTask.mutate({ id: taskId, estimatedHours: val } as any);
                }
              }}
              className="h-7 w-24 text-sm"
            />
          </div>

          {/* Projects */}
          <div className="flex items-center">
            <div className="flex w-32 items-center gap-2 text-sm text-muted-foreground">
              <ArrowRight className="h-4 w-4" />
              Projects
            </div>
            <div className="flex flex-wrap items-center gap-1">
              {task.taskProjects?.map((tp) => (
                <span
                  key={tp.id}
                  className="rounded-full bg-muted px-2 py-0.5 text-xs"
                >
                  {tp.project.name}
                </span>
              ))}
              <Popover open={addProjectOpen} onOpenChange={setAddProjectOpen}>
                <PopoverTrigger asChild>
                  <button
                    className="flex h-5 w-5 items-center justify-center rounded-full hover:bg-muted"
                    title="Add to project"
                  >
                    <Plus className="h-3 w-3 text-muted-foreground" />
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-60 p-2" align="start">
                  <Input
                    value={projectSearch}
                    onChange={(e) => setProjectSearch(e.target.value)}
                    placeholder="Search projects..."
                    className="mb-2 h-7 text-sm"
                    autoFocus
                  />
                  <div className="max-h-40 overflow-y-auto">
                    {allProjects
                      ?.filter(
                        (p) =>
                          p.name.toLowerCase().includes(projectSearch.toLowerCase()) &&
                          !task.taskProjects?.some((tp) => tp.project.id === p.id)
                      )
                      .map((p) => (
                        <button
                          key={p.id}
                          className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-muted/50"
                          onClick={() => addToProject.mutate({ taskId, projectId: p.id })}
                        >
                          <div
                            className="h-2.5 w-2.5 rounded-sm"
                            style={{ backgroundColor: p.color }}
                          />
                          {p.name}
                        </button>
                      ))}
                    {allProjects?.filter(
                      (p) =>
                        p.name.toLowerCase().includes(projectSearch.toLowerCase()) &&
                        !task.taskProjects?.some((tp) => tp.project.id === p.id)
                    ).length === 0 && (
                        <p className="px-2 py-1.5 text-xs text-muted-foreground">
                          No projects available
                        </p>
                      )}
                  </div>
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {/* People / Collaborators */}
          <div className="flex items-start">
            <div className="flex w-32 items-center gap-2 pt-0.5 text-sm text-muted-foreground">
              <UserPlus className="h-4 w-4" />
              People
            </div>
            <div className="flex flex-1 flex-wrap items-center gap-1.5">
              {task.followers?.map((f) => (
                <div
                  key={f.id}
                  className="group flex items-center gap-1 rounded-full bg-muted/50 pl-0.5 pr-2 py-0.5"
                >
                  <Avatar className="h-5 w-5">
                    <AvatarFallback className="bg-[#4573D2] text-[8px] text-white">
                      {f.user.name?.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2)}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-xs">{f.user.name}</span>
                  <button
                    onClick={() => removeFollower.mutate({ taskId, userId: f.user.id })}
                    className="hidden text-muted-foreground hover:text-destructive group-hover:inline-flex"
                    title="Remove"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
              <Popover open={peopleOpen} onOpenChange={(open) => { setPeopleOpen(open); if (!open) setPeopleSearch(""); }}>
                <PopoverTrigger asChild>
                  <button
                    className="flex h-6 w-6 items-center justify-center rounded-full border border-dashed border-muted-foreground/40 hover:border-[#4573D2] hover:bg-muted/50"
                    title="Add people"
                  >
                    <Plus className="h-3 w-3 text-muted-foreground" />
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-60 p-2" align="start">
                  <Input
                    value={peopleSearch}
                    onChange={(e) => setPeopleSearch(e.target.value)}
                    placeholder="Search people..."
                    className="mb-2 h-7 text-sm"
                    autoFocus
                  />
                  <div className="max-h-48 overflow-y-auto">
                    {members
                      ?.filter(
                        (m) =>
                          (m.user.name?.toLowerCase().includes(peopleSearch.toLowerCase()) ||
                            m.user.email?.toLowerCase().includes(peopleSearch.toLowerCase())) &&
                          !task.followers?.some((f) => f.user.id === m.user.id) &&
                          m.user.id !== task.assigneeId
                      )
                      .map((m) => (
                        <button
                          key={m.user.id}
                          className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-muted/50"
                          onClick={() => {
                            addFollower.mutate({ taskId, userId: m.user.id });
                            setPeopleOpen(false);
                            setPeopleSearch("");
                          }}
                        >
                          <Avatar className="h-5 w-5">
                            <AvatarFallback className="bg-[#4573D2] text-[8px] text-white">
                              {m.user.name?.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex flex-col items-start">
                            <span>{m.user.name}</span>
                            <span className="text-[10px] text-muted-foreground">{m.user.email}</span>
                          </div>
                        </button>
                      ))}
                    {members?.filter(
                      (m) =>
                        (m.user.name?.toLowerCase().includes(peopleSearch.toLowerCase()) ||
                          m.user.email?.toLowerCase().includes(peopleSearch.toLowerCase())) &&
                        !task.followers?.some((f) => f.user.id === m.user.id) &&
                        m.user.id !== task.assigneeId
                    ).length === 0 && (
                        <p className="px-2 py-1.5 text-xs text-muted-foreground">
                          No people available
                        </p>
                      )}
                  </div>
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {/* Files */}
          <div className="flex items-start">
            <div className="flex w-32 items-center gap-2 pt-0.5 text-sm text-muted-foreground">
              <Upload className="h-4 w-4" />
              Files
            </div>
            <div className="flex-1">
              {task.attachments && (task.attachments as any[]).length > 0 && (
                <div className="space-y-1 mb-2">
                  {(task.attachments as any[]).map((att: any) => {
                    const isImage = att.mimeType?.startsWith("image/");
                    return (
                      <div
                        key={att.id}
                        className={cn(
                          "flex items-center gap-2 rounded bg-muted/30 px-2 py-1.5",
                          isImage && "cursor-pointer hover:bg-muted/50"
                        )}
                        onClick={
                          isImage
                            ? () =>
                              setProofingAttachment({
                                id: att.id,
                                url: att.fileUrl,
                                name: att.fileName,
                              })
                            : undefined
                        }
                      >
                        <Paperclip className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                        <span className="flex-1 truncate text-xs">
                          {att.fileName}
                        </span>
                        <span className="text-[10px] text-muted-foreground shrink-0">
                          {att.fileSize >= 1024 * 1024
                            ? `${(att.fileSize / (1024 * 1024)).toFixed(1)} MB`
                            : `${(att.fileSize / 1024).toFixed(0)} KB`}
                        </span>
                        <a
                          href={att.fileUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-muted-foreground hover:text-[#4573D2] shrink-0"
                          onClick={(e) => e.stopPropagation()}
                          title="Download"
                        >
                          <Download className="h-3 w-3" />
                        </a>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteAttachment.mutate({ id: att.id });
                          }}
                          className="text-muted-foreground hover:text-destructive shrink-0"
                          title="Remove file"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                onChange={handleFileUpload}
              />
              <button className="text-sm text-[#4573D2] hover:underline" onClick={() => fileInputRef.current?.click()}>
                Attach a file
              </button>
            </div>
          </div>

          {/* Milestone toggle */}
          <div className="flex items-center">
            <div className="flex w-32 items-center gap-2 text-sm text-muted-foreground">
              <Diamond className="h-4 w-4" />
              Milestone
            </div>
            <button
              className={cn("text-sm", task.isMilestone ? "text-amber-600 font-medium" : "text-muted-foreground hover:text-foreground")}
              onClick={() => toggleMilestone.mutate({ id: taskId, isMilestone: !task.isMilestone })}
            >
              {task.isMilestone ? "Milestone" : "Mark as milestone"}
            </button>
          </div>

          {/* Dependencies */}
          <div className="flex items-start">
            <div className="flex w-32 items-center gap-2 pt-0.5 text-sm text-muted-foreground">
              <Link2 className="h-4 w-4" />
              Dependencies
            </div>
            <div className="flex-1 space-y-4">
              {/* Blocked by */}
              <div>
                <div className="mb-1.5 text-xs font-semibold text-muted-foreground">Blocked by</div>
                {task.dependsOn && task.dependsOn.length > 0 && (
                  <div className="space-y-1 mb-2">
                    {task.dependsOn.map((dep) => (
                      <div
                        key={dep.id}
                        className="flex items-center gap-2 rounded bg-muted/50 px-2 py-1"
                      >
                        {dep.dependsOn.status === "COMPLETE" ? (
                          <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />
                        ) : (
                          <Circle className="h-3.5 w-3.5 text-[#cfcbcb]" />
                        )}
                        <span className="flex-1 text-xs">
                          {dep.dependsOn.title}
                        </span>
                        <button
                          onClick={() =>
                            removeDependency.mutate({ id: dep.id })
                          }
                          className="text-muted-foreground hover:text-destructive"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                <div className="relative">
                  <Input
                    value={depSearch}
                    onChange={(e) => setDepSearch(e.target.value)}
                    placeholder="Find a task..."
                    className="h-7 text-xs"
                  />
                  {depSearch && depSearchResults && (
                    <div className="absolute left-0 right-0 z-10 mt-1 max-h-40 overflow-y-auto rounded border bg-white shadow-md dark:bg-card">
                      {depSearchResults
                        .filter((t) => t.id !== taskId && t.status !== "COMPLETE" && !task?.dependsOn?.some((d) => d.dependsOn.id === t.id))
                        .map((t) => (
                          <button
                            key={t.id}
                            className="flex w-full items-center gap-2 px-2 py-1.5 text-xs hover:bg-muted/50"
                            onClick={() => {
                              addDependency.mutate({ taskId, dependsOnTaskId: t.id });
                              setDepSearch("");
                            }}
                          >
                            <Circle className="h-3 w-3 text-[#cfcbcb]" />
                            <span className="flex-1 truncate text-left">{t.title}</span>
                            {t.assignee?.name && (
                              <span className="text-[10px] text-muted-foreground">{t.assignee.name}</span>
                            )}
                          </button>
                        ))}
                      {depSearchResults.filter((t) => t.id !== taskId && t.status !== "COMPLETE" && !task?.dependsOn?.some((d) => d.dependsOn.id === t.id)).length === 0 && (
                        <p className="px-2 py-1.5 text-xs text-muted-foreground">No matching tasks</p>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Blocking */}
              <div>
                <div className="mb-1.5 text-xs font-semibold text-muted-foreground">Blocking</div>
                {task.blocking && task.blocking.length > 0 && (
                  <div className="space-y-1 mb-2">
                    {task.blocking.map((dep) => (
                      <div
                        key={dep.id}
                        className="flex items-center gap-2 rounded bg-orange-50 px-2 py-1 dark:bg-orange-900/20"
                      >
                        {dep.task.status === "COMPLETE" ? (
                          <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />
                        ) : (
                          <Circle className="h-3.5 w-3.5 text-[#cfcbcb]" />
                        )}
                        <span className="flex-1 text-xs">
                          {dep.task.title}
                        </span>
                        <button
                          onClick={() =>
                            removeDependency.mutate({ id: dep.id })
                          }
                          className="text-muted-foreground hover:text-destructive"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                <div className="relative">
                  <Input
                    value={blockingSearch}
                    onChange={(e) => setBlockingSearch(e.target.value)}
                    placeholder="Find a task..."
                    className="h-7 text-xs"
                  />
                  {blockingSearch && blockingSearchResults && (
                    <div className="absolute left-0 right-0 z-10 mt-1 max-h-40 overflow-y-auto rounded border bg-white shadow-md dark:bg-card">
                      {blockingSearchResults
                        .filter((t) => t.id !== taskId && t.status !== "COMPLETE" && !task?.blocking?.some((d) => d.task.id === t.id))
                        .map((t) => (
                          <button
                            key={t.id}
                            className="flex w-full items-center gap-2 px-2 py-1.5 text-xs hover:bg-muted/50"
                            onClick={() => {
                              addDependency.mutate({ taskId: t.id, dependsOnTaskId: taskId });
                              setBlockingSearch("");
                            }}
                          >
                            <Circle className="h-3 w-3 text-[#cfcbcb]" />
                            <span className="flex-1 truncate text-left">{t.title}</span>
                            {t.assignee?.name && (
                              <span className="text-[10px] text-muted-foreground">{t.assignee.name}</span>
                            )}
                          </button>
                        ))}
                      {blockingSearchResults.filter((t) => t.id !== taskId && t.status !== "COMPLETE" && !task?.blocking?.some((d) => d.task.id === t.id)).length === 0 && (
                        <p className="px-2 py-1.5 text-xs text-muted-foreground">No matching tasks</p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* AI Summary */}
        <div className="mt-6">
          <AiTaskSummary taskId={taskId} />
        </div>

        {/* Description */}
        <div className="mt-6">
          <h3 className="mb-2 text-sm font-medium text-[#6d6e6f]">
            Description
          </h3>
          <RichTextEditor
            content={
              typeof task.description === "string" ? task.description : ""
            }
            onChange={(html) => {
              updateTask.mutate({ id: taskId, description: html });
            }}
            placeholder="Add a description..."
            minimal
            className="border-none"
          />
        </div>

        {/* Subtasks */}
        <div className="mt-6">
          <h3 className="mb-2 text-sm font-medium text-[#6d6e6f]">
            Subtasks
          </h3>
          <div className="space-y-1">
            {task.subtasks && task.subtasks.map((subtask) => (
              <div key={subtask.id} className="flex w-full items-center gap-2 rounded px-2 py-1 hover:bg-muted/50 group">
                <button
                  className="flex-1 flex items-center gap-2 text-left"
                  onClick={() => setViewingSubtaskId(subtask.id)}
                >
                  <span
                    onClick={(e) => {
                      e.stopPropagation();
                      if (subtask.status === "COMPLETE") {
                        uncompleteTask.mutate({ id: subtask.id });
                      } else {
                        completeTask.mutate({ id: subtask.id });
                      }
                    }}
                  >
                    {subtask.status === "COMPLETE" ? (
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                    ) : (
                      <Circle className="h-4 w-4 text-[#cfcbcb] hover:text-green-600" />
                    )}
                  </span>
                  <span
                    className={cn(
                      "text-sm flex-1",
                      subtask.status === "COMPLETE" &&
                      "text-muted-foreground line-through"
                    )}
                  >
                    {subtask.title}
                  </span>
                </button>
                <Popover>
                  <PopoverTrigger asChild>
                    <button className={cn("h-6 w-6 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0", subtask.assignee && "opacity-100")}>
                      {subtask.assignee ? (
                        <Avatar className="h-5 w-5" title={subtask.assignee.name ?? ""}>
                          <AvatarFallback className="bg-[#4573D2] text-[8px] text-white">
                            {subtask.assignee.name?.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2)}
                          </AvatarFallback>
                        </Avatar>
                      ) : (
                        <UserPlus className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                      )}
                    </button>
                  </PopoverTrigger>
                  {/* Using a Portal so the popover isn't clipped by the side panel's overflow-y-auto */}
                  <PopoverContent className="w-56 p-1 z-[9999]" align="end" side="top" sideOffset={8}>
                    <button
                      className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-muted/50"
                      onClick={() => updateTask.mutate({ id: subtask.id, assigneeId: null })}
                    >
                      <User className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground">Unassigned</span>
                    </button>
                    {members?.map((m) => (
                      <button
                        key={m.user.id}
                        className={cn(
                          "flex w-full items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-muted/50",
                          subtask.assigneeId === m.user.id && "bg-muted"
                        )}
                        onClick={() => updateTask.mutate({ id: subtask.id, assigneeId: m.user.id })}
                      >
                        <Avatar className="h-5 w-5">
                          <AvatarFallback className="bg-[#4573D2] text-[8px] text-white">
                            {m.user.name?.split(" ").map((n) => n[0]).join("")}
                          </AvatarFallback>
                        </Avatar>
                        {m.user.name}
                      </button>
                    ))}
                  </PopoverContent>
                </Popover>
              </div>
            ))}
            {showAddSubtask ? (
              <form onSubmit={(e) => { e.preventDefault(); if (newSubtaskTitle.trim()) { createTask.mutate({ title: newSubtaskTitle.trim(), parentTaskId: taskId, projectId: task.taskProjects?.[0]?.projectId, workspaceId: task.workspaceId, assigneeId: newSubtaskAssigneeId || undefined }, { onSuccess: () => { utils.tasks.get.invalidate({ id: taskId }); setNewSubtaskTitle(""); setNewSubtaskAssigneeId(null); setShowAddSubtask(false); } }); } }} className="flex items-center gap-2 px-2 py-1">
                <Circle className="h-4 w-4 text-[#cfcbcb]" />
                <Input value={newSubtaskTitle} onChange={(e) => setNewSubtaskTitle(e.target.value)} placeholder="Subtask name..." className="h-7 text-sm flex-1" autoFocus />
                <Popover>
                  <PopoverTrigger asChild>
                    <button type="button" className="flex items-center gap-1 h-7 px-1.5 rounded hover:bg-muted/50 text-muted-foreground hover:text-foreground">
                      {newSubtaskAssigneeId ? (
                        <Avatar className="h-5 w-5">
                          <AvatarFallback className="bg-[#4573D2] text-[8px] text-white">
                            {members?.find((m) => m.user.id === newSubtaskAssigneeId)?.user.name?.split(" ").map((n) => n[0]).join("")}
                          </AvatarFallback>
                        </Avatar>
                      ) : (
                        <UserPlus className="h-4 w-4" />
                      )}
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="w-56 p-1 z-[9999]" align="end" side="top" sideOffset={8}>
                    <div className="text-xs font-medium text-muted-foreground px-2 py-1.5">Assign to</div>
                    {newSubtaskAssigneeId && (
                      <button
                        type="button"
                        className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-muted/50 text-muted-foreground"
                        onClick={() => setNewSubtaskAssigneeId(null)}
                      >
                        <X className="h-4 w-4" /> Unassign
                      </button>
                    )}
                    {members?.map((m) => (
                      <button
                        key={m.user.id}
                        type="button"
                        className={cn(
                          "flex w-full items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-muted/50",
                          newSubtaskAssigneeId === m.user.id && "bg-muted"
                        )}
                        onClick={() => setNewSubtaskAssigneeId(m.user.id)}
                      >
                        <Avatar className="h-5 w-5">
                          <AvatarFallback className="bg-[#4573D2] text-[8px] text-white">
                            {m.user.name?.split(" ").map((n) => n[0]).join("")}
                          </AvatarFallback>
                        </Avatar>
                        {m.user.name}
                      </button>
                    ))}
                  </PopoverContent>
                </Popover>
                <Button type="submit" size="sm" className="h-7">Add</Button>
              </form>
            ) : (
              <button onClick={() => setShowAddSubtask(true)} className="flex items-center gap-2 px-2 py-1.5 text-sm text-[#4573D2] hover:bg-muted/50 rounded">
                <Plus className="h-3.5 w-3.5" /> Add subtask
              </button>
            )}
          </div>
        </div>

        <Separator className="my-6" />

        {/* Comments */}
        <div>
          <h3 className="mb-4 text-sm font-medium text-[#6d6e6f]">
            Activity
          </h3>
          {task.comments && task.comments.length > 0 ? (
            <div className="space-y-4">
              {task.comments.map((comment) => {
                const isEditing = editingCommentId === comment.id;
                const isOwn = comment.authorId === session?.user?.id;
                const wasEdited =
                  new Date(comment.updatedAt).getTime() -
                  new Date(comment.createdAt).getTime() >
                  1000;

                return (
                  <div key={comment.id} className="flex gap-3">
                    <Avatar className="h-7 w-7">
                      <AvatarFallback className="bg-muted text-xs">
                        {comment.author?.name
                          ?.split(" ")
                          .map((n) => n[0])
                          .join("")}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">
                          {comment.author?.name}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {new Date(comment.createdAt).toLocaleDateString()}
                        </span>
                        {wasEdited && (
                          <span className="text-xs text-muted-foreground italic">
                            (edited)
                          </span>
                        )}
                        {isOwn && !isEditing && (
                          <button
                            onClick={() => {
                              setEditingCommentId(comment.id);
                              setEditCommentBody(
                                typeof comment.body === "string"
                                  ? comment.body
                                  : JSON.stringify(comment.body)
                              );
                            }}
                            className="text-muted-foreground hover:text-foreground"
                            title="Edit comment"
                          >
                            <Pencil className="h-3 w-3" />
                          </button>
                        )}
                      </div>
                      {isEditing ? (
                        <div className="mt-1 flex gap-2">
                          <Input
                            value={editCommentBody}
                            onChange={(e) =>
                              setEditCommentBody(e.target.value)
                            }
                            className="h-7 text-sm"
                            autoFocus
                          />
                          <Button
                            size="sm"
                            className="h-7"
                            onClick={() => {
                              if (editCommentBody.trim()) {
                                updateComment.mutate({
                                  id: comment.id,
                                  body: editCommentBody.trim(),
                                });
                              }
                            }}
                          >
                            Save
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7"
                            onClick={() => {
                              setEditingCommentId(null);
                              setEditCommentBody("");
                            }}
                          >
                            Cancel
                          </Button>
                        </div>
                      ) : (
                        <>
                          <p className="mt-1 text-sm text-[#6d6e6f]">
                            {typeof comment.body === "string"
                              ? comment.body
                              : JSON.stringify(comment.body)}
                          </p>
                          {(comment as any).videoUrl && (
                            <video
                              src={(comment as any).videoUrl}
                              controls
                              className="mt-2 max-w-[280px] rounded"
                              style={{ maxHeight: 180 }}
                            />
                          )}
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No activity yet</p>
          )}

          {/* Add Comment */}
          <form
            className="mt-4 flex items-center gap-3"
            onSubmit={(e) => {
              e.preventDefault();
              if (newComment.trim()) {
                createComment.mutate({
                  taskId,
                  body: newComment.trim(),
                  ...(videoUrl ? { videoUrl, videoDuration } : {}),
                });
                setVideoUrl(null);
                setVideoDuration(0);
              }
            }}
          >
            <Avatar className="h-7 w-7">
              <AvatarFallback className="bg-[#4573D2] text-xs text-white">
                {session?.user?.name
                  ?.split(" ")
                  .map((n) => n[0])
                  .join("")
                  .toUpperCase()
                  .slice(0, 2) ?? "U"}
              </AvatarFallback>
            </Avatar>
            <Input
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Add a comment... (press Enter)"
              className="h-8 text-sm"
            />
            <VideoRecorder
              onRecorded={(url, dur) => {
                setVideoUrl(url);
                setVideoDuration(dur);
                setNewComment((prev) =>
                  prev || "Video message"
                );
              }}
            />
          </form>
          {videoUrl && (
            <div className="ml-10 mt-1 flex items-center gap-2">
              <video
                src={videoUrl}
                className="h-10 w-16 rounded bg-black object-cover"
              />
              <span className="text-xs text-muted-foreground">
                Video attached
              </span>
              <button
                onClick={() => {
                  setVideoUrl(null);
                  setVideoDuration(0);
                }}
                className="text-xs text-red-500 hover:text-red-600"
              >
                Remove
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Image Proofing Overlay */}
      {proofingAttachment && (
        <ImageProofing
          attachmentId={proofingAttachment.id}
          imageUrl={proofingAttachment.url}
          fileName={proofingAttachment.name}
          onClose={() => setProofingAttachment(null)}
        />
      )}

      {/* Follow-Up Task Dialog */}
      <FollowUpTaskDialog
        open={followUpOpen}
        onOpenChange={setFollowUpOpen}
        originalTaskId={taskId}
        originalTaskTitle={task.title}
        projectId={task.taskProjects?.[0]?.projectId}
        workspaceId={task.workspaceId}
      />

      {/* Subtask Detail Panel */}
      {viewingSubtaskId && (
        <div className="fixed inset-0 z-[60] flex justify-end bg-black/20" onClick={() => setViewingSubtaskId(null)}>
          <div className="w-full max-w-xl" onClick={(e) => e.stopPropagation()}>
            <TaskDetailPanel taskId={viewingSubtaskId} onClose={() => setViewingSubtaskId(null)} />
          </div>
        </div>
      )}

      {/* Transfer Ownership Dialog */}
      <Dialog open={transferTaskOpen} onOpenChange={setTransferTaskOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Transfer Task Ownership</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="mb-4 text-sm text-muted-foreground">
              Select a workspace member to transfer ownership of this task to.
            </p>
            <Input
              value={transferSearch}
              onChange={(e) => setTransferSearch(e.target.value)}
              placeholder="Search members..."
              className="mb-4"
              autoFocus
            />
            <div className="max-h-60 overflow-y-auto space-y-1">
              {members
                ?.filter(
                  (m) =>
                    m.user.id !== session?.user?.id &&
                    (m.user.name?.toLowerCase().includes(transferSearch.toLowerCase()) ||
                      m.user.email?.toLowerCase().includes(transferSearch.toLowerCase()))
                )
                .map((m) => (
                  <button
                    key={m.user.id}
                    className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors border border-transparent hover:bg-muted/50"
                    onClick={() => {
                      transferOwnership.mutate({
                        taskId: taskId,
                        newOwnerId: m.user.id,
                      });
                    }}
                    disabled={transferOwnership.isPending}
                  >
                    <Avatar className="h-6 w-6">
                      <AvatarFallback className="bg-[#4573D2] text-[10px] text-white">
                        {m.user.name?.charAt(0).toUpperCase() || "U"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col items-start flex-1">
                      <span className="font-medium">{m.user.name}</span>
                      <span className="text-[10px] text-muted-foreground">{m.user.email}</span>
                    </div>
                  </button>
                ))}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
