"use client";

import { useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { trpc } from "@/lib/trpc";

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";
  const email = searchParams.get("email") || "";

  const verifyEmail = trpc.auth.verifyEmail.useMutation();

  useEffect(() => {
    if (token && email) {
      verifyEmail.mutate({ email, token });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, email]);

  if (!token || !email) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col items-center space-y-4 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-red-50">
            <AlertCircle className="h-7 w-7 text-red-500" />
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Invalid verification link
          </h1>
          <p className="max-w-sm text-sm text-muted-foreground">
            This email verification link is invalid or has expired.
          </p>
        </div>
        <Link href="/login" className="block">
          <Button className="w-full bg-[#4573D2] py-5 hover:bg-[#3A63B8]">
            Go to login
          </Button>
        </Link>
      </div>
    );
  }

  if (verifyEmail.isPending) {
    return (
      <div className="flex flex-col items-center space-y-4 py-10 text-center">
        <Loader2 className="h-10 w-10 animate-spin text-[#4573D2]" />
        <p className="text-sm text-muted-foreground">
          Verifying your email...
        </p>
      </div>
    );
  }

  if (verifyEmail.isError) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col items-center space-y-4 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-red-50">
            <AlertCircle className="h-7 w-7 text-red-500" />
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Verification failed
          </h1>
          <p className="max-w-sm text-sm text-muted-foreground">
            {verifyEmail.error.message}
          </p>
        </div>
        <Link href="/login" className="block">
          <Button className="w-full bg-[#4573D2] py-5 hover:bg-[#3A63B8]">
            Go to login
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col items-center space-y-4 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50">
          <CheckCircle2 className="h-7 w-7 text-emerald-500" />
        </div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Email verified
        </h1>
        <p className="max-w-sm text-sm text-muted-foreground">
          Your email has been successfully verified. You can now use all
          features of TaskFlow AI.
        </p>
      </div>
      <Link href="/home" className="block">
        <Button className="w-full bg-[#4573D2] py-5 hover:bg-[#3A63B8]">
          Go to dashboard
        </Button>
      </Link>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#4573D2] border-t-transparent" />
        </div>
      }
    >
      <VerifyEmailContent />
    </Suspense>
  );
}
