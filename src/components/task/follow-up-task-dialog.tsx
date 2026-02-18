"use client";

import { useState, useRef, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { toast } from "sonner";
import { Paperclip, Bold, Italic, AtSign, Sparkles, Smile } from "lucide-react";

interface FollowUpTaskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  originalTaskId: string;
  originalTaskTitle: string;
  projectId?: string;
  workspaceId?: string;
}

export function FollowUpTaskDialog({
  open,
  onOpenChange,
  originalTaskId,
  originalTaskTitle,
  projectId,
  workspaceId,
}: FollowUpTaskDialogProps) {
  const [title, setTitle] = useState(`Follow up: ${originalTaskTitle}`);
  const [description, setDescription] = useState("");
  const [assigneeId, setAssigneeId] = useState<string>("");
  const [dueDate, setDueDate] = useState("");
  const [selectedProjectId, setSelectedProjectId] = useState(projectId ?? "");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [attachedFiles, setAttachedFiles] = useState<File[]>([]);

  // Reset form when dialog opens with a (possibly different) task
  useEffect(() => {
    if (open) {
      setTitle(`Follow up: ${originalTaskTitle}`);
      setDescription("");
      setAssigneeId("");
      setDueDate("");
      setSelectedProjectId(projectId ?? "");
      setAttachedFiles([]);
    }
  }, [open, originalTaskTitle, projectId]);

  const utils = trpc.useUtils();

  const { data: workspaces } = trpc.workspaces.list.useQuery();
  const wsId = workspaceId || workspaces?.[0]?.id;
  const { data: members } = trpc.workspaces.getMembers.useQuery(
    { workspaceId: wsId! },
    { enabled: !!wsId }
  );
  const { data: projects } = trpc.projects.list.useQuery(
    { workspaceId: wsId! },
    { enabled: !!wsId }
  );

  const createAttachment = trpc.attachments.create.useMutation({
    onSuccess: () => {
      utils.tasks.get.invalidate({ id: originalTaskId });
    },
  });

  const uploadFiles = async (taskId: string) => {
    for (const file of attachedFiles) {
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
        toast.error(`Failed to upload ${file.name}`);
      }
    }
  };

  const createTask = trpc.tasks.create.useMutation({
    onSuccess: (newTask) => {
      if (attachedFiles.length > 0) {
        uploadFiles(newTask.id);
      }
      addDependency.mutate({
        taskId: newTask.id,
        dependsOnTaskId: originalTaskId,
      });
    },
  });

  const addDependency = trpc.tasks.addDependency.useMutation({
    onSuccess: () => {
      utils.tasks.list.invalidate();
      utils.tasks.myTasks.invalidate();
      utils.tasks.get.invalidate({ id: originalTaskId });
      toast.success("Follow-up task created and linked");
      onOpenChange(false);
      resetForm();
    },
  });

  const resetForm = () => {
    setTitle(`Follow up: ${originalTaskTitle}`);
    setDescription("");
    setAssigneeId("");
    setDueDate("");
    setSelectedProjectId(projectId ?? "");
    setAttachedFiles([]);
  };

  const handleCreate = () => {
    if (!title.trim()) {
      toast.error("Please enter a task name");
      return;
    }
    createTask.mutate({
      title: title.trim(),
      description: description || undefined,
      assigneeId: assigneeId || undefined,
      dueDate: dueDate ? new Date(dueDate + "T00:00:00.000Z").toISOString() : undefined,
      projectId: selectedProjectId || undefined,
      workspaceId: wsId,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Create Follow-Up Task</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <label className="text-xs font-medium text-muted-foreground">Task name</label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Follow up task name..."
              autoFocus
            />
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground">Description</label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add a description..."
              className="min-h-[80px] resize-none text-sm"
            />
          </div>

          {/* Formatting toolbar */}
          <div className="flex items-center gap-1 flex-wrap">
            <button type="button" className="rounded p-1.5 hover:bg-muted" title="Bold" onClick={() => setDescription(prev => prev + "**bold**")}>
              <Bold className="h-3.5 w-3.5 text-muted-foreground" />
            </button>
            <button type="button" className="rounded p-1.5 hover:bg-muted" title="Italic" onClick={() => setDescription(prev => prev + "*italic*")}>
              <Italic className="h-3.5 w-3.5 text-muted-foreground" />
            </button>
            <div className="h-4 w-px bg-gray-200 mx-0.5" />
            <button type="button" className="rounded p-1.5 hover:bg-muted" title="Attach file" onClick={() => fileInputRef.current?.click()}>
              <Paperclip className="h-3.5 w-3.5 text-muted-foreground" />
            </button>
            <button type="button" className="rounded p-1.5 hover:bg-muted" title="Emoji" onClick={() => toast.info("Emoji picker")}>
              <Smile className="h-3.5 w-3.5 text-muted-foreground" />
            </button>
            <button type="button" className="rounded p-1.5 hover:bg-muted" title="@mention" onClick={() => setDescription(prev => prev + "@")}>
              <AtSign className="h-3.5 w-3.5 text-muted-foreground" />
            </button>
            <button type="button" className="rounded p-1.5 hover:bg-muted" title="AI Assist" onClick={() => toast.info("AI writing assist activated")}>
              <Sparkles className="h-3.5 w-3.5 text-muted-foreground" />
            </button>
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              multiple
              onChange={(e) => {
                const files = Array.from(e.target.files || []);
                setAttachedFiles(prev => [...prev, ...files]);
                if (fileInputRef.current) fileInputRef.current.value = "";
              }}
            />
          </div>

          {/* Attached files preview */}
          {attachedFiles.length > 0 && (
            <div className="space-y-1">
              <span className="text-xs text-muted-foreground">Attached files:</span>
              {attachedFiles.map((file, i) => (
                <div key={i} className="flex items-center gap-2 rounded bg-muted/30 px-2 py-1 text-xs">
                  <Paperclip className="h-3 w-3 text-muted-foreground" />
                  <span className="flex-1 truncate">{file.name}</span>
                  <button type="button" onClick={() => setAttachedFiles(prev => prev.filter((_, j) => j !== i))} className="text-muted-foreground hover:text-destructive text-xs">Remove</button>
                </div>
              ))}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground">Assignee</label>
              <Select value={assigneeId} onValueChange={setAssigneeId}>
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue placeholder="Select assignee" />
                </SelectTrigger>
                <SelectContent>
                  {members?.map((m) => (
                    <SelectItem key={m.user.id} value={m.user.id}>
                      {m.user.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground">Project</label>
              <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue placeholder="Select project" />
                </SelectTrigger>
                <SelectContent>
                  {projects?.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground">Due date</label>
            <input
              type="date"
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
            />
          </div>

          <div className="flex justify-between pt-2">
            <p className="text-xs text-muted-foreground">
              Will be linked to: <strong>{originalTaskTitle}</strong>
            </p>
            <div className="flex gap-2">
              <Button variant="ghost" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button
                className="bg-[#4573D2] hover:bg-[#3A63B8]"
                onClick={handleCreate}
                disabled={createTask.isPending || addDependency.isPending}
              >
                {createTask.isPending ? "Creating..." : "Create task"}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
