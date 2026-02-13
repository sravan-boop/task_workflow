"use client";

import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { SmilePlus } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

const EMOJI_MAP: Record<string, string> = {
  thumbsUp: "\uD83D\uDC4D",
  heart: "\u2764\uFE0F",
  celebration: "\uD83C\uDF89",
  clap: "\uD83D\uDC4F",
  fire: "\uD83D\uDD25",
};

const EMOJI_LIST = Object.entries(EMOJI_MAP);

interface ReactionGroupProps {
  taskId?: string;
  commentId?: string;
  reactions: Array<{
    id: string;
    emoji: string;
    userId: string;
    user: { id: string; name: string };
  }>;
  currentUserId: string;
}

export function ReactionGroup({
  taskId,
  commentId,
  reactions,
  currentUserId,
}: ReactionGroupProps) {
  const utils = trpc.useUtils();

  const toggleReaction = trpc.reactions.toggle.useMutation({
    onSuccess: () => {
      if (taskId) {
        utils.reactions.listForTask.invalidate({ taskId });
        utils.tasks.get.invalidate({ id: taskId });
      }
      if (commentId) {
        utils.reactions.listForComment.invalidate({ commentId });
      }
    },
  });

  const handleToggle = (emoji: string) => {
    toggleReaction.mutate({ emoji: emoji as "thumbsUp" | "heart" | "celebration" | "clap" | "fire", taskId, commentId });
  };

  // Group reactions by emoji
  const grouped = reactions.reduce(
    (acc, r) => {
      if (!acc[r.emoji]) acc[r.emoji] = [];
      acc[r.emoji].push(r);
      return acc;
    },
    {} as Record<string, typeof reactions>
  );

  return (
    <div className="flex flex-wrap items-center gap-1">
      {Object.entries(grouped).map(([emoji, reacts]) => {
        const userReacted = reacts.some((r) => r.userId === currentUserId);
        return (
          <button
            key={emoji}
            onClick={() => handleToggle(emoji)}
            className={cn(
              "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs transition-colors",
              userReacted
                ? "border-blue-300 bg-blue-50 dark:border-blue-700 dark:bg-blue-900/30"
                : "border-gray-200 hover:bg-gray-100 dark:border-gray-700 dark:hover:bg-gray-800"
            )}
            title={reacts.map((r) => r.user.name).join(", ")}
          >
            <span>{EMOJI_MAP[emoji] ?? emoji}</span>
            <span>{reacts.length}</span>
          </button>
        );
      })}

      <Popover>
        <PopoverTrigger asChild>
          <Button variant="ghost" size="icon" className="h-6 w-6">
            <SmilePlus className="h-3.5 w-3.5 text-muted-foreground" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-2" align="start">
          <div className="flex gap-1">
            {EMOJI_LIST.map(([key, emoji]) => (
              <button
                key={key}
                onClick={() => handleToggle(key)}
                className="rounded p-1 text-lg transition-colors hover:bg-muted"
                title={key}
              >
                {emoji}
              </button>
            ))}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
