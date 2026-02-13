import { auth } from "@/lib/auth";
import { MyTasksContent } from "@/components/my-tasks/my-tasks-content";

export default async function MyTasksPage() {
  const session = await auth();

  return (
    <div className="h-full">
      <div className="flex h-14 items-center border-b bg-white px-6">
        <h1 className="text-lg font-medium text-[#1e1f21]">My tasks</h1>
      </div>
      <MyTasksContent />
    </div>
  );
}
