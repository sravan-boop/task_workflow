"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Users,
  UserPlus,
  Mail,
  Crown,
  Copy,
  FolderKanban,
  Trash2,
  Link2,
  ArrowRightLeft,
  Pencil,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useSession } from "next-auth/react";

export default function TeamPage() {
  const params = useParams();
  const teamId = params.id as string;
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [renameOpen, setRenameOpen] = useState(false);
  const [renameName, setRenameName] = useState("");

  const { data: team, isLoading } = trpc.teams.get.useQuery({ id: teamId });
  const utils = trpc.useUtils();
  const { data: session } = useSession();

  const currentUserId = session?.user?.id;
  const currentUserRole = team?.members.find((m) => m.user.id === currentUserId)?.role;
  const isLead = currentUserRole === "LEAD";
  const isWorkspaceOwner = team?.workspace?.members.find((m) => m.userId === currentUserId)?.role === "OWNER";
  const canManageTeam = isLead || isWorkspaceOwner;

  const addMember = trpc.teams.addMember.useMutation({
    onSuccess: (data) => {
      utils.teams.get.invalidate({ id: teamId });
      if (data && "emailSent" in data && data.emailSent) {
        toast.success(`Invite email sent to ${inviteEmail}`);
      } else {
        toast.success("Member added to team");
      }
      setInviteEmail("");
      setInviteOpen(false);
    },
    onError: (err) => {
      toast.error(err.message);
    },
  });

  const removeMember = trpc.teams.removeMember.useMutation({
    onSuccess: () => {
      utils.teams.get.invalidate({ id: teamId });
      toast.success("Member removed");
    },
    onError: () => toast.error("Failed to remove member"),
  });

  const { data: inviteData } = trpc.teams.getInviteLink.useQuery(
    { teamId },
    { enabled: !!isLead }
  );

  const regenerateInvite = trpc.teams.regenerateInviteLink.useMutation({
    onSuccess: () => {
      utils.teams.getInviteLink.invalidate({ teamId });
      toast.success("Invite link regenerated");
    },
    onError: () => toast.error("Failed to regenerate link"),
  });

  const makeLead = trpc.teams.makeLead.useMutation({
    onSuccess: () => {
      utils.teams.get.invalidate({ id: teamId });
      toast.success("Team leadership transferred!");
    },
    onError: (err) => toast.error(err.message || "Failed to transfer leadership"),
  });

  const renameTeam = trpc.teams.update.useMutation({
    onSuccess: () => {
      utils.teams.get.invalidate({ id: teamId });
      utils.teams.list.invalidate(); // To update sidebar
      toast.success("Team renamed successfully!");
      setRenameOpen(false);
    },
    onError: (err) => toast.error(err.message || "Failed to rename team"),
  });

  const handleInvite = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim()) return;
    addMember.mutate({ teamId, email: inviteEmail.trim() });
  };

  const inviteLink = inviteData?.token
    ? `${typeof window !== "undefined" ? window.location.origin : ""}/join-team/${inviteData.token}`
    : "Loading invite link...";

  const copyInviteLink = () => {
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(inviteLink).then(() => {
        toast.success("Invite link copied to clipboard");
      }).catch(() => {
        fallbackCopy(inviteLink);
      });
    } else {
      fallbackCopy(inviteLink);
    }
  };

  const fallbackCopy = (text: string) => {
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    document.body.appendChild(textarea);
    textarea.select();
    try {
      document.execCommand("copy");
      toast.success("Invite link copied to clipboard");
    } catch {
      toast.error("Failed to copy. Please copy manually.");
    }
    document.body.removeChild(textarea);
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <Skeleton className="h-8 w-48" />
        <div className="mt-6 space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      </div>
    );
  }

  if (!team) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-muted-foreground">Team not found</p>
      </div>
    );
  }

  return (
    <>
      <div className="h-full">
        <div className="flex h-14 items-center justify-between border-b bg-white px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#4573D2]/10">
              <Users className="h-5 w-5 text-[#4573D2]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-medium text-[#1e1f21]">{team.name}</h1>
                {canManageTeam && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 text-muted-foreground hover:text-foreground"
                    title="Rename Team"
                    onClick={() => {
                      setRenameName(team.name);
                      setRenameOpen(true);
                    }}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
              {team.description && (
                <p className="text-xs text-muted-foreground">{team.description}</p>
              )}
            </div>
          </div>
          <Button
            size="sm"
            className="gap-1.5 bg-[#4573D2] hover:bg-[#3A63B8]"
            onClick={() => setInviteOpen(true)}
          >
            <UserPlus className="h-3.5 w-3.5" />
            Invite member
          </Button>
        </div>

        <div className="p-6">
          <div className="grid gap-6 lg:grid-cols-3">
            {/* Members Card */}
            <div className="lg:col-span-2">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Users className="h-4 w-4" />
                    Members ({team.members.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {team.members.map((member) => {
                      const initials = member.user.name
                        ?.split(" ")
                        .map((n) => n[0])
                        .join("")
                        .toUpperCase()
                        .slice(0, 2);
                      return (
                        <div
                          key={member.id}
                          className="flex items-center gap-3 rounded-lg border px-4 py-3"
                        >
                          <Avatar className="h-9 w-9">
                            <AvatarFallback className="bg-[#4573D2] text-xs text-white">
                              {initials || "U"}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1">
                            <p className="text-sm font-medium text-[#1e1f21]">
                              {member.user.name}
                              {member.role === "LEAD" && (
                                <Crown className="ml-1.5 inline h-3.5 w-3.5 text-yellow-500" />
                              )}
                            </p>
                            <p className="text-xs text-muted-foreground">{member.user.email}</p>
                          </div>
                          <Badge variant="outline" className="text-xs">
                            {member.role}
                          </Badge>
                          <div className="flex items-center gap-1">
                            {canManageTeam && member.role !== "LEAD" && (
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-8 text-xs font-medium"
                                title="Transfer Leadership"
                                onClick={() => {
                                  if (window.confirm(`Make ${member.user.name} the team lead? You will become a regular member.`)) {
                                    makeLead.mutate({
                                      teamId,
                                      newLeadId: member.user.id
                                    });
                                  }
                                }}
                                disabled={makeLead.isPending}
                              >
                                Make Lead
                              </Button>
                            )}
                            {member.role !== "LEAD" && canManageTeam && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-muted-foreground hover:text-destructive"
                                onClick={() => {
                                  if (window.confirm(`Remove ${member.user.name} from this team?`)) {
                                    removeMember.mutate({ teamId, userId: member.user.id });
                                  }
                                }}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Invite & Info Card */}
            <div className="space-y-6">
              {canManageTeam && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-base">
                      <Link2 className="h-4 w-4" />
                      Invite Link
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">
                      Share this link to invite people to register and join the team.
                    </p>
                    <div className="flex gap-2">
                      <Input readOnly value={inviteLink} className="bg-gray-50 font-mono text-xs" onClick={(e) => (e.target as HTMLInputElement).select()} />
                      <Button variant="outline" size="icon" onClick={copyInviteLink} disabled={!inviteData?.token}>
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                    <Button
                      variant="link"
                      size="sm"
                      className="px-0 text-xs text-muted-foreground"
                      onClick={() => regenerateInvite.mutate({ teamId })}
                      disabled={regenerateInvite.isPending}
                    >
                      Generate new link
                    </Button>
                  </CardContent>
                </Card>
              )}

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <FolderKanban className="h-4 w-4" />
                    Projects ({team.projects.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {team.projects.length > 0 ? (
                    <div className="space-y-2">
                      {team.projects.map((project) => (
                        <Link
                          key={project.id}
                          href={`/projects/${project.id}`}
                          className="flex items-center gap-2 rounded-md p-2 text-sm hover:bg-muted/50"
                        >
                          <div
                            className="h-3 w-3 rounded-sm"
                            style={{ backgroundColor: project.color }}
                          />
                          <span className="truncate">{project.name}</span>
                        </Link>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      No projects assigned to this team yet.
                    </p>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>

      {/* Invite Member Dialog */}
      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle>Invite member to {team.name}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleInvite} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="invite-email">Email address</Label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="invite-email"
                    type="email"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    placeholder="name@example.com"
                    className="pl-10"
                    autoFocus
                  />
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                The user must already have an account. Share the invite link below for new users.
              </p>
            </div>

            <div className="rounded-lg border bg-muted/30 p-3">
              <p className="mb-2 text-xs font-medium text-[#1e1f21]">Or share invite link</p>
              <div className="flex gap-2">
                <Input value={inviteLink} readOnly className="text-xs" onClick={(e) => (e.target as HTMLInputElement).select()} />
                <Button type="button" variant="outline" size="sm" onClick={copyInviteLink}>
                  <Copy className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="ghost" onClick={() => setInviteOpen(false)}>
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={!inviteEmail.trim() || addMember.isPending}
                className="bg-[#4573D2] hover:bg-[#3A63B8]"
              >
                {addMember.isPending ? "Adding..." : "Add member"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Rename Team Dialog */}
      <Dialog open={renameOpen} onOpenChange={setRenameOpen}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle>Rename Team</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (renameName.trim() && renameName !== team.name) {
                renameTeam.mutate({ id: teamId, name: renameName.trim() });
              }
            }}
            className="space-y-4"
          >
            <div className="space-y-2">
              <Label htmlFor="team-name">Team Name</Label>
              <Input
                id="team-name"
                value={renameName}
                onChange={(e) => setRenameName(e.target.value)}
                placeholder="Enter new team name"
                autoFocus
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="ghost" onClick={() => setRenameOpen(false)}>
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={!renameName.trim() || renameName.trim() === team.name || renameTeam.isPending}
                className="bg-[#4573D2] hover:bg-[#3A63B8]"
              >
                {renameTeam.isPending ? "Saving..." : "Save changes"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
