"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { MessageSquare, Send } from "lucide-react";
import { formatDistanceToNow } from "@/lib/format";
import { toast } from "sonner";

interface ProjectMessagesViewProps {
  projectId: string;
}

export function ProjectMessagesView({ projectId }: ProjectMessagesViewProps) {
  const { data: session } = useSession();
  const [newMessage, setNewMessage] = useState("");

  const { data: statusUpdates, isLoading } =
    trpc.projects.statusUpdates.useQuery({ projectId });
  const utils = trpc.useUtils();

  const createUpdate = trpc.projects.createStatusUpdate.useMutation({
    onSuccess: () => {
      utils.projects.statusUpdates.invalidate({ projectId });
      setNewMessage("");
      toast.success("Message posted");
    },
    onError: () => {
      toast.error("Failed to post message");
    },
  });

  const handleSubmit = () => {
    if (!newMessage.trim()) return;
    createUpdate.mutate({
      projectId,
      status: "ON_TRACK",
      title: "Project message",
      body: newMessage.trim(),
    });
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="mx-auto max-w-2xl space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mx-auto max-w-2xl">
        {/* Compose */}
        <div className="mb-6 rounded-lg border bg-white p-4 dark:bg-gray-950">
          <div className="flex gap-3">
            <Avatar className="h-8 w-8 shrink-0">
              <AvatarFallback className="bg-[#4573D2] text-xs text-white">
                {session?.user?.name
                  ?.split(" ")
                  .map((n) => n[0])
                  .join("") || "U"}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <Textarea
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Send a message to your team..."
                className="min-h-[80px] resize-none border-0 p-0 text-sm shadow-none focus-visible:ring-0"
              />
              <div className="mt-2 flex justify-end">
                <Button
                  size="sm"
                  disabled={!newMessage.trim() || createUpdate.isPending}
                  onClick={handleSubmit}
                  className="gap-1.5 bg-[#4573D2] text-white hover:bg-[#3a63b8]"
                >
                  <Send className="h-3.5 w-3.5" />
                  {createUpdate.isPending ? "Sending..." : "Send"}
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Messages list */}
        {!statusUpdates || statusUpdates.length === 0 ? (
          <div className="flex flex-col items-center justify-center px-6 py-16">
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800">
              <MessageSquare className="h-7 w-7 text-[#6d6e6f] dark:text-gray-400" />
            </div>
            <h3 className="mb-1 text-sm font-semibold text-[#1e1f21] dark:text-gray-200">
              No messages yet
            </h3>
            <p className="max-w-sm text-center text-xs text-[#6d6e6f] dark:text-gray-400">
              Use messages to communicate with your team about this project.
              Share updates, ask questions, and keep everyone aligned.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {statusUpdates.map((update) => (
              <div
                key={update.id}
                className="rounded-lg border bg-white p-4 dark:bg-gray-950"
              >
                <div className="flex items-start gap-3">
                  <Avatar className="h-8 w-8 shrink-0">
                    <AvatarFallback className="bg-[#4573D2] text-xs text-white">
                      {update.author.name
                        ?.split(" ")
                        .map((n: string) => n[0])
                        .join("") || "U"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-[#1e1f21] dark:text-gray-200">
                        {update.author.name}
                      </span>
                      <span className="text-xs text-[#6d6e6f] dark:text-gray-500">
                        {formatDistanceToNow(new Date(update.createdAt))}
                      </span>
                    </div>
                    <p className="mt-1.5 text-sm whitespace-pre-wrap text-[#1e1f21] dark:text-gray-300">
                      {typeof update.body === "string"
                        ? update.body
                        : JSON.stringify(update.body)}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
