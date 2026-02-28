import { auth } from "@/lib/auth";
import Link from "next/link";
import { JoinTeamClient } from "./join-team-client";

export default async function JoinTeamPage({
    params,
}: {
    params: Promise<{ token: string }>;
}) {
    const { token } = await params;
    const session = await auth();

    if (session?.user) {
        return <JoinTeamClient token={token} />;
    }

    return (
        <div className="flex min-h-screen items-center justify-center bg-gray-50">
            <div className="w-full max-w-md space-y-6 rounded-lg border bg-white p-8 shadow-sm">
                <div className="space-y-2 text-center">
                    <h1 className="text-2xl font-semibold">You&apos;ve been invited</h1>
                    <p className="text-sm text-muted-foreground">
                        Sign in or create an account to join this team
                    </p>
                </div>

                <div className="space-y-3">
                    <Link
                        href={`/login?callbackUrl=/join-team/${token}`}
                        className="flex w-full items-center justify-center rounded-md bg-[#4573D2] px-4 py-2.5 text-sm font-medium text-white hover:bg-[#3A63B8]"
                    >
                        Log in to join
                    </Link>
                    <Link
                        href={`/register?callbackUrl=/join-team/${token}`}
                        className="flex w-full items-center justify-center rounded-md border px-4 py-2.5 text-sm font-medium hover:bg-gray-50"
                    >
                        Create account to join
                    </Link>
                </div>
            </div>
        </div>
    );
}
