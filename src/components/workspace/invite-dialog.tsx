"use client";

import { useState } from "react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Copy, RefreshCw, Link, Mail } from "lucide-react";

interface InviteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workspaceId: string | undefined;
}

export function InviteDialog({ open, onOpenChange, workspaceId }: InviteDialogProps) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"ADMIN" | "MEMBER" | "GUEST">("MEMBER");

  const { data: inviteData, refetch } = trpc.workspaces.getInviteLink.useQuery(
    { workspaceId: workspaceId! },
    { enabled: !!workspaceId && open }
  );

  const regenerate = trpc.workspaces.regenerateInviteLink.useMutation({
    onSuccess: () => {
      refetch();
      toast.success("Invite link regenerated");
    },
  });

  const inviteMutation = trpc.workspaces.invite.useMutation({
    onSuccess: (result) => {
      if ("emailSent" in result && result.emailSent) {
        toast.success(`Invite email sent to ${email}`);
      } else {
        toast.success(`Added ${email} to workspace`);
      }
      setEmail("");
    },
    onError: (err) => {
      toast.error(err.message);
    },
  });

  const inviteLink = inviteData?.token
    ? `${typeof window !== "undefined" ? window.location.origin : ""}/join/${inviteData.token}`
    : "";

  const handleCopyLink = () => {
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(inviteLink);
    } else {
      const ta = document.createElement("textarea");
      ta.value = inviteLink;
      ta.style.position = "fixed";
      ta.style.left = "-9999px";
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
    }
    toast.success("Invite link copied to clipboard");
  };

  const handleInviteByEmail = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !workspaceId) return;
    inviteMutation.mutate({ workspaceId, email, role });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Invite people</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Section 1: Invite with link */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Link className="h-4 w-4" />
              Invite with link
            </div>
            <p className="text-xs text-muted-foreground">
              Anyone with this link can join your workspace as a {inviteData?.role?.toLowerCase() || "member"}.
            </p>
            <div className="flex items-center gap-2">
              <Input
                value={inviteLink}
                readOnly
                className="text-xs"
                onClick={(e) => (e.target as HTMLInputElement).select()}
              />
              <Button variant="outline" size="icon" onClick={handleCopyLink} title="Copy link">
                <Copy className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={() => workspaceId && regenerate.mutate({ workspaceId })}
                disabled={regenerate.isPending}
                title="Regenerate link"
              >
                <RefreshCw className={`h-4 w-4 ${regenerate.isPending ? "animate-spin" : ""}`} />
              </Button>
            </div>
          </div>

          <div className="border-t" />

          {/* Section 2: Invite by email */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Mail className="h-4 w-4" />
              Invite by email
            </div>
            <form onSubmit={handleInviteByEmail} className="space-y-3">
              <div className="flex items-center gap-2">
                <Input
                  type="email"
                  placeholder="name@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="flex-1"
                  required
                />
                <Select value={role} onValueChange={(v) => setRole(v as typeof role)}>
                  <SelectTrigger className="w-[110px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ADMIN">Admin</SelectItem>
                    <SelectItem value="MEMBER">Member</SelectItem>
                    <SelectItem value="GUEST">Guest</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button
                type="submit"
                className="w-full bg-[#4573D2] hover:bg-[#3A63B8]"
                disabled={inviteMutation.isPending || !email}
              >
                {inviteMutation.isPending ? "Inviting..." : "Invite"}
              </Button>
            </form>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
