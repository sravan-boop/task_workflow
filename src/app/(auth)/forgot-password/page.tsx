"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Mail, CheckCircle2 } from "lucide-react";
import { trpc } from "@/lib/trpc";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const forgotPassword = trpc.auth.forgotPassword.useMutation({
    onSuccess: () => {
      setSubmitted(true);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    forgotPassword.mutate({ email });
  };

  if (submitted) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col items-center space-y-4 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50">
            <CheckCircle2 className="h-7 w-7 text-emerald-500" />
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Check your email
          </h1>
          <p className="max-w-sm text-sm text-muted-foreground">
            If an account exists for <strong>{email}</strong>, we&apos;ve sent
            password reset instructions to that address.
          </p>
        </div>

        <div className="space-y-3">
          <Button
            variant="outline"
            className="w-full py-5"
            onClick={() => {
              setSubmitted(false);
              setEmail("");
            }}
          >
            <Mail className="mr-2 h-4 w-4" />
            Try a different email
          </Button>

          <Link href="/login" className="block">
            <Button
              variant="ghost"
              className="w-full gap-2 text-[#4573D2]"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to login
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Link
        href="/login"
        className="flex items-center text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="mr-1 h-4 w-4" />
      </Link>

      <div className="space-y-2 text-center">
        <h1 className="text-3xl font-semibold tracking-tight">
          Reset your password
        </h1>
        <p className="text-muted-foreground">
          Enter your email and we&apos;ll send you a reset link
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">Email address</Label>
          <Input
            id="email"
            type="email"
            placeholder="name@company.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoFocus
          />
        </div>

        {forgotPassword.isError && (
          <p className="text-sm text-destructive">
            Something went wrong. Please try again.
          </p>
        )}

        <Button
          type="submit"
          className="w-full bg-[#4573D2] py-5 hover:bg-[#3A63B8]"
          disabled={forgotPassword.isPending}
        >
          {forgotPassword.isPending
            ? "Sending reset link..."
            : "Send reset link"}
        </Button>
      </form>

      <p className="text-center text-sm text-muted-foreground">
        Remember your password?{" "}
        <Link href="/login" className="text-[#4573D2] hover:underline">
          Log in
        </Link>
      </p>
    </div>
  );
}
