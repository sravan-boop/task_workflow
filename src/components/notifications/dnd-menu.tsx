"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { BellOff, Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

export function DndMenu() {
  const { data: dndStatus } = trpc.auth.getDndStatus.useQuery();
  const utils = trpc.useUtils();

  const setDnd = trpc.auth.setDnd.useMutation({
    onSuccess: () => {
      utils.auth.getDndStatus.invalidate();
    },
  });

  const isDnd = dndStatus?.doNotDisturb ?? false;

  const enableDnd = (hours?: number) => {
    const until = hours
      ? new Date(Date.now() + hours * 60 * 60 * 1000).toISOString()
      : null;
    setDnd.mutate({ enabled: true, until });
    toast.success(
      hours
        ? `Do Not Disturb enabled for ${hours} hour${hours > 1 ? "s" : ""}`
        : "Do Not Disturb enabled"
    );
  };

  const disableDnd = () => {
    setDnd.mutate({ enabled: false, until: null });
    toast.success("Do Not Disturb disabled");
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          title={isDnd ? "Do Not Disturb is ON" : "Do Not Disturb"}
        >
          {isDnd ? (
            <BellOff className="h-4 w-4 text-orange-500" />
          ) : (
            <Bell className="h-4 w-4" />
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {isDnd ? (
          <>
            <div className="px-2 py-1.5 text-sm font-medium text-orange-500">
              Do Not Disturb is ON
            </div>
            {dndStatus?.dndUntil && (
              <div className="px-2 pb-1.5 text-xs text-muted-foreground">
                Until{" "}
                {new Date(dndStatus.dndUntil).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </div>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={disableDnd}>
              Turn off Do Not Disturb
            </DropdownMenuItem>
          </>
        ) : (
          <>
            <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
              Pause notifications
            </div>
            <DropdownMenuItem onClick={() => enableDnd(1)}>
              For 1 hour
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => enableDnd(2)}>
              For 2 hours
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => enableDnd(24)}>
              Until tomorrow
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => enableDnd()}>
              Indefinitely
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
