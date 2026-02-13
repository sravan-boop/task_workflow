import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import { SearchCommand } from "@/components/search/search-command";
import { KeyboardShortcuts } from "@/components/keyboard/keyboard-shortcuts";
import { QuickAddTaskDialog } from "@/components/task/quick-add-task-dialog";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  return (
    <div className="flex h-screen flex-col overflow-hidden">
      <Topbar />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-y-auto bg-[#FFF6F1] dark:bg-background">
          {children}
        </main>
      </div>
      <SearchCommand />
      <KeyboardShortcuts />
      <QuickAddTaskDialog />
    </div>
  );
}
