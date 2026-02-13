"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Sparkles, RefreshCw, Loader2 } from "lucide-react";

interface SmartSuggestionsProps {
  workspaceId: string;
}

export function SmartSuggestions({ workspaceId }: SmartSuggestionsProps) {
  const [suggestions, setSuggestions] = useState<string | null>(null);

  const suggestPriorities = trpc.ai.suggestPriorities.useMutation({
    onSuccess: (data) => {
      setSuggestions(data.suggestions);
    },
  });

  const handleGenerate = () => {
    suggestPriorities.mutate({ workspaceId });
  };

  // Format the AI response - convert markdown-like text to HTML-safe segments
  function formatSuggestions(text: string) {
    return text.split("\n").map((line, i) => {
      // Bold text
      const formatted = line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

      // Section headers (## or lines ending with :)
      if (line.startsWith("##") || line.startsWith("**") && line.endsWith("**")) {
        return (
          <h4 key={i} className="mt-3 mb-1 text-sm font-semibold text-[#1e1f21] dark:text-gray-100 first:mt-0" dangerouslySetInnerHTML={{ __html: formatted.replace(/^#+\s*/, '') }} />
        );
      }

      // Bullet points
      if (line.trim().startsWith("-") || line.trim().startsWith("•") || /^\d+\./.test(line.trim())) {
        return (
          <li key={i} className="ml-4 text-sm text-[#1e1f21] dark:text-gray-200 leading-relaxed" dangerouslySetInnerHTML={{ __html: formatted.replace(/^[\s]*[-•]\s*/, '').replace(/^\d+\.\s*/, '') }} />
        );
      }

      // Empty lines
      if (!line.trim()) return <div key={i} className="h-2" />;

      // Regular text
      return (
        <p key={i} className="text-sm text-[#6d6e6f] dark:text-gray-300 leading-relaxed" dangerouslySetInnerHTML={{ __html: formatted }} />
      );
    });
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 to-purple-600">
            <Sparkles className="h-4 w-4 text-white" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-[#1e1f21] dark:text-gray-100">
              AI Priority Suggestions
            </h3>
            <p className="text-xs text-[#6d6e6f] dark:text-gray-400">
              Let AI analyze and prioritize your tasks
            </p>
          </div>
        </div>
        <Button
          onClick={handleGenerate}
          disabled={suggestPriorities.isPending}
          size="sm"
          className={cn(
            "gap-1.5",
            suggestions
              ? "bg-white text-[#4573D2] border border-[#4573D2] hover:bg-[#4573D2]/5 dark:bg-transparent"
              : "bg-[#4573D2] text-white hover:bg-[#3a63b8]"
          )}
        >
          {suggestPriorities.isPending ? (
            <>
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Analyzing...
            </>
          ) : suggestions ? (
            <>
              <RefreshCw className="h-3.5 w-3.5" />
              Refresh
            </>
          ) : (
            <>
              <Sparkles className="h-3.5 w-3.5" />
              Analyze tasks
            </>
          )}
        </Button>
      </div>

      {/* Results */}
      {suggestPriorities.isPending && !suggestions && (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-violet-200 bg-violet-50/50 py-10 dark:border-violet-800/30 dark:bg-violet-950/20">
          <Loader2 className="h-8 w-8 animate-spin text-violet-500" />
          <p className="mt-3 text-sm font-medium text-violet-600 dark:text-violet-400">
            Analyzing your tasks...
          </p>
          <p className="mt-1 text-xs text-violet-500/70 dark:text-violet-400/50">
            This may take a few seconds
          </p>
        </div>
      )}

      {suggestions && (
        <div className="rounded-xl border border-violet-100 bg-gradient-to-br from-white to-violet-50/30 p-5 dark:border-violet-800/30 dark:from-gray-950 dark:to-violet-950/10">
          <ul className="space-y-0.5 list-none">
            {formatSuggestions(suggestions)}
          </ul>
        </div>
      )}

      {/* Error state */}
      {suggestPriorities.isError && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-800/30 dark:bg-red-950/20">
          <p className="text-sm text-red-600 dark:text-red-400">
            Failed to generate suggestions. Please check your AI API key configuration.
          </p>
        </div>
      )}

      {/* Empty state */}
      {!suggestions && !suggestPriorities.isPending && !suggestPriorities.isError && (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-200 bg-gray-50/50 px-6 py-12 dark:border-gray-800 dark:bg-gray-900/50">
          <Sparkles className="h-10 w-10 text-[#cfcbcb] dark:text-gray-600" />
          <p className="mt-3 text-sm font-medium text-[#1e1f21] dark:text-gray-200">
            Get AI-powered task prioritization
          </p>
          <p className="mt-1 max-w-xs text-center text-xs text-[#6d6e6f] dark:text-gray-400">
            Click &quot;Analyze tasks&quot; to let AI review your incomplete tasks and suggest the best order to tackle them.
          </p>
        </div>
      )}
    </div>
  );
}
