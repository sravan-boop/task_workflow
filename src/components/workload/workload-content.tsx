"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { Users, Settings2 } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { toast } from "sonner";

export function WorkloadContent() {
  const { data: workspaces } = trpc.workspaces.list.useQuery();
  const workspaceId = workspaces?.[0]?.id;

  const { data: workloadData } = trpc.workload.getTeamWorkload.useQuery(
    { workspaceId: workspaceId! },
    { enabled: !!workspaceId }
  );

  const utils = trpc.useUtils();

  const setCapacity = trpc.workload.setCapacity.useMutation({
    onSuccess: () => {
      utils.workload.getTeamWorkload.invalidate();
      toast.success("Capacity updated");
    },
  });

  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [capacityInput, setCapacityInput] = useState("");

  const getUtilizationColor = (pct: number) => {
    if (pct > 100) return "bg-red-500";
    if (pct > 80) return "bg-yellow-500";
    return "bg-green-500";
  };

  const getUtilizationLabel = (pct: number) => {
    if (pct > 100) return "Overallocated";
    if (pct > 80) return "Near capacity";
    if (pct > 0) return "Available";
    return "No tasks";
  };

  return (
    <div className="h-full">
      <div className="flex h-14 items-center justify-between border-b bg-white px-6 dark:bg-card">
        <div className="flex items-center gap-2">
          <Users className="h-5 w-5 text-[#4573D2]" />
          <h1 className="text-lg font-medium text-[#1e1f21] dark:text-foreground">
            Workload
          </h1>
        </div>
      </div>

      <div className="p-6">
        <p className="mb-6 text-sm text-muted-foreground">
          View team capacity and task allocation across your workspace.
        </p>

        <div className="space-y-4">
          {workloadData?.map((member) => {
            const utilization = member.utilization;

            return (
              <div
                key={member.user.id}
                className="rounded-lg border bg-white p-4 dark:bg-card"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="bg-[#4573D2] text-xs text-white">
                        {member.user.name
                          ?.split(" ")
                          .map((n: string) => n[0])
                          .join("")}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-sm font-medium">{member.user.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {member.taskCount} task
                        {member.taskCount !== 1 ? "s" : ""} &middot;{" "}
                        {member.totalEstimatedHours}h allocated
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span
                      className={cn(
                        "rounded-full px-2 py-0.5 text-xs font-medium text-white",
                        getUtilizationColor(utilization)
                      )}
                    >
                      {getUtilizationLabel(utilization)}
                    </span>

                    <Popover
                      open={editingUserId === member.user.id}
                      onOpenChange={(open) => {
                        if (open) {
                          setEditingUserId(member.user.id);
                          setCapacityInput(String(member.weeklyCapacity));
                        } else {
                          setEditingUserId(null);
                        }
                      }}
                    >
                      <PopoverTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-7 w-7">
                          <Settings2 className="h-3.5 w-3.5" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-48 p-3" align="end">
                        <p className="mb-2 text-xs font-medium">
                          Weekly capacity (hours)
                        </p>
                        <Input
                          type="number"
                          value={capacityInput}
                          onChange={(e) => setCapacityInput(e.target.value)}
                          className="h-8 text-sm"
                          min={0}
                          max={168}
                        />
                        <Button
                          size="sm"
                          className="mt-2 w-full"
                          onClick={() => {
                            const hours = parseFloat(capacityInput);
                            if (!isNaN(hours) && hours >= 0) {
                              setCapacity.mutate({
                                userId: member.user.id,
                                workspaceId: workspaceId!,
                                weeklyHours: hours,
                              });
                              setEditingUserId(null);
                            }
                          }}
                        >
                          Save
                        </Button>
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>

                {/* Utilization bar */}
                <div className="mt-3">
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>
                      {member.totalEstimatedHours}h / {member.weeklyCapacity}h
                    </span>
                    <span>{utilization}%</span>
                  </div>
                  <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
                    <div
                      className={cn(
                        "h-full rounded-full transition-all",
                        getUtilizationColor(utilization)
                      )}
                      style={{ width: `${Math.min(utilization, 100)}%` }}
                    />
                  </div>
                </div>
              </div>
            );
          })}

          {(!workloadData || workloadData.length === 0) && (
            <div className="rounded-lg border border-dashed p-8 text-center">
              <Users className="mx-auto h-8 w-8 text-muted-foreground" />
              <p className="mt-2 text-sm text-muted-foreground">
                No team members found. Add members to your workspace to see
                workload data.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
