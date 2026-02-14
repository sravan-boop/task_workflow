"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import {
  Search,
  Filter,
  CheckCircle2,
  Circle,
  Calendar,
  X,
  Archive,
  ArchiveRestore,
} from "lucide-react";

export function AdvancedSearch() {
  const searchParams = useSearchParams();
  const isArchiveMode = searchParams.get("filter") === "archived";

  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [dueFilter, setDueFilter] = useState<string>("all");

  const { data: workspaces } = trpc.workspaces.list.useQuery();
  const workspaceId = workspaces?.[0]?.id;

  const { data: searchResults, isLoading } = trpc.search.global.useQuery(
    { query, workspaceId: workspaceId! },
    { enabled: !!workspaceId && query.length >= 1 && !isArchiveMode }
  );

  // Fetch archived projects
  const { data: allProjects } = trpc.projects.listAll.useQuery(
    { workspaceId: workspaceId! },
    { enabled: !!workspaceId && isArchiveMode }
  );
  const archivedProjects = allProjects?.filter((p) => p.isArchived) || [];

  const utils = trpc.useUtils();
  const unarchiveProject = trpc.projects.archive.useMutation({
    onSuccess: () => {
      utils.projects.listAll.invalidate();
      utils.projects.list.invalidate();
      toast.success("Project unarchived");
    },
  });

  const filteredTasks = searchResults?.tasks.filter((task) => {
    if (statusFilter !== "all" && task.status !== statusFilter) return false;
    if (dueFilter === "overdue") {
      if (!task.dueDate || new Date(task.dueDate) >= new Date()) return false;
    }
    if (dueFilter === "upcoming") {
      if (!task.dueDate) return false;
      const weekFromNow = new Date();
      weekFromNow.setDate(weekFromNow.getDate() + 7);
      if (new Date(task.dueDate) > weekFromNow) return false;
    }
    if (dueFilter === "no_date" && task.dueDate) return false;
    return true;
  });

  const hasFilters = statusFilter !== "all" || dueFilter !== "all";

  if (isArchiveMode) {
    return (
      <div className="h-full bg-white p-6">
        <div className="mx-auto max-w-4xl">
          <div className="flex items-center gap-3">
            <Archive className="h-5 w-5 text-muted-foreground" />
            <h1 className="text-xl font-semibold text-[#1e1f21]">Archived Projects</h1>
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            Projects that have been archived. You can unarchive them to make them active again.
          </p>
          <div className="mt-6">
            {archivedProjects.length > 0 ? (
              <div className="space-y-2">
                {archivedProjects.map((project) => (
                  <div key={project.id} className="flex items-center gap-3 rounded-lg border px-4 py-3">
                    <div className="h-4 w-4 rounded" style={{ backgroundColor: project.color }} />
                    <span className="flex-1 text-sm font-medium text-[#1e1f21]">{project.name}</span>
                    {project.team && <span className="text-xs text-muted-foreground">{project.team.name}</span>}
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-1.5 text-xs"
                      onClick={() => unarchiveProject.mutate({ id: project.id, isArchived: false })}
                    >
                      <ArchiveRestore className="h-3.5 w-3.5" />
                      Unarchive
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-20 text-center">
                <Archive className="mx-auto h-10 w-10 text-muted-foreground/40" />
                <p className="mt-4 text-sm text-muted-foreground">No archived projects</p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full bg-white p-6">
      <div className="mx-auto max-w-4xl">
        <h1 className="text-xl font-semibold text-[#1e1f21]">Search</h1>

        {/* Search Input */}
        <div className="mt-4 flex gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search tasks, projects..."
              className="pl-10"
              autoFocus
            />
          </div>
        </div>

        {/* Filters */}
        <div className="mt-4 flex items-center gap-3">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="INCOMPLETE">Incomplete</SelectItem>
              <SelectItem value="COMPLETE">Complete</SelectItem>
            </SelectContent>
          </Select>
          <Select value={dueFilter} onValueChange={setDueFilter}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Due date" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Any date</SelectItem>
              <SelectItem value="overdue">Overdue</SelectItem>
              <SelectItem value="upcoming">Next 7 days</SelectItem>
              <SelectItem value="no_date">No due date</SelectItem>
            </SelectContent>
          </Select>
          {hasFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setStatusFilter("all");
                setDueFilter("all");
              }}
              className="gap-1 text-xs"
            >
              <X className="h-3 w-3" />
              Clear filters
            </Button>
          )}
        </div>

        {/* Results */}
        <div className="mt-6">
          {query.length === 0 ? (
            <div className="py-20 text-center">
              <Search className="mx-auto h-10 w-10 text-muted-foreground/40" />
              <p className="mt-4 text-sm text-muted-foreground">
                Start typing to search across tasks and projects
              </p>
            </div>
          ) : isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <div
                  key={i}
                  className="h-12 animate-pulse rounded-lg bg-muted/50"
                />
              ))}
            </div>
          ) : (
            <>
              {/* Tasks */}
              {filteredTasks && filteredTasks.length > 0 && (
                <div>
                  <h3 className="mb-2 text-xs font-semibold uppercase text-muted-foreground">
                    Tasks ({filteredTasks.length})
                  </h3>
                  <div className="space-y-1">
                    {filteredTasks.map((task) => (
                      <div
                        key={task.id}
                        className="flex items-center gap-3 rounded-lg px-3 py-2 hover:bg-muted/50"
                      >
                        {task.status === "COMPLETE" ? (
                          <CheckCircle2 className="h-4 w-4 flex-shrink-0 text-green-600" />
                        ) : (
                          <Circle className="h-4 w-4 flex-shrink-0 text-[#cfcbcb]" />
                        )}
                        <span
                          className={cn(
                            "flex-1 text-sm",
                            task.status === "COMPLETE" &&
                              "text-muted-foreground line-through"
                          )}
                        >
                          {task.title}
                        </span>
                        {task.assignee && (
                          <Avatar className="h-5 w-5">
                            <AvatarFallback className="bg-[#4573D2] text-[8px] text-white">
                              {task.assignee.name
                                ?.split(" ")
                                .map((n) => n[0])
                                .join("")}
                            </AvatarFallback>
                          </Avatar>
                        )}
                        {task.dueDate && (
                          <span className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Calendar className="h-3 w-3" />
                            {new Date(task.dueDate).toLocaleDateString(
                              "en-US",
                              { month: "short", day: "numeric" }
                            )}
                          </span>
                        )}
                        {task.taskProjects?.[0]?.project && (
                          <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
                            {task.taskProjects[0].project.name}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Projects */}
              {searchResults?.projects && searchResults.projects.length > 0 && (
                <div className="mt-6">
                  <h3 className="mb-2 text-xs font-semibold uppercase text-muted-foreground">
                    Projects ({searchResults.projects.length})
                  </h3>
                  <div className="space-y-1">
                    {searchResults.projects.map((project) => (
                      <div
                        key={project.id}
                        className="flex items-center gap-3 rounded-lg px-3 py-2 hover:bg-muted/50"
                      >
                        <div
                          className="h-4 w-4 rounded"
                          style={{
                            backgroundColor:
                              (project as any).color || "#4573D2",
                          }}
                        />
                        <span className="flex-1 text-sm font-medium">
                          {project.name}
                        </span>
                        {project.team && (
                          <span className="text-xs text-muted-foreground">
                            {project.team.name}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* No results */}
              {(!filteredTasks || filteredTasks.length === 0) &&
                (!searchResults?.projects ||
                  searchResults.projects.length === 0) && (
                  <div className="py-20 text-center">
                    <p className="text-sm text-muted-foreground">
                      No results found for &ldquo;{query}&rdquo;
                    </p>
                  </div>
                )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
