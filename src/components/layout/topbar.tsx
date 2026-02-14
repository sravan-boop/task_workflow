"use client";

import { useSession, signOut } from "next-auth/react";
import { useRouter, usePathname } from "next/navigation";
import {
  Search,
  Plus,
  HelpCircle,
  Settings,
  LogOut,
  Sparkles,
  Shield,
  FolderKanban,
  CheckSquare,
  ChevronRight,
  Plug,
  CircleDot,
  Target,
  User,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useState, useMemo, useRef, useEffect } from "react";
import Link from "next/link";
import { trpc } from "@/lib/trpc";
import { AiChatPanel } from "@/components/ai/ai-chat-panel";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { DndMenu } from "@/components/notifications/dnd-menu";

export function Topbar() {
  const { data: session } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [aiChatOpen, setAiChatOpen] = useState(false);

  const { data: workspaces } = trpc.workspaces.list.useQuery();
  const workspaceId = workspaces?.[0]?.id;

  const { data: searchResults } = trpc.search.global.useQuery(
    { query: searchQuery, workspaceId: workspaceId! },
    { enabled: !!workspaceId && searchQuery.length >= 1 }
  );

  // Static navigation pages for search — covers every corner of the site
  const NAV_PAGES = [
    { label: "Home", href: "/home", icon: "🏠", keywords: "dashboard home overview" },
    { label: "My Tasks", href: "/my-tasks", icon: "✓", keywords: "tasks todo my tasks assigned" },
    { label: "Inbox", href: "/inbox", icon: "📥", keywords: "inbox messages notifications" },
    { label: "Goals", href: "/goals", icon: "🎯", keywords: "goals objectives targets okr" },
    { label: "Portfolios", href: "/portfolios", icon: "📁", keywords: "portfolios collections" },
    { label: "Reporting", href: "/reporting", icon: "📊", keywords: "reporting reports analytics charts" },
    { label: "Workload", href: "/workload", icon: "⚖️", keywords: "workload capacity team load" },
    { label: "Settings", href: "/settings", icon: "⚙️", keywords: "settings preferences configuration" },
    { label: "Admin Console", href: "/admin", icon: "🛡️", keywords: "admin console workspace management" },
    { label: "Integrations", href: "/integrations", icon: "🔌", keywords: "integrations slack github jira figma zapier google drive" },
    { label: "Archived Projects", href: "/search?filter=archived", icon: "📦", keywords: "archive archived projects hidden inactive" },
    // Settings sub-sections
    { label: "Profile Settings", href: "/settings?tab=profile", icon: "👤", keywords: "profile name email job title department bio about me" },
    { label: "Profile Picture", href: "/settings?tab=profile", icon: "📷", keywords: "profile picture avatar photo upload image" },
    { label: "Notification Settings", href: "/settings?tab=notifications", icon: "🔔", keywords: "notification settings email alerts in-app mentions comments" },
    { label: "Two-Factor Authentication (2FA)", href: "/settings?tab=security", icon: "🔐", keywords: "2fa two factor authentication security qr code backup codes mfa" },
    { label: "Change Password", href: "/settings?tab=security", icon: "🔑", keywords: "password change update reset security" },
    { label: "Delete Account", href: "/settings?tab=security", icon: "🗑️", keywords: "delete account remove deactivate" },
    { label: "Dark Mode / Theme", href: "/settings?tab=display", icon: "🌙", keywords: "dark mode light mode theme system appearance display" },
    { label: "Sidebar Color", href: "/settings?tab=display", icon: "🎨", keywords: "sidebar color appearance customize" },
    { label: "Compact Mode", href: "/settings?tab=display", icon: "📐", keywords: "compact mode density spacing" },
    { label: "Language", href: "/settings?tab=display", icon: "🌐", keywords: "language locale español français deutsch 日本語 english" },
  ];

  const filteredPages = searchQuery.length >= 1
    ? NAV_PAGES.filter(p => {
        const q = searchQuery.toLowerCase();
        return p.label.toLowerCase().includes(q) || p.keywords.toLowerCase().includes(q);
      })
    : NAV_PAGES.slice(0, 10); // Show only main pages when no query

  // Close dropdown on click outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Cmd+K shortcut
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        inputRef.current?.focus();
        setShowDropdown(true);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  const hasResults = filteredPages.length > 0 || (searchResults && (
    searchResults.tasks.length > 0 ||
    searchResults.projects.length > 0 ||
    (searchResults.people && searchResults.people.length > 0) ||
    (searchResults.goals && searchResults.goals.length > 0)
  ));

  const breadcrumbs = useMemo(() => {
    const crumbs: { label: string; href: string }[] = [];
    if (!pathname) return crumbs;
    const segments = pathname.split("/").filter(Boolean);
    if (segments[0] === "home") {
      crumbs.push({ label: "Home", href: "/home" });
    } else if (segments[0] === "my-tasks") {
      crumbs.push({ label: "My Tasks", href: "/my-tasks" });
    } else if (segments[0] === "projects" && segments[1]) {
      crumbs.push({ label: "Projects", href: "/home" });
      crumbs.push({ label: "Project", href: `/projects/${segments[1]}` });
    } else if (segments[0] === "reporting") {
      crumbs.push({ label: "Reporting", href: "/reporting" });
    } else if (segments[0] === "portfolios") {
      crumbs.push({ label: "Portfolios", href: "/portfolios" });
    } else if (segments[0] === "goals") {
      crumbs.push({ label: "Goals", href: "/goals" });
    } else if (segments[0] === "workload") {
      crumbs.push({ label: "Workload", href: "/workload" });
    } else if (segments[0] === "settings") {
      crumbs.push({ label: "Settings", href: "/settings" });
    } else if (segments[0] === "admin") {
      crumbs.push({ label: "Admin", href: "/admin" });
    } else if (segments[0] === "integrations") {
      crumbs.push({ label: "Settings", href: "/settings" });
      crumbs.push({ label: "Integrations", href: "/integrations" });
    }
    return crumbs;
  }, [pathname]);

  const userInitials = session?.user?.name
    ?.split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <header className="flex h-12 items-center justify-between border-b bg-white px-4 dark:bg-card">
      {/* Left side - Logo + Breadcrumbs */}
      <div className="flex items-center gap-3">
        <svg
          width="100"
          height="24"
          viewBox="0 0 100 24"
          fill="none"
          className="shrink-0 cursor-pointer"
          onClick={() => router.push("/home")}
        >
          <circle cx="12" cy="6" r="4.5" fill="#F06A6A" />
          <circle cx="5" cy="18" r="4.5" fill="#F06A6A" />
          <circle cx="19" cy="18" r="4.5" fill="#F06A6A" />
          <text
            x="28"
            y="18"
            fontFamily="system-ui"
            fontSize="15"
            fontWeight="600"
            fill="#1e1f21"
          >
            TaskFlow
          </text>
        </svg>
        {breadcrumbs.length > 0 && (
          <nav className="flex items-center gap-1 text-sm text-muted-foreground">
            {breadcrumbs.map((crumb, i) => (
              <span key={crumb.href} className="flex items-center gap-1">
                {i > 0 && <ChevronRight className="h-3 w-3" />}
                <Link
                  href={crumb.href}
                  className="hover:text-foreground transition-colors"
                >
                  {crumb.label}
                </Link>
              </span>
            ))}
          </nav>
        )}
      </div>

      {/* Center - Search with inline dropdown */}
      <div ref={searchRef} className="relative flex max-w-lg flex-1 items-center justify-center px-4">
        <div className="relative w-full max-w-md">
          <div className="flex h-8 w-full items-center gap-2 rounded-md border bg-muted/40 px-3 transition-colors focus-within:border-[#4573D2] focus-within:bg-white">
            <Search className="h-4 w-4 text-muted-foreground" />
            <input
              ref={inputRef}
              type="text"
              placeholder="Search tasks, projects, people..."
              className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setShowDropdown(true);
              }}
              onFocus={() => setShowDropdown(true)}
              onKeyDown={(e) => {
                if (e.key === "Escape") {
                  setShowDropdown(false);
                  inputRef.current?.blur();
                }
              }}
            />
            {!searchQuery && (
              <kbd className="rounded border bg-white px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                ⌘K
              </kbd>
            )}
            {searchQuery && (
              <button
                onClick={() => { setSearchQuery(""); setShowDropdown(false); }}
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                ✕
              </button>
            )}
          </div>

          {/* Search Dropdown */}
          {showDropdown && (
            <div className="absolute top-full left-0 z-50 mt-1 w-full rounded-lg border bg-white shadow-lg dark:bg-card">
              <div className="max-h-[400px] overflow-y-auto py-2">
                {searchQuery.length >= 1 && !hasResults && (
                  <div className="px-4 py-6 text-center text-sm text-muted-foreground">
                    No results for &quot;{searchQuery}&quot;
                  </div>
                )}

                {/* Navigation Pages */}
                {filteredPages.length > 0 && (
                  <div>
                    <div className="px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                      Pages
                    </div>
                    {filteredPages.map((page) => (
                      <button
                        key={page.label}
                        className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-muted/50"
                        onClick={() => {
                          router.push(page.href);
                          setShowDropdown(false);
                          setSearchQuery("");
                        }}
                      >
                        <span className="w-4 text-center text-xs">{page.icon}</span>
                        <span className="flex-1 truncate">{page.label}</span>
                        <span className="text-[10px] text-muted-foreground">{page.href}</span>
                      </button>
                    ))}
                  </div>
                )}

                {/* Tasks */}
                {searchResults?.tasks && searchResults.tasks.length > 0 && (
                  <div className={filteredPages.length > 0 ? "mt-1 border-t pt-1" : ""}>
                    <div className="px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                      Tasks
                    </div>
                    {searchResults.tasks.slice(0, 5).map((task) => (
                      <button
                        key={task.id}
                        className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-muted/50"
                        onClick={() => {
                          const projectId = task.taskProjects?.[0]?.project?.id;
                          if (projectId) router.push(`/projects/${projectId}`);
                          setShowDropdown(false);
                          setSearchQuery("");
                        }}
                      >
                        <CircleDot className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                        <span className="flex-1 truncate">{task.title}</span>
                        {task.assignee && (
                          <span className="text-[10px] text-muted-foreground">{task.assignee.name}</span>
                        )}
                        {task.taskProjects?.[0]?.project && (
                          <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
                            {task.taskProjects[0].project.name}
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                )}

                {/* Projects */}
                {searchResults?.projects && searchResults.projects.length > 0 && (
                  <div className="mt-1 border-t pt-1">
                    <div className="px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                      Projects
                    </div>
                    {searchResults.projects.map((project) => (
                      <button
                        key={project.id}
                        className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-muted/50"
                        onClick={() => {
                          router.push(`/projects/${project.id}`);
                          setShowDropdown(false);
                          setSearchQuery("");
                        }}
                      >
                        <div
                          className="h-3 w-3 shrink-0 rounded-sm"
                          style={{ backgroundColor: (project as any).color || "#4573D2" }}
                        />
                        <span className="flex-1 truncate">{project.name}</span>
                        {project.team && (
                          <span className="text-[10px] text-muted-foreground">{project.team.name}</span>
                        )}
                      </button>
                    ))}
                  </div>
                )}

                {/* People */}
                {searchResults?.people && searchResults.people.length > 0 && (
                  <div className="mt-1 border-t pt-1">
                    <div className="px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                      People
                    </div>
                    {searchResults.people.map((person: any) => (
                      <button
                        key={person.id}
                        className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-muted/50"
                        onClick={() => {
                          router.push("/settings");
                          setShowDropdown(false);
                          setSearchQuery("");
                        }}
                      >
                        <User className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                        <span className="flex-1 truncate">{person.name}</span>
                        <span className="text-[10px] text-muted-foreground">{person.email}</span>
                      </button>
                    ))}
                  </div>
                )}

                {/* Goals */}
                {searchResults?.goals && searchResults.goals.length > 0 && (
                  <div className="mt-1 border-t pt-1">
                    <div className="px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                      Goals
                    </div>
                    {searchResults.goals.map((goal: any) => (
                      <button
                        key={goal.id}
                        className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-muted/50"
                        onClick={() => {
                          router.push("/goals");
                          setShowDropdown(false);
                          setSearchQuery("");
                        }}
                      >
                        <Target className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                        <span className="flex-1 truncate">{goal.name}</span>
                      </button>
                    ))}
                  </div>
                )}

              </div>
            </div>
          )}
        </div>
      </div>

      {/* Right side - Actions */}
      <div className="flex items-center gap-1">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <Plus className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              onClick={() => {
                document.dispatchEvent(new CustomEvent("create-project"));
              }}
            >
              <FolderKanban className="mr-2 h-4 w-4" />
              Project
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => {
                router.push("/my-tasks");
                window.dispatchEvent(new CustomEvent("quick-add-task"));
              }}
            >
              <CheckSquare className="mr-2 h-4 w-4" />
              Task
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => setAiChatOpen(true)}
          title="TaskFlow AI"
        >
          <Sparkles className="h-4 w-4 text-[#4573D2]" />
        </Button>
        <DndMenu />
        <ThemeToggle />
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => {
            window.dispatchEvent(new KeyboardEvent("keydown", { key: "?", bubbles: true }));
          }}
          title="Keyboard shortcuts"
        >
          <HelpCircle className="h-4 w-4" />
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className="relative h-8 w-8 rounded-full p-0"
            >
              <Avatar className="h-7 w-7">
                <AvatarImage src={session?.user?.image || undefined} />
                <AvatarFallback className="bg-[#4573D2] text-xs text-white">
                  {userInitials || "U"}
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <div className="px-2 py-1.5">
              <p className="text-sm font-medium">{session?.user?.name}</p>
              <p className="text-xs text-muted-foreground">
                {session?.user?.email}
              </p>
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => router.push("/settings")}>
              <Settings className="mr-2 h-4 w-4" />
              Settings
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => router.push("/admin")}>
              <Shield className="mr-2 h-4 w-4" />
              Admin Console
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="text-destructive"
            >
              <LogOut className="mr-2 h-4 w-4" />
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <AiChatPanel open={aiChatOpen} onOpenChange={setAiChatOpen} />
    </header>
  );
}
