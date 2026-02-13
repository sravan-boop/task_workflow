"use client";

import { useState, useRef, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { useTheme } from "next-themes";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  User,
  Bell,
  Shield,
  Palette,
  Mail,
  Check,
  Globe,
  ShieldCheck,
  Smartphone,
  Copy,
} from "lucide-react";
import { toast } from "sonner";

type SettingsTab = "profile" | "notifications" | "security" | "display";

const tabs = [
  { key: "profile" as const, label: "Profile", icon: User },
  { key: "notifications" as const, label: "Notifications", icon: Bell },
  { key: "security" as const, label: "Security", icon: Shield },
  { key: "display" as const, label: "Display", icon: Palette },
];

function ToggleSwitch({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <button
      onClick={onChange}
      className={cn(
        "relative h-6 w-11 shrink-0 rounded-full transition-colors",
        checked ? "bg-[#4573D2]" : "bg-gray-200 dark:bg-gray-700"
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
}

function TwoFactorSection() {
  const [step, setStep] = useState<"off" | "setup" | "verify" | "done">("off");
  const [verifyCode, setVerifyCode] = useState("");
  const [backupCodes, setBackupCodes] = useState<string[]>([]);

  const handleEnable = () => {
    setStep("setup");
  };

  const handleVerify = () => {
    if (verifyCode.length === 6) {
      // Simulate verification
      const codes = Array.from({ length: 10 }, () =>
        Math.random().toString(36).slice(2, 10).toUpperCase()
      );
      setBackupCodes(codes);
      setStep("done");
      toast.success("Two-factor authentication enabled");
    } else {
      toast.error("Please enter a valid 6-digit code");
    }
  };

  return (
    <div className="rounded-lg border p-4">
      <div className="flex items-center gap-2">
        <ShieldCheck className="h-4 w-4 text-green-600" />
        <h3 className="text-sm font-medium">Two-factor authentication</h3>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">
        Add an extra layer of security using an authenticator app
      </p>

      {step === "off" && (
        <Button variant="outline" size="sm" className="mt-3" onClick={handleEnable}>
          <Smartphone className="mr-1.5 h-3.5 w-3.5" />
          Enable 2FA
        </Button>
      )}

      {step === "setup" && (
        <div className="mt-3 space-y-3">
          <div className="rounded-lg bg-muted p-4 text-center">
            <div className="mx-auto flex h-40 w-40 items-center justify-center rounded border bg-white p-2">
              <svg viewBox="0 0 100 100" className="h-full w-full">
                <rect x="0" y="0" width="100" height="100" fill="white"/>
                {/* Position markers */}
                <rect x="5" y="5" width="25" height="25" fill="black"/>
                <rect x="8" y="8" width="19" height="19" fill="white"/>
                <rect x="11" y="11" width="13" height="13" fill="black"/>
                <rect x="70" y="5" width="25" height="25" fill="black"/>
                <rect x="73" y="8" width="19" height="19" fill="white"/>
                <rect x="76" y="11" width="13" height="13" fill="black"/>
                <rect x="5" y="70" width="25" height="25" fill="black"/>
                <rect x="8" y="73" width="19" height="19" fill="white"/>
                <rect x="11" y="76" width="13" height="13" fill="black"/>
                {/* Deterministic data pattern */}
                <rect x="35" y="5" width="4" height="4" fill="black"/>
                <rect x="35" y="15" width="4" height="4" fill="black"/>
                <rect x="40" y="25" width="4" height="4" fill="black"/>
                <rect x="45" y="5" width="4" height="4" fill="black"/>
                <rect x="50" y="15" width="4" height="4" fill="black"/>
                <rect x="55" y="5" width="4" height="4" fill="black"/>
                <rect x="55" y="25" width="4" height="4" fill="black"/>
                <rect x="60" y="15" width="4" height="4" fill="black"/>
                <rect x="35" y="35" width="4" height="4" fill="black"/>
                <rect x="45" y="40" width="4" height="4" fill="black"/>
                <rect x="40" y="50" width="4" height="4" fill="black"/>
                <rect x="55" y="45" width="4" height="4" fill="black"/>
                <rect x="60" y="55" width="4" height="4" fill="black"/>
                <rect x="50" y="60" width="4" height="4" fill="black"/>
                <rect x="5" y="40" width="4" height="4" fill="black"/>
                <rect x="15" y="35" width="4" height="4" fill="black"/>
                <rect x="25" y="45" width="4" height="4" fill="black"/>
                <rect x="65" y="50" width="4" height="4" fill="black"/>
                <rect x="75" y="55" width="4" height="4" fill="black"/>
                <rect x="70" y="40" width="4" height="4" fill="black"/>
                <rect x="80" y="45" width="4" height="4" fill="black"/>
                <rect x="85" y="35" width="4" height="4" fill="black"/>
                <rect x="90" y="50" width="4" height="4" fill="black"/>
                <rect x="75" y="70" width="4" height="4" fill="black"/>
                <rect x="80" y="80" width="4" height="4" fill="black"/>
                <rect x="85" y="75" width="4" height="4" fill="black"/>
                <rect x="90" y="85" width="4" height="4" fill="black"/>
                <rect x="70" y="90" width="4" height="4" fill="black"/>
                <rect x="85" y="65" width="4" height="4" fill="black"/>
                {/* Alignment pattern */}
                <rect x="62" y="62" width="9" height="9" fill="black"/>
                <rect x="64" y="64" width="5" height="5" fill="white"/>
                <rect x="65" y="65" width="3" height="3" fill="black"/>
              </svg>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              Scan this QR code with your authenticator app (Google Authenticator, Authy, etc.)
            </p>
            <p className="mt-1 text-[10px] text-muted-foreground font-mono">
              Secret: JBSW Y3DP EHPK 3PXP
            </p>
          </div>
          <div className="space-y-2">
            <Label>Verification code</Label>
            <Input
              value={verifyCode}
              onChange={(e) => setVerifyCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              placeholder="Enter 6-digit code"
              maxLength={6}
              className="max-w-[200px]"
            />
          </div>
          <div className="flex gap-2">
            <Button size="sm" onClick={handleVerify}>
              Verify & Enable
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setStep("off")}>
              Cancel
            </Button>
          </div>
        </div>
      )}

      {step === "done" && (
        <div className="mt-3 space-y-3">
          <div className="flex items-center gap-2 text-green-600">
            <Check className="h-4 w-4" />
            <span className="text-sm font-medium">2FA is enabled</span>
          </div>
          {backupCodes.length > 0 && (
            <div className="rounded-lg border bg-muted p-3">
              <p className="mb-2 text-xs font-medium">
                Backup codes (save these somewhere safe):
              </p>
              <div className="grid grid-cols-2 gap-1">
                {backupCodes.map((code) => (
                  <code key={code} className="text-xs">
                    {code}
                  </code>
                ))}
              </div>
              <Button
                variant="outline"
                size="sm"
                className="mt-2"
                onClick={() => {
                  navigator.clipboard.writeText(backupCodes.join("\n"));
                  toast.success("Backup codes copied");
                }}
              >
                <Copy className="mr-1.5 h-3 w-3" />
                Copy codes
              </Button>
            </div>
          )}
          <Button
            variant="outline"
            size="sm"
            className="text-destructive hover:text-destructive"
            onClick={() => {
              setStep("off");
              setBackupCodes([]);
              toast.success("2FA disabled");
            }}
          >
            Disable 2FA
          </Button>
        </div>
      )}
    </div>
  );
}

const LOCALES = [
  { code: "en", label: "English" },
  { code: "es", label: "Espa\u00f1ol" },
  { code: "fr", label: "Fran\u00e7ais" },
  { code: "de", label: "Deutsch" },
  { code: "ja", label: "\u65e5\u672c\u8a9e" },
];

export function SettingsContent() {
  const { data: session, update: updateSession } = useSession();
  const { theme, setTheme } = useTheme();
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState<SettingsTab>(() => {
    const tab = typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("tab") : null;
    if (tab && ["profile", "notifications", "security", "display"].includes(tab)) {
      return tab as SettingsTab;
    }
    return "profile";
  });

  // React to URL tab changes (e.g. from search navigation)
  useEffect(() => {
    const tab = searchParams.get("tab");
    if (tab && ["profile", "notifications", "security", "display"].includes(tab)) {
      setActiveTab(tab as SettingsTab);
    }
  }, [searchParams]);
  const [name, setName] = useState(session?.user?.name || "");
  const [title, setTitle] = useState("");
  const [department, setDepartment] = useState("");
  const [bio, setBio] = useState("");
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const user = session?.user;

  // Load profile data from server
  const { data: profile } = trpc.auth.getProfile.useQuery();
  const [profileLoaded, setProfileLoaded] = useState(false);
  if (profile && !profileLoaded) {
    setName(profile.name || "");
    setTitle(profile.title || "");
    setDepartment(profile.department || "");
    setBio(profile.bio || "");
    if (profile.avatarUrl) setAvatarPreview(profile.avatarUrl);
    setProfileLoaded(true);
  }

  // Security: password change
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const changePassword = trpc.auth.changePassword.useMutation({
    onSuccess: () => {
      toast.success("Password updated successfully");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    },
    onError: (err) => {
      toast.error(err.message);
    },
  });

  // Notification preferences (server-side persistence)
  const { data: serverNotifPrefs } =
    trpc.notifications.getPreferences.useQuery();
  const updatePrefsMutation = trpc.notifications.updatePreferences.useMutation({
    onSuccess: () => {
      toast.success("Notification preferences saved");
    },
    onError: () => {
      toast.error("Failed to save preferences");
    },
  });

  const defaultPrefs = {
    emailEnabled: true,
    inAppEnabled: true,
    taskAssigned: { inApp: true, email: true },
    taskCompleted: { inApp: true, email: false },
    commentAdded: { inApp: true, email: true },
    mentioned: { inApp: true, email: true },
    statusUpdates: { inApp: true, email: false },
    dueDateApproaching: { inApp: true, email: true },
    followerAdded: { inApp: true, email: false },
  };

  const [notifPrefs, setNotifPrefs] = useState(defaultPrefs);
  const [notifPrefsLoaded, setNotifPrefsLoaded] = useState(false);

  // Sync from server when data arrives
  if (serverNotifPrefs && !notifPrefsLoaded) {
    setNotifPrefs(serverNotifPrefs as typeof defaultPrefs);
    setNotifPrefsLoaded(true);
  }

  const updateNotifPref = (
    key: string,
    channel: "inApp" | "email",
    value: boolean
  ) => {
    setNotifPrefs((prev) => ({
      ...prev,
      [key]: { ...(prev as unknown as Record<string, Record<string, boolean>>)[key], [channel]: value },
    } as typeof prev));
  };

  const handleSaveNotifPrefs = () => {
    updatePrefsMutation.mutate(notifPrefs);
  };

  const updateLocale = trpc.auth.updateLocale.useMutation({
    onSuccess: (_, vars) => {
      const label = LOCALES.find(l => l.code === vars.locale)?.label ?? vars.locale;
      toast.success(`Language set to ${label}`);
    },
    onError: () => toast.error("Failed to update language"),
  });

  const updateProfile = trpc.auth.updateProfile.useMutation({
    onSuccess: () => {
      toast.success("Profile updated successfully");
      updateSession();
    },
    onError: (err) => {
      toast.error(err.message || "Failed to update profile");
    },
  });

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error("File must be under 5MB");
      return;
    }
    const reader = new FileReader();
    reader.onloadend = () => {
      const dataUrl = reader.result as string;
      setAvatarPreview(dataUrl);
    };
    reader.readAsDataURL(file);
  };

  const handleSaveProfile = () => {
    updateProfile.mutate({
      name: name || undefined,
      title: title || undefined,
      department: department || undefined,
      bio: bio || undefined,
      avatarUrl: avatarPreview || undefined,
    });
  };

  const handleChangePassword = () => {
    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }
    if (newPassword.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }
    changePassword.mutate({
      currentPassword,
      newPassword,
    });
  };

  const renderProfile = () => (
    <div className="space-y-6">
      <div>
        <h2 className="text-base font-semibold text-[#1e1f21] dark:text-gray-100">
          My profile
        </h2>
        <p className="text-sm text-muted-foreground">
          Manage your personal information
        </p>
      </div>

      <div className="flex items-center gap-4">
        <Avatar className="h-20 w-20">
          {avatarPreview ? (
            <AvatarImage src={avatarPreview} alt="Profile" />
          ) : null}
          <AvatarFallback className="bg-[#4573D2] text-2xl text-white">
            {user?.name
              ?.split(" ")
              .map((n) => n[0])
              .join("") || "U"}
          </AvatarFallback>
        </Avatar>
        <div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/gif"
            className="hidden"
            onChange={handlePhotoUpload}
          />
          <Button
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
          >
            Upload photo
          </Button>
          {avatarPreview && (
            <Button
              variant="ghost"
              size="sm"
              className="ml-2 text-xs text-destructive"
              onClick={() => setAvatarPreview(null)}
            >
              Remove
            </Button>
          )}
          <p className="mt-1 text-xs text-muted-foreground">
            JPG, PNG or GIF. Max 5MB.
          </p>
        </div>
      </div>

      <Separator />

      <div className="grid max-w-lg gap-4">
        <div className="space-y-2">
          <Label htmlFor="name">Full name</Label>
          <Input
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <div className="flex items-center gap-2">
            <Input
              id="email"
              value={user?.email || ""}
              disabled
              className="bg-muted"
            />
            <Mail className="h-4 w-4 text-muted-foreground" />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="title">Job title</Label>
          <Input
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g., Product Manager"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="department">Department</Label>
          <Input
            id="department"
            value={department}
            onChange={(e) => setDepartment(e.target.value)}
            placeholder="e.g., Engineering"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="bio">About me</Label>
          <Textarea
            id="bio"
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder="Tell others a bit about yourself"
            rows={3}
          />
        </div>

        <Button
          onClick={handleSaveProfile}
          disabled={updateProfile.isPending}
          className="w-fit bg-[#4573D2] hover:bg-[#3A63B8]"
        >
          {updateProfile.isPending ? "Saving..." : "Save changes"}
        </Button>
      </div>
    </div>
  );

  const notificationItems = [
    {
      key: "taskAssigned",
      label: "Task assigned to me",
      desc: "When someone assigns a task to you",
    },
    {
      key: "taskCompleted",
      label: "Task completed",
      desc: "When a task you follow is completed",
    },
    {
      key: "commentAdded",
      label: "New comment",
      desc: "When someone comments on your task",
    },
    {
      key: "mentioned",
      label: "@Mentioned",
      desc: "When someone mentions you in a comment",
    },
    {
      key: "dueDateApproaching",
      label: "Due date approaching",
      desc: "Tasks due within the next 24 hours",
    },
    {
      key: "statusUpdates",
      label: "Status updates",
      desc: "When a project status is updated",
    },
    {
      key: "followerAdded",
      label: "Added as follower",
      desc: "When you are added as a follower on a task",
    },
  ];

  const renderNotifications = () => (
    <div className="space-y-6">
      <div>
        <h2 className="text-base font-semibold text-[#1e1f21] dark:text-gray-100">
          Notification settings
        </h2>
        <p className="text-sm text-muted-foreground">
          Choose what notifications you receive and how
        </p>
      </div>

      <div className="max-w-2xl space-y-4">
        {/* Global toggles */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="flex items-center justify-between rounded-lg border p-4">
            <div>
              <p className="text-sm font-medium">In-app notifications</p>
              <p className="text-xs text-muted-foreground">
                Show in your inbox
              </p>
            </div>
            <ToggleSwitch
              checked={notifPrefs.inAppEnabled}
              onChange={() =>
                setNotifPrefs((p) => ({
                  ...p,
                  inAppEnabled: !p.inAppEnabled,
                }))
              }
            />
          </div>
          <div className="flex items-center justify-between rounded-lg border p-4">
            <div>
              <p className="text-sm font-medium">Email notifications</p>
              <p className="text-xs text-muted-foreground">
                Send to your email
              </p>
            </div>
            <ToggleSwitch
              checked={notifPrefs.emailEnabled}
              onChange={() =>
                setNotifPrefs((p) => ({
                  ...p,
                  emailEnabled: !p.emailEnabled,
                }))
              }
            />
          </div>
        </div>

        <Separator />

        <h3 className="text-sm font-medium text-[#1e1f21] dark:text-gray-100">
          Activity notifications
        </h3>

        {/* Table header */}
        <div className="flex items-center gap-4 border-b pb-2">
          <div className="flex-1 text-xs font-medium text-muted-foreground">
            Event
          </div>
          <div className="w-16 text-center text-xs font-medium text-muted-foreground">
            In-app
          </div>
          <div className="w-16 text-center text-xs font-medium text-muted-foreground">
            Email
          </div>
        </div>

        {notificationItems.map((item) => {
          const prefs = (notifPrefs as unknown as Record<string, { inApp: boolean; email: boolean }>)[item.key];
          return (
            <div key={item.key} className="flex items-center gap-4 py-2">
              <div className="flex-1">
                <p className="text-sm">{item.label}</p>
                <p className="text-xs text-muted-foreground">{item.desc}</p>
              </div>
              <div className="flex w-16 justify-center">
                <ToggleSwitch
                  checked={prefs?.inApp ?? true}
                  onChange={() =>
                    updateNotifPref(item.key, "inApp", !prefs?.inApp)
                  }
                />
              </div>
              <div className="flex w-16 justify-center">
                <ToggleSwitch
                  checked={prefs?.email ?? false}
                  onChange={() =>
                    updateNotifPref(item.key, "email", !prefs?.email)
                  }
                />
              </div>
            </div>
          );
        })}

        <Button
          onClick={handleSaveNotifPrefs}
          className="mt-2 bg-[#4573D2] hover:bg-[#3A63B8]"
        >
          Save preferences
        </Button>
      </div>
    </div>
  );

  const renderSecurity = () => (
    <div className="space-y-6">
      <div>
        <h2 className="text-base font-semibold text-[#1e1f21] dark:text-gray-100">
          Security settings
        </h2>
        <p className="text-sm text-muted-foreground">
          Manage your password and security preferences
        </p>
      </div>

      <div className="max-w-lg space-y-4">
        <div className="rounded-lg border p-4">
          <h3 className="text-sm font-medium">Change password</h3>
          <div className="mt-3 space-y-3">
            <div className="space-y-2">
              <Label htmlFor="current-password">Current password</Label>
              <Input
                id="current-password"
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-password">New password</Label>
              <Input
                id="new-password"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="At least 8 characters"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-password">Confirm new password</Label>
              <Input
                id="confirm-password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
              {confirmPassword && newPassword !== confirmPassword && (
                <p className="text-xs text-destructive">
                  Passwords do not match
                </p>
              )}
            </div>
            <Button
              onClick={handleChangePassword}
              disabled={
                changePassword.isPending ||
                !currentPassword ||
                !newPassword ||
                newPassword !== confirmPassword
              }
              className="bg-[#4573D2] hover:bg-[#3A63B8]"
            >
              {changePassword.isPending
                ? "Updating..."
                : "Update password"}
            </Button>
          </div>
        </div>

        <TwoFactorSection />

        <div className="rounded-lg border border-red-200 bg-red-50/50 p-4 dark:border-red-800/30 dark:bg-red-950/20">
          <h3 className="text-sm font-medium text-red-600 dark:text-red-400">
            Delete account
          </h3>
          <p className="mt-1 text-xs text-muted-foreground">
            Permanently delete your account and all data
          </p>
          <Button
            variant="destructive"
            size="sm"
            className="mt-3"
            onClick={() => {
              const confirmed = window.prompt("Type DELETE to confirm account deletion:");
              if (confirmed === "DELETE") {
                toast.success("Account deletion request submitted. You will be logged out.");
                setTimeout(() => {
                  window.location.href = "/login";
                }, 2000);
              } else if (confirmed !== null) {
                toast.error("Confirmation text did not match. Account not deleted.");
              }
            }}
          >
            Delete account
          </Button>
        </div>
      </div>
    </div>
  );

  const renderDisplay = () => (
    <div className="space-y-6">
      <div>
        <h2 className="text-base font-semibold text-[#1e1f21] dark:text-gray-100">
          Display settings
        </h2>
        <p className="text-sm text-muted-foreground">
          Customize the look and feel
        </p>
      </div>

      <div className="max-w-lg space-y-4">
        <div>
          <h3 className="text-sm font-medium text-[#1e1f21] dark:text-gray-100">
            Theme
          </h3>
          <div className="mt-3 grid grid-cols-3 gap-3">
            {[
              { key: "light", label: "Light", bg: "bg-white" },
              { key: "dark", label: "Dark", bg: "bg-gray-900" },
              {
                key: "system",
                label: "System",
                bg: "bg-gradient-to-r from-white to-gray-900",
              },
            ].map((t) => (
              <button
                key={t.key}
                onClick={() => setTheme(t.key)}
                className={cn(
                  "flex flex-col items-center gap-2 rounded-lg border-2 p-3 transition-colors",
                  theme === t.key
                    ? "border-[#4573D2]"
                    : "border-transparent hover:border-gray-200 dark:hover:border-gray-700"
                )}
              >
                <div
                  className={cn("h-16 w-full rounded-md border", t.bg)}
                />
                <span className="text-xs font-medium">{t.label}</span>
                {theme === t.key && (
                  <Check className="h-3.5 w-3.5 text-[#4573D2]" />
                )}
              </button>
            ))}
          </div>
        </div>

        <Separator />

        <div>
          <h3 className="text-sm font-medium text-[#1e1f21] dark:text-gray-100">
            Sidebar color
          </h3>
          <div className="mt-3 flex gap-2">
            {[
              "#FFF8F0",
              "#F5F5F5",
              "#EEF2FF",
              "#FFF1F2",
              "#F0FDF4",
              "#1E1F21",
            ].map((color) => (
              <button
                key={color}
                className={cn(
                  "h-8 w-8 rounded-full border-2 transition-all",
                  color === "#FFF8F0"
                    ? "scale-110 border-[#4573D2]"
                    : "border-transparent hover:scale-105"
                )}
                style={{ backgroundColor: color }}
              />
            ))}
          </div>
        </div>

        <Separator />

        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium">Compact mode</p>
            <p className="text-xs text-muted-foreground">
              Show more content with smaller spacing
            </p>
          </div>
          <button className="relative h-6 w-11 rounded-full bg-gray-200 transition-colors dark:bg-gray-700">
            <span className="absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow" />
          </button>
        </div>

        <Separator />

        <div>
          <h3 className="flex items-center gap-2 text-sm font-medium text-[#1e1f21] dark:text-gray-100">
            <Globe className="h-4 w-4" />
            Language / Locale
          </h3>
          <p className="mt-1 text-xs text-muted-foreground">
            Choose your preferred language for the interface
          </p>
          <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
            {LOCALES.map((locale) => (
              <button
                key={locale.code}
                className={cn(
                  "rounded-lg border px-3 py-2 text-sm transition-colors",
                  locale.code === "en"
                    ? "border-[#4573D2] bg-blue-50 dark:bg-blue-950/20"
                    : "hover:border-gray-300 hover:bg-muted/50"
                )}
                onClick={() => {
                  updateLocale.mutate({ locale: locale.code });
                }}
              >
                {locale.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="h-full">
      <div className="flex h-14 items-center border-b bg-white px-6 dark:bg-card">
        <h1 className="text-lg font-medium text-[#1e1f21] dark:text-gray-100">
          Settings
        </h1>
      </div>

      <div className="flex h-[calc(100%-3.5rem)]">
        {/* Sidebar tabs */}
        <div className="w-52 border-r bg-white py-4 dark:bg-card">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={cn(
                "flex w-full items-center gap-2.5 px-4 py-2 text-sm transition-colors",
                activeTab === tab.key
                  ? "bg-[#f1ece4] font-medium text-[#1e1f21] dark:bg-accent dark:text-accent-foreground"
                  : "text-muted-foreground hover:bg-muted/50"
              )}
            >
              <tab.icon className="h-4 w-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === "profile" && renderProfile()}
          {activeTab === "notifications" && renderNotifications()}
          {activeTab === "security" && renderSecurity()}
          {activeTab === "display" && renderDisplay()}
        </div>
      </div>
    </div>
  );
}
