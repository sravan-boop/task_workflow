"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RefreshCw, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface RecurrencePickerProps {
  taskId: string;
  isRecurring: boolean;
  recurrenceRule: any;
  onUpdate?: () => void;
}

const FREQUENCY_OPTIONS = [
  { value: "DAILY", label: "Daily" },
  { value: "WEEKLY", label: "Weekly" },
  { value: "MONTHLY", label: "Monthly" },
  { value: "YEARLY", label: "Yearly" },
];

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function RecurrencePicker({
  taskId,
  isRecurring,
  recurrenceRule,
  onUpdate,
}: RecurrencePickerProps) {
  const utils = trpc.useUtils();
  const [open, setOpen] = useState(false);
  const [frequency, setFrequency] = useState<string>(
    recurrenceRule?.frequency || "WEEKLY"
  );
  const [interval, setInterval] = useState<number>(
    recurrenceRule?.interval || 1
  );
  const [daysOfWeek, setDaysOfWeek] = useState<number[]>(
    recurrenceRule?.daysOfWeek || []
  );

  const setRecurrence = trpc.tasks.setRecurrence.useMutation({
    onSuccess: () => {
      utils.tasks.get.invalidate({ id: taskId });
      onUpdate?.();
      setOpen(false);
      toast.success(isRecurring ? "Recurrence updated" : "Recurrence set");
    },
  });

  const handleSave = () => {
    setRecurrence.mutate({
      taskId,
      isRecurring: true,
      recurrenceRule: {
        frequency: frequency as "DAILY" | "WEEKLY" | "MONTHLY" | "YEARLY",
        interval,
        ...(frequency === "WEEKLY" &&
          daysOfWeek.length > 0 && { daysOfWeek }),
      },
    });
  };

  const handleRemove = () => {
    setRecurrence.mutate({
      taskId,
      isRecurring: false,
      recurrenceRule: null,
    });
    toast.success("Recurrence removed");
  };

  const toggleDay = (day: number) => {
    setDaysOfWeek((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );
  };

  function getRecurrenceLabel(): string {
    if (!isRecurring || !recurrenceRule) return "Set recurrence";
    const freq = recurrenceRule.frequency?.toLowerCase() || "";
    const intv = recurrenceRule.interval || 1;
    if (intv === 1) return `Repeats ${freq}`;
    return `Every ${intv} ${freq === "daily" ? "days" : freq === "weekly" ? "weeks" : freq === "monthly" ? "months" : "years"}`;
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className={cn(
            "gap-1.5 text-xs",
            isRecurring ? "text-[#4573D2]" : "text-[#6d6e6f]"
          )}
        >
          <RefreshCw className="h-3.5 w-3.5" />
          {getRecurrenceLabel()}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-4" align="start">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium">Recurrence</h4>
            {isRecurring && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleRemove}
                className="h-6 gap-1 px-2 text-xs text-red-500 hover:text-red-600"
              >
                <X className="h-3 w-3" /> Remove
              </Button>
            )}
          </div>

          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Label className="shrink-0 text-xs text-muted-foreground">
                Every
              </Label>
              <Input
                type="number"
                min={1}
                max={365}
                value={interval}
                onChange={(e) => setInterval(Number(e.target.value) || 1)}
                className="h-8 w-16 text-sm"
              />
              <Select value={frequency} onValueChange={setFrequency}>
                <SelectTrigger className="h-8 flex-1 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FREQUENCY_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {frequency === "WEEKLY" && (
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">
                  On days
                </Label>
                <div className="flex gap-1">
                  {DAY_LABELS.map((label, i) => (
                    <button
                      key={i}
                      onClick={() => toggleDay(i)}
                      className={cn(
                        "flex h-7 w-7 items-center justify-center rounded-full text-[10px] font-medium transition-colors",
                        daysOfWeek.includes(i)
                          ? "bg-[#4573D2] text-white"
                          : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300"
                      )}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <Button
            onClick={handleSave}
            disabled={setRecurrence.isPending}
            className="w-full bg-[#4573D2] text-white hover:bg-[#3a63b8]"
            size="sm"
          >
            {setRecurrence.isPending ? "Saving..." : "Save"}
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
