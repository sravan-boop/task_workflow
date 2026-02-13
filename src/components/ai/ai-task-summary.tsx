"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Sparkles, Loader2, RefreshCw } from "lucide-react";

interface AiTaskSummaryProps {
  taskId: string;
}

export function AiTaskSummary({ taskId }: AiTaskSummaryProps) {
  const [summary, setSummary] = useState<string | null>(null);

  const summarize = trpc.ai.summarizeTask.useMutation({
    onSuccess: (data) => setSummary(data.summary),
  });

  if (summary) {
    return (
      <div className="rounded-lg border border-[#4573D2]/20 bg-[#4573D2]/5 p-3">
        <div className="mb-1.5 flex items-center gap-1.5">
          <Sparkles className="h-3.5 w-3.5 text-[#4573D2]" />
          <span className="text-xs font-medium text-[#4573D2]">
            AI Summary
          </span>
          <button
            onClick={() => summarize.mutate({ taskId })}
            className="ml-auto"
            disabled={summarize.isPending}
          >
            <RefreshCw
              className={`h-3 w-3 text-[#4573D2] ${
                summarize.isPending ? "animate-spin" : ""
              }`}
            />
          </button>
        </div>
        <p className="text-xs text-[#1e1f21] leading-relaxed">{summary}</p>
      </div>
    );
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      className="gap-1.5 text-xs text-[#4573D2]"
      onClick={() => summarize.mutate({ taskId })}
      disabled={summarize.isPending}
    >
      {summarize.isPending ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      ) : (
        <Sparkles className="h-3.5 w-3.5" />
      )}
      {summarize.isPending ? "Generating..." : "AI Summary"}
    </Button>
  );
}
