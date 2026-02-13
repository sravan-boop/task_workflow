"use client";

import { useState, useEffect, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Archive,
  Bell,
  CheckCircle2,
  MailOpen,
  MessageSquare,
  UserPlus,
  AlertCircle,
  AtSign,
  Clock,
} from "lucide-react";

type FilterType = "all" | "unread" | "archived";

const NOTIFICATION_ICONS: Record<string, React.ReactNode> = {
  TASK_ASSIGNED: <UserPlus className="h-4 w-4 text-[#4573D2]" />,
  TASK_COMPLETED: <CheckCircle2 className="h-4 w-4 text-green-600" />,
  COMMENT_ADDED: <MessageSquare className="h-4 w-4 text-[#AA62E3]" />,
  MENTIONED: <AtSign className="h-4 w-4 text-[#F06A6A]" />,
  STATUS_UPDATE: <AlertCircle className="h-4 w-4 text-[#FD9A00]" />,
  DUE_DATE_APPROACHING: <Clock className="h-4 w-4 text-[#FD9A00]" />,
  TASK_OVERDUE: <AlertCircle className="h-4 w-4 text-red-600" />,
  FOLLOWER_ADDED: <UserPlus className="h-4 w-4 text-[#4573D2]" />,
  APPROVAL_REQUEST: <CheckCircle2 className="h-4 w-4 text-[#AA62E3]" />,
};

function formatTime(date: Date | string, now: Date | null) {
  if (!now) return "";
  const d = new Date(date);
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export default function InboxPage() {
  const [filter, setFilter] = useState<FilterType>("all");
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);
  const now = useMemo(() => (mounted ? new Date() : null), [mounted]);

  const { data, isLoading } = trpc.notifications.list.useQuery({ filter });
  const { data: unreadCount } = trpc.notifications.unreadCount.useQuery();
  const utils = trpc.useUtils();

  const markRead = trpc.notifications.markRead.useMutation({
    onSuccess: () => {
      utils.notifications.list.invalidate();
      utils.notifications.unreadCount.invalidate();
    },
  });

  const markAllRead = trpc.notifications.markAllRead.useMutation({
    onSuccess: () => {
      utils.notifications.list.invalidate();
      utils.notifications.unreadCount.invalidate();
    },
  });

  const archiveAll = trpc.notifications.archiveAll.useMutation({
    onSuccess: () => {
      utils.notifications.list.invalidate();
      utils.notifications.unreadCount.invalidate();
    },
  });

  const notifications = data?.notifications || [];

  return (
    <div className="h-full">
      <div className="flex h-14 items-center justify-between border-b bg-white px-6">
        <h1 className="text-lg font-medium text-[#1e1f21]">Inbox</h1>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            className="gap-1.5 text-xs"
            onClick={() => markAllRead.mutate()}
            disabled={markAllRead.isPending}
          >
            <MailOpen className="h-3.5 w-3.5" />
            Mark all read
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="gap-1.5 text-xs"
            onClick={() => archiveAll.mutate()}
            disabled={archiveAll.isPending}
          >
            <Archive className="h-3.5 w-3.5" />
            Archive all
          </Button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-1 border-b bg-white px-6 py-1">
        {(
          [
            { key: "all", label: "All" },
            { key: "unread", label: "Unread" },
            { key: "archived", label: "Archived" },
          ] as const
        ).map((f) => (
          <Button
            key={f.key}
            variant="ghost"
            size="sm"
            className={cn(
              "text-xs",
              filter === f.key
                ? "bg-muted text-[#1e1f21]"
                : "text-muted-foreground"
            )}
            onClick={() => setFilter(f.key)}
          >
            {f.label}
            {f.key === "unread" && unreadCount !== undefined && unreadCount > 0 && (
              <span className="ml-1 rounded-full bg-[#4573D2] px-1.5 text-[10px] text-white">
                {unreadCount}
              </span>
            )}
          </Button>
        ))}
      </div>

      {/* Notification List */}
      <div className="divide-y">
        {isLoading ? (
          <div className="space-y-0">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-start gap-3 px-6 py-4">
                <div className="h-8 w-8 animate-pulse rounded-full bg-muted" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-48 animate-pulse rounded bg-muted" />
                  <div className="h-3 w-64 animate-pulse rounded bg-muted" />
                </div>
              </div>
            ))}
          </div>
        ) : notifications.length > 0 ? (
          notifications.map((notification) => (
            <button
              key={notification.id}
              className={cn(
                "flex w-full items-start gap-3 px-6 py-4 text-left transition-colors hover:bg-muted/30",
                !notification.isRead && "bg-blue-50/30"
              )}
              onClick={() => {
                if (!notification.isRead) {
                  markRead.mutate({ id: notification.id });
                }
              }}
            >
              <div className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-full bg-muted/50">
                {NOTIFICATION_ICONS[notification.type] || (
                  <Bell className="h-4 w-4 text-muted-foreground" />
                )}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span
                    className={cn(
                      "text-sm",
                      !notification.isRead ? "font-medium" : "font-normal"
                    )}
                  >
                    {notification.type
                      .replace(/_/g, " ")
                      .toLowerCase()
                      .replace(/^\w/, (c) => c.toUpperCase())}
                  </span>
                  {!notification.isRead && (
                    <div className="h-2 w-2 rounded-full bg-[#4573D2]" />
                  )}
                </div>
                {notification.message && (
                  <p className="mt-0.5 text-sm text-muted-foreground">
                    {notification.message}
                  </p>
                )}
                <p className="mt-1 text-xs text-muted-foreground">
                  {formatTime(notification.createdAt, now)}
                </p>
              </div>
            </button>
          ))
        ) : (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-muted/30">
              <Bell className="h-10 w-10 text-muted-foreground/30" />
            </div>
            <h3 className="text-lg font-medium text-[#1e1f21]">
              You&apos;re all caught up!
            </h3>
            <p className="mt-1 max-w-sm text-sm text-muted-foreground">
              Notifications about tasks, comments, and mentions will appear
              here.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
