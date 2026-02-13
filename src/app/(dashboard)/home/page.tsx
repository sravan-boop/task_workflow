import { auth } from "@/lib/auth";
import { HomeContent } from "@/components/home/home-content";
import { HomeGreeting } from "@/components/home/home-greeting";

export default async function HomePage() {
  const session = await auth();
  const firstName = session?.user?.name?.split(" ")[0] || "there";

  return (
    <div className="mx-auto max-w-5xl px-8 py-8">
      <HomeGreeting firstName={firstName} />
      <HomeContent />
    </div>
  );
}
