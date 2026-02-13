"use client";

import { trpc } from "@/lib/trpc";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  FileText,
  Image,
  FileArchive,
  File,
  Download,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatDistanceToNow } from "@/lib/format";

interface ProjectFilesViewProps {
  projectId: string;
}

function getFileIcon(mimeType: string) {
  if (mimeType.startsWith("image/")) return Image;
  if (mimeType.includes("pdf") || mimeType.includes("document"))
    return FileText;
  if (mimeType.includes("zip") || mimeType.includes("archive"))
    return FileArchive;
  return File;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function ProjectFilesView({ projectId }: ProjectFilesViewProps) {
  const { data: tasks, isLoading } = trpc.tasks.list.useQuery({ projectId });

  // Collect all attachments from all tasks
  const attachments =
    tasks
      ?.flatMap((task) =>
        (task as any).attachments?.map((att: any) => ({
          ...att,
          taskTitle: task.title,
          taskId: task.id,
        })) ?? []
      )
      .sort(
        (a: any, b: any) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      ) ?? [];

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-40 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  if (attachments.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center px-6 py-24">
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800">
          <File className="h-7 w-7 text-[#6d6e6f] dark:text-gray-400" />
        </div>
        <h3 className="mb-1 text-sm font-semibold text-[#1e1f21] dark:text-gray-200">
          No files yet
        </h3>
        <p className="max-w-sm text-center text-xs text-[#6d6e6f] dark:text-gray-400">
          Files attached to tasks in this project will appear here. Add
          attachments to tasks to see them in this view.
        </p>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm text-[#6d6e6f] dark:text-gray-400">
          {attachments.length} file{attachments.length !== 1 ? "s" : ""}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {attachments.map((attachment: any) => {
          const Icon = getFileIcon(attachment.mimeType);
          const isImage = attachment.mimeType?.startsWith("image/");

          return (
            <Card
              key={attachment.id}
              className="group overflow-hidden border transition-shadow hover:shadow-md"
            >
              {/* Preview area */}
              <div className="relative flex h-28 items-center justify-center bg-gray-50 dark:bg-gray-900">
                {isImage ? (
                  <img
                    src={attachment.fileUrl}
                    alt={attachment.fileName}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <Icon className="h-10 w-10 text-[#6d6e6f]/40" />
                )}
                {/* Hover overlay */}
                <div className="absolute inset-0 flex items-center justify-center gap-2 bg-black/0 opacity-0 transition-all group-hover:bg-black/40 group-hover:opacity-100">
                  <Button
                    variant="secondary"
                    size="icon"
                    className="h-8 w-8"
                    asChild
                  >
                    <a
                      href={attachment.fileUrl}
                      download={attachment.fileName}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <Download className="h-3.5 w-3.5" />
                    </a>
                  </Button>
                  <Button
                    variant="secondary"
                    size="icon"
                    className="h-8 w-8"
                    asChild
                  >
                    <a
                      href={attachment.fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  </Button>
                </div>
              </div>

              {/* Info */}
              <div className="p-3">
                <p className="truncate text-xs font-medium text-[#1e1f21] dark:text-gray-200">
                  {attachment.fileName}
                </p>
                <p className="mt-0.5 text-[10px] text-[#6d6e6f] dark:text-gray-500">
                  {formatFileSize(attachment.fileSize)} &middot;{" "}
                  {formatDistanceToNow(new Date(attachment.createdAt))}
                </p>
                <p className="mt-1 truncate text-[10px] text-[#9ca0a4] dark:text-gray-600">
                  From: {attachment.taskTitle}
                </p>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
