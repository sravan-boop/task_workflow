"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { trpc } from "@/lib/trpc";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import {
  Home,
  CheckSquare,
  Bell,
  BarChart3,
  Briefcase,
  Target,
  Settings,
  FolderKanban,
  Hash,
  Search,
  CircleDot,
  User,
} from "lucide-react";

const navigationItems = [
  { label: "Home", href: "/home", icon: Home },
  { label: "My Tasks", href: "/my-tasks", icon: CheckSquare },
  { label: "Inbox", href: "/inbox", icon: Bell },
  { label: "Reporting", href: "/reporting", icon: BarChart3 },
  { label: "Portfolios", href: "/portfolios", icon: Briefcase },
  { label: "Goals", href: "/goals", icon: Target },
  { label: "Settings", href: "/settings", icon: Settings },
];

export function SearchCommand() {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const router = useRouter();

  const { data: workspaces } = trpc.workspaces.list.useQuery();
  const workspaceId = workspaces?.[0]?.id;

  const { data: projects } = trpc.projects.list.useQuery(
    { workspaceId: workspaceId! },
    { enabled: !!workspaceId }
  );

  const { data: searchResults } = trpc.search.global.useQuery(
    { query: searchQuery, workspaceId: workspaceId! },
    { enabled: !!workspaceId && searchQuery.length >= 1 }
  );

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  useEffect(() => {
    if (!open) {
      setSearchQuery("");
    }
  }, [open]);

  const runCommand = useCallback(
    (command: () => void) => {
      setOpen(false);
      command();
    },
    []
  );

  const hasSearchResults =
    searchResults &&
    (searchResults.tasks.length > 0 || searchResults.projects.length > 0);

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput
        placeholder="Search for tasks, projects, or pages..."
        value={searchQuery}
        onValueChange={setSearchQuery}
      />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>

        {/* Search Results - Tasks */}
        {searchQuery.length >= 1 && searchResults?.tasks && searchResults.tasks.length > 0 && (
          <CommandGroup heading="Tasks">
            {searchResults.tasks.map((task) => (
              <CommandItem
                key={task.id}
                value={`task-${task.title}`}
                onSelect={() =>
                  runCommand(() => {
                    const projectId = task.taskProjects?.[0]?.project?.id;
                    if (projectId) {
                      router.push(`/projects/${projectId}`);
                    }
                  })
                }
              >
                <CircleDot className="mr-2 h-4 w-4 text-muted-foreground" />
                <div className="flex flex-1 items-center justify-between">
                  <span>{task.title}</span>
                  <div className="flex items-center gap-2">
                    {task.assignee && (
                      <span className="text-xs text-muted-foreground">
                        {task.assignee.name}
                      </span>
                    )}
                    {task.taskProjects?.[0]?.project && (
                      <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
                        {task.taskProjects[0].project.name}
                      </span>
                    )}
                  </div>
                </div>
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {/* Search Results - Projects */}
        {searchQuery.length >= 1 && searchResults?.projects && searchResults.projects.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Projects (Search)">
              {searchResults.projects.map((project) => (
                <CommandItem
                  key={`search-${project.id}`}
                  value={`search-project-${project.name}`}
                  onSelect={() =>
                    runCommand(() =>
                      router.push(`/projects/${project.id}`)
                    )
                  }
                >
                  <div
                    className="mr-2 h-3 w-3 rounded-sm"
                    style={{ backgroundColor: (project as any).color || "#4573D2" }}
                  />
                  <div className="flex flex-1 items-center justify-between">
                    <span>{project.name}</span>
                    {project.team && (
                      <span className="text-xs text-muted-foreground">
                        {project.team.name}
                      </span>
                    )}
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}

        {/* Navigation - show when no search query */}
        {searchQuery.length === 0 && (
          <CommandGroup heading="Navigation">
            {navigationItems.map((item) => (
              <CommandItem
                key={item.href}
                onSelect={() =>
                  runCommand(() => router.push(item.href))
                }
              >
                <item.icon className="mr-2 h-4 w-4" />
                {item.label}
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {/* Projects list - show when no search query */}
        {searchQuery.length === 0 && projects && projects.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Projects">
              {projects.map((project) => (
                <CommandItem
                  key={project.id}
                  onSelect={() =>
                    runCommand(() =>
                      router.push(`/projects/${project.id}`)
                    )
                  }
                >
                  <div
                    className="mr-2 h-3 w-3 rounded-sm"
                    style={{ backgroundColor: project.color }}
                  />
                  {project.name}
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}

        {searchQuery.length === 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Actions">
              <CommandItem
                onSelect={() =>
                  runCommand(() => {
                    document.dispatchEvent(
                      new CustomEvent("create-project")
                    );
                  })
                }
              >
                <FolderKanban className="mr-2 h-4 w-4" />
                Create new project
              </CommandItem>
            </CommandGroup>
          </>
        )}
      </CommandList>
    </CommandDialog>
  );
}
