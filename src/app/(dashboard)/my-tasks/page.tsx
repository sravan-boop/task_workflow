import { auth } from "@/lib/auth";
import { MyTasksContent } from "@/components/my-tasks/my-tasks-content";
import { MyTasksHeader } from "@/components/my-tasks/my-tasks-header";

export default async function MyTasksPage() {
  const session = await auth();

  return (
    <div className="h-full">
      <MyTasksHeader />
      <MyTasksContent />
    </div>
  );
}
