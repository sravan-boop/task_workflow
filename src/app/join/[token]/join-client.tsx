"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { trpc } from "@/lib/trpc";

export function JoinClient({ token }: { token: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  const joinMutation = trpc.workspaces.joinByToken.useMutation({
    onSuccess: () => {
      router.push("/home");
      router.refresh();
    },
    onError: (err) => {
      setError(err.message);
    },
  });

  useEffect(() => {
    joinMutation.mutate({ token });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="w-full max-w-md space-y-4 rounded-lg border bg-white p-8 shadow-sm text-center">
          <h1 className="text-xl font-semibold text-destructive">Invalid invite link</h1>
          <p className="text-sm text-muted-foreground">{error}</p>
          <a
            href="/home"
            className="inline-block rounded-md bg-[#4573D2] px-4 py-2 text-sm font-medium text-white hover:bg-[#3A63B8]"
          >
            Go to Home
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="text-center space-y-2">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-[#4573D2] mx-auto" />
        <p className="text-sm text-muted-foreground">Joining workspace...</p>
      </div>
    </div>
  );
}
