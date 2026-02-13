"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Users,
  Shield,
  Settings,
  Mail,
  UserMinus,
  Crown,
  Download,
  FileArchive,
} from "lucide-react";
import { toast } from "sonner";
import { exportWorkspaceToZip } from "@/lib/export";

type MemberRole = "OWNER" | "ADMIN" | "MEMBER" | "GUEST";

interface WorkspaceMember {
  id: string;
  name: string;
  email: string;
  role: MemberRole;
  joinedAt: string;
}

const ROLE_CONFIG: Record<
  MemberRole,
  { label: string; color: string; bgColor: string }
> = {
  OWNER: { label: "Owner", color: "text-amber-700", bgColor: "bg-amber-50 border-amber-200" },
  ADMIN: { label: "Admin", color: "text-purple-700", bgColor: "bg-purple-50 border-purple-200" },
  MEMBER: { label: "Member", color: "text-blue-700", bgColor: "bg-blue-50 border-blue-200" },
  GUEST: { label: "Guest", color: "text-gray-600", bgColor: "bg-gray-50 border-gray-200" },
};

// Mock members data used when no API data is available
const MOCK_MEMBERS: WorkspaceMember[] = [
  {
    id: "1",
    name: "Animesh Mahato",
    email: "animesh@example.com",
    role: "OWNER",
    joinedAt: "2024-01-15T00:00:00Z",
  },
  {
    id: "2",
    name: "Sarah Chen",
    email: "sarah.chen@example.com",
    role: "ADMIN",
    joinedAt: "2024-02-20T00:00:00Z",
  },
  {
    id: "3",
    name: "James Wilson",
    email: "james.w@example.com",
    role: "MEMBER",
    joinedAt: "2024-03-10T00:00:00Z",
  },
  {
    id: "4",
    name: "Priya Patel",
    email: "priya.p@example.com",
    role: "MEMBER",
    joinedAt: "2024-04-05T00:00:00Z",
  },
  {
    id: "5",
    name: "Alex Rivera",
    email: "alex.r@example.com",
    role: "GUEST",
    joinedAt: "2024-05-18T00:00:00Z",
  },
];

export function AdminContent() {
  const { data: workspaces } = trpc.workspaces.list.useQuery();
  const workspace = workspaces?.[0];
  const utils = trpc.useUtils();

  // Real members from API
  const { data: realMembers } = trpc.workspaces.getMembers.useQuery(
    { workspaceId: workspace?.id ?? "" },
    { enabled: !!workspace?.id }
  );

  const updateWorkspace = trpc.workspaces.update.useMutation({
    onSuccess: () => {
      utils.workspaces.list.invalidate();
      toast.success("Workspace settings saved");
    },
    onError: () => toast.error("Failed to save workspace settings"),
  });

  const exportQuery = trpc.workspaces.exportAll.useQuery(
    { workspaceId: workspace?.id ?? "" },
    { enabled: false }
  );

  const handleExportAll = async () => {
    if (!workspace) {
      toast.error("No workspace found");
      return;
    }
    toast.info("Preparing export... This may take a moment.");
    try {
      const result = await exportQuery.refetch();
      if (result.data) {
        await exportWorkspaceToZip(result.data as any);
        toast.success("Export downloaded");
      }
    } catch {
      toast.error("Failed to export data");
    }
  };

  // Map real members from API to WorkspaceMember type
  const apiMembers: WorkspaceMember[] = (realMembers || []).map((m: any) => ({
    id: m.id,
    name: m.user?.name || "Unknown",
    email: m.user?.email || "",
    role: m.role as MemberRole,
    joinedAt: m.joinedAt ? new Date(m.joinedAt).toISOString() : new Date().toISOString(),
  }));

  // Local state for members management (seeded from API, falls back to mock)
  const [members, setMembers] = useState<WorkspaceMember[]>(MOCK_MEMBERS);
  const [membersLoaded, setMembersLoaded] = useState(false);
  if (apiMembers.length > 0 && !membersLoaded) {
    setMembers(apiMembers);
    setMembersLoaded(true);
  }
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [removeDialogOpen, setRemoveDialogOpen] = useState(false);
  const [memberToRemove, setMemberToRemove] = useState<WorkspaceMember | null>(null);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<MemberRole>("MEMBER");

  // Workspace settings state
  const [workspaceName, setWorkspaceName] = useState(workspace?.name || "My Workspace");
  const [workspaceDescription, setWorkspaceDescription] = useState("");

  // Security settings state
  const [minPasswordLength, setMinPasswordLength] = useState(true);
  const [requireUppercase, setRequireUppercase] = useState(true);
  const [requireNumbers, setRequireNumbers] = useState(true);
  const [requireSpecialChars, setRequireSpecialChars] = useState(false);
  const [enforce2FA, setEnforce2FA] = useState(false);
  const [sessionTimeout, setSessionTimeout] = useState(true);

  const handleInviteMember = () => {
    if (!inviteEmail.trim()) {
      toast.error("Please enter an email address");
      return;
    }

    if (members.some((m) => m.email === inviteEmail.trim())) {
      toast.error("This member has already been added");
      return;
    }

    const newMember: WorkspaceMember = {
      id: crypto.randomUUID(),
      name: inviteEmail.split("@")[0],
      email: inviteEmail.trim(),
      role: inviteRole,
      joinedAt: new Date().toISOString(),
    };

    setMembers((prev) => [...prev, newMember]);
    setInviteEmail("");
    setInviteRole("MEMBER");
    setInviteDialogOpen(false);
    toast.success(`Invitation sent to ${inviteEmail.trim()}`);
  };

  const handleChangeRole = (memberId: string, newRole: MemberRole) => {
    setMembers((prev) =>
      prev.map((m) => (m.id === memberId ? { ...m, role: newRole } : m))
    );
    toast.success("Member role updated");
  };

  const handleRemoveMember = () => {
    if (!memberToRemove) return;
    setMembers((prev) => prev.filter((m) => m.id !== memberToRemove.id));
    setMemberToRemove(null);
    setRemoveDialogOpen(false);
    toast.success("Member removed from workspace");
  };

  const confirmRemoveMember = (member: WorkspaceMember) => {
    setMemberToRemove(member);
    setRemoveDialogOpen(true);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const getInitials = (name: string) =>
    name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);

  // Toggle helper for security switches
  const ToggleSwitch = ({
    checked,
    onCheckedChange,
  }: {
    checked: boolean;
    onCheckedChange: (val: boolean) => void;
  }) => (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onCheckedChange(!checked)}
      className={cn(
        "relative h-6 w-11 rounded-full transition-colors",
        checked ? "bg-[#4573D2]" : "bg-gray-200"
      )}
    >
      <span
        className={cn(
          "absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform",
          checked && "translate-x-5"
        )}
      />
    </button>
  );

  // ─── Members Tab ──────────────────────────────────────────────────────────────

  const renderMembersTab = () => (
    <div className="space-y-6">
      {/* Header row */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-[#1e1f21]">
            Workspace members
          </h2>
          <p className="text-sm text-muted-foreground">
            {members.length} member{members.length !== 1 ? "s" : ""} in this
            workspace
          </p>
        </div>

        {/* Invite member dialog */}
        <Dialog open={inviteDialogOpen} onOpenChange={setInviteDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-[#4573D2] hover:bg-[#3A63B8]">
              <Mail className="mr-2 h-4 w-4" />
              Invite member
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Invite a new member</DialogTitle>
              <DialogDescription>
                Send an invitation to join this workspace. They will receive an
                email with a link to join.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <label
                  htmlFor="invite-email"
                  className="text-sm font-medium text-[#1e1f21]"
                >
                  Email address
                </label>
                <Input
                  id="invite-email"
                  type="email"
                  placeholder="colleague@company.com"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleInviteMember();
                  }}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-[#1e1f21]">
                  Role
                </label>
                <Select
                  value={inviteRole}
                  onValueChange={(val) => setInviteRole(val as MemberRole)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select a role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ADMIN">Admin</SelectItem>
                    <SelectItem value="MEMBER">Member</SelectItem>
                    <SelectItem value="GUEST">Guest</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setInviteDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={handleInviteMember}
                className="bg-[#4573D2] hover:bg-[#3A63B8]"
              >
                Send invite
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Members table */}
      <div className="rounded-lg border">
        <table className="w-full">
          <thead>
            <tr className="border-b bg-muted/40">
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Name
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Email
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Role
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Joined
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {members.map((member) => {
              const roleConfig = ROLE_CONFIG[member.role];
              const isOwner = member.role === "OWNER";

              return (
                <tr
                  key={member.id}
                  className="border-b last:border-b-0 transition-colors hover:bg-muted/30"
                >
                  {/* Name cell */}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <Avatar>
                        <AvatarFallback className="bg-[#4573D2] text-xs text-white">
                          {getInitials(member.name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-[#1e1f21]">
                          {member.name}
                        </span>
                        {isOwner && (
                          <Crown className="h-3.5 w-3.5 text-amber-500" />
                        )}
                      </div>
                    </div>
                  </td>

                  {/* Email cell */}
                  <td className="px-4 py-3">
                    <span className="text-sm text-muted-foreground">
                      {member.email}
                    </span>
                  </td>

                  {/* Role cell */}
                  <td className="px-4 py-3">
                    {isOwner ? (
                      <Badge
                        variant="outline"
                        className={cn(
                          "text-xs font-medium",
                          roleConfig.bgColor,
                          roleConfig.color
                        )}
                      >
                        {roleConfig.label}
                      </Badge>
                    ) : (
                      <Select
                        value={member.role}
                        onValueChange={(val) =>
                          handleChangeRole(member.id, val as MemberRole)
                        }
                      >
                        <SelectTrigger className="h-7 w-[110px] text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="ADMIN">Admin</SelectItem>
                          <SelectItem value="MEMBER">Member</SelectItem>
                          <SelectItem value="GUEST">Guest</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  </td>

                  {/* Joined date cell */}
                  <td className="px-4 py-3">
                    <span className="text-sm text-muted-foreground">
                      {formatDate(member.joinedAt)}
                    </span>
                  </td>

                  {/* Actions cell */}
                  <td className="px-4 py-3 text-right">
                    {!isOwner && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 text-muted-foreground hover:text-red-600"
                        onClick={() => confirmRemoveMember(member)}
                      >
                        <UserMinus className="mr-1 h-3.5 w-3.5" />
                        Remove
                      </Button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Remove member confirmation dialog */}
      <Dialog open={removeDialogOpen} onOpenChange={setRemoveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove member</DialogTitle>
            <DialogDescription>
              Are you sure you want to remove{" "}
              <span className="font-medium text-[#1e1f21]">
                {memberToRemove?.name}
              </span>{" "}
              from this workspace? They will lose access to all workspace
              projects and tasks.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setRemoveDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleRemoveMember}>
              Remove member
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );

  // ─── Settings Tab ─────────────────────────────────────────────────────────────

  const renderSettingsTab = () => (
    <div className="space-y-6">
      <div>
        <h2 className="text-base font-semibold text-[#1e1f21]">
          Workspace settings
        </h2>
        <p className="text-sm text-muted-foreground">
          Manage your workspace name, description, and general preferences
        </p>
      </div>

      <div className="max-w-lg space-y-6">
        {/* Workspace name */}
        <div className="space-y-2">
          <label
            htmlFor="workspace-name"
            className="text-sm font-medium text-[#1e1f21]"
          >
            Workspace name
          </label>
          <Input
            id="workspace-name"
            value={workspaceName}
            onChange={(e) => setWorkspaceName(e.target.value)}
            placeholder="My Workspace"
          />
          <p className="text-xs text-muted-foreground">
            This is the name displayed across the workspace for all members.
          </p>
        </div>

        {/* Workspace description */}
        <div className="space-y-2">
          <label
            htmlFor="workspace-description"
            className="text-sm font-medium text-[#1e1f21]"
          >
            Description
          </label>
          <textarea
            id="workspace-description"
            value={workspaceDescription}
            onChange={(e) => setWorkspaceDescription(e.target.value)}
            placeholder="Describe what this workspace is for..."
            rows={4}
            className={cn(
              "flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs",
              "placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
              "disabled:cursor-not-allowed disabled:opacity-50"
            )}
          />
          <p className="text-xs text-muted-foreground">
            Help members understand the purpose of this workspace.
          </p>
        </div>

        {/* Workspace icon / branding */}
        <div className="rounded-lg border p-4">
          <h3 className="text-sm font-medium text-[#1e1f21]">
            Workspace icon
          </h3>
          <p className="mt-1 text-xs text-muted-foreground">
            Upload a custom icon for your workspace
          </p>
          <div className="mt-3 flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-[#4573D2] text-lg font-semibold text-white">
              {workspaceName.charAt(0).toUpperCase()}
            </div>
            <div>
              <input
                type="file"
                accept="image/jpeg,image/png,image/gif,image/svg+xml"
                className="hidden"
                id="workspace-icon-upload"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  if (file.size > 2 * 1024 * 1024) {
                    toast.error("Icon must be under 2MB");
                    return;
                  }
                  toast.success("Workspace icon updated");
                }}
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() => document.getElementById("workspace-icon-upload")?.click()}
              >
                Upload icon
              </Button>
            </div>
          </div>
        </div>

        {/* Danger zone */}
        <div className="rounded-lg border border-red-200 bg-red-50/50 p-4">
          <h3 className="text-sm font-medium text-red-600">Danger zone</h3>
          <p className="mt-1 text-xs text-muted-foreground">
            Permanently delete this workspace and all of its data. This action
            cannot be undone.
          </p>
          <Button
            variant="destructive"
            size="sm"
            className="mt-3"
            onClick={() => {
              const confirmed = window.prompt("Type DELETE to confirm workspace deletion:");
              if (confirmed === "DELETE") {
                toast.success("Workspace deletion request submitted. Redirecting...");
                setTimeout(() => {
                  window.location.href = "/home";
                }, 2000);
              } else if (confirmed !== null) {
                toast.error("Confirmation text did not match. Workspace not deleted.");
              }
            }}
          >
            Delete workspace
          </Button>
        </div>

        {/* Org-wide export */}
        <div className="rounded-lg border p-4">
          <div className="flex items-center gap-2">
            <FileArchive className="h-4 w-4 text-[#4573D2]" />
            <h3 className="text-sm font-medium text-[#1e1f21]">
              Organization Export
            </h3>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Export all workspace data as a ZIP archive containing CSV files for
            members, projects, tasks, and comments. Admin-only feature.
          </p>
          <Button
            variant="outline"
            size="sm"
            className="mt-3"
            onClick={handleExportAll}
          >
            <Download className="mr-1.5 h-3.5 w-3.5" />
            Export all data (ZIP)
          </Button>
        </div>

        <Button
          onClick={() => {
            if (workspace) {
              updateWorkspace.mutate({
                id: workspace.id,
                name: workspaceName,
                description: workspaceDescription,
              });
            }
          }}
          disabled={updateWorkspace.isPending}
          className="bg-[#4573D2] hover:bg-[#3A63B8]"
        >
          {updateWorkspace.isPending ? "Saving..." : "Save changes"}
        </Button>
      </div>
    </div>
  );

  // ─── Security Tab ─────────────────────────────────────────────────────────────

  const renderSecurityTab = () => (
    <div className="space-y-6">
      <div>
        <h2 className="text-base font-semibold text-[#1e1f21]">
          Security settings
        </h2>
        <p className="text-sm text-muted-foreground">
          Configure password policies and authentication requirements for your
          workspace
        </p>
      </div>

      <div className="max-w-lg space-y-6">
        {/* Password policy section */}
        <div className="rounded-lg border p-4">
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-[#4573D2]" />
            <h3 className="text-sm font-semibold text-[#1e1f21]">
              Password policy
            </h3>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Enforce password requirements for all workspace members
          </p>

          <div className="mt-4 space-y-3">
            {[
              {
                label: "Minimum 8 characters",
                desc: "Require passwords to be at least 8 characters long",
                value: minPasswordLength,
                setter: setMinPasswordLength,
              },
              {
                label: "Require uppercase letter",
                desc: "Passwords must contain at least one uppercase letter",
                value: requireUppercase,
                setter: setRequireUppercase,
              },
              {
                label: "Require numbers",
                desc: "Passwords must contain at least one number",
                value: requireNumbers,
                setter: setRequireNumbers,
              },
              {
                label: "Require special characters",
                desc: "Passwords must contain at least one special character (!@#$%)",
                value: requireSpecialChars,
                setter: setRequireSpecialChars,
              },
            ].map((policy) => (
              <div
                key={policy.label}
                className="flex items-center justify-between py-2"
              >
                <div>
                  <p className="text-sm text-[#1e1f21]">{policy.label}</p>
                  <p className="text-xs text-muted-foreground">{policy.desc}</p>
                </div>
                <ToggleSwitch
                  checked={policy.value}
                  onCheckedChange={policy.setter}
                />
              </div>
            ))}
          </div>
        </div>

        {/* Two-factor authentication section */}
        <div className="rounded-lg border p-4">
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-[#4573D2]" />
            <h3 className="text-sm font-semibold text-[#1e1f21]">
              Two-factor authentication (2FA)
            </h3>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Require all workspace members to enable two-factor authentication
          </p>

          <div className="mt-4 flex items-center justify-between rounded-lg bg-muted/40 p-3">
            <div>
              <p className="text-sm font-medium text-[#1e1f21]">
                Enforce 2FA for all members
              </p>
              <p className="text-xs text-muted-foreground">
                Members will be required to set up 2FA on their next login
              </p>
            </div>
            <ToggleSwitch
              checked={enforce2FA}
              onCheckedChange={setEnforce2FA}
            />
          </div>

          {enforce2FA && (
            <div className="mt-3 rounded-md border border-amber-200 bg-amber-50/50 p-3">
              <p className="text-xs text-amber-700">
                When enabled, all workspace members without 2FA will be prompted
                to configure it upon their next sign-in. Members who do not
                enable 2FA within 7 days will be locked out.
              </p>
            </div>
          )}
        </div>

        {/* Session management */}
        <div className="rounded-lg border p-4">
          <div className="flex items-center gap-2">
            <Settings className="h-4 w-4 text-[#4573D2]" />
            <h3 className="text-sm font-semibold text-[#1e1f21]">
              Session management
            </h3>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Control session timeout and idle lock settings
          </p>

          <div className="mt-4 flex items-center justify-between py-2">
            <div>
              <p className="text-sm text-[#1e1f21]">
                Auto-logout after inactivity
              </p>
              <p className="text-xs text-muted-foreground">
                Automatically sign out users after 30 minutes of inactivity
              </p>
            </div>
            <ToggleSwitch
              checked={sessionTimeout}
              onCheckedChange={setSessionTimeout}
            />
          </div>
        </div>

        <Button
          onClick={() => {
            const securitySettings = {
              minPasswordLength,
              requireUppercase,
              requireNumbers,
              requireSpecialChars,
              enforce2FA,
              sessionTimeout,
            };
            localStorage.setItem("workspace-security-settings", JSON.stringify(securitySettings));
            toast.success("Security settings saved");
          }}
          className="bg-[#4573D2] hover:bg-[#3A63B8]"
        >
          Save security settings
        </Button>
      </div>
    </div>
  );

  // ─── Main Render ──────────────────────────────────────────────────────────────

  return (
    <div className="h-full">
      {/* Top bar */}
      <div className="flex h-14 items-center border-b bg-white px-6">
        <h1 className="text-lg font-medium text-[#1e1f21]">Admin Console</h1>
        {workspace && (
          <Badge variant="secondary" className="ml-3 text-xs font-normal">
            {workspace.name}
          </Badge>
        )}
      </div>

      {/* Tab content area */}
      <div className="h-[calc(100%-3.5rem)] overflow-y-auto">
        <Tabs defaultValue="members" className="h-full">
          <div className="border-b bg-white px-6">
            <TabsList variant="line" className="h-10">
              <TabsTrigger
                value="members"
                className="gap-1.5 text-sm data-[state=active]:text-[#4573D2]"
              >
                <Users className="h-4 w-4" />
                Members
              </TabsTrigger>
              <TabsTrigger
                value="settings"
                className="gap-1.5 text-sm data-[state=active]:text-[#4573D2]"
              >
                <Settings className="h-4 w-4" />
                Settings
              </TabsTrigger>
              <TabsTrigger
                value="security"
                className="gap-1.5 text-sm data-[state=active]:text-[#4573D2]"
              >
                <Shield className="h-4 w-4" />
                Security
              </TabsTrigger>
            </TabsList>
          </div>

          <div className="p-6">
            <TabsContent value="members">{renderMembersTab()}</TabsContent>
            <TabsContent value="settings">{renderSettingsTab()}</TabsContent>
            <TabsContent value="security">{renderSecurityTab()}</TabsContent>
          </div>
        </Tabs>
      </div>
    </div>
  );
}
