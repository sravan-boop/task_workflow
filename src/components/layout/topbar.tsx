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
import { useState, useMemo } from "react";
import Link from "next/link";
import { AiChatPanel } from "@/components/ai/ai-chat-panel";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { DndMenu } from "@/components/notifications/dnd-menu";

export function Topbar() {
  const { data: session } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const [searchOpen, setSearchOpen] = useState(false);
  const [aiChatOpen, setAiChatOpen] = useState(false);

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

      {/* Center - Search */}
      <div className="flex max-w-lg flex-1 items-center justify-center px-4">
        <button
          onClick={() => setSearchOpen(true)}
          className="flex h-8 w-full max-w-md items-center gap-2 rounded-md border bg-muted/40 px-3 text-sm text-muted-foreground transition-colors hover:bg-muted/60"
        >
          <Search className="h-4 w-4" />
          <span>Search</span>
          <kbd className="ml-auto rounded border bg-white px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
            ⌘K
          </kbd>
        </button>
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
