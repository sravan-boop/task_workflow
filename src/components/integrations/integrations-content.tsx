"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  Plug,
  MessageSquare,
  Video,
  FolderOpen,
  GitBranch,
  Zap,
  Mail,
  CalendarDays,
  Shield,
  ExternalLink,
  Copy,
  Check,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const INTEGRATIONS = [
  {
    type: "SLACK" as const,
    name: "Slack",
    description: "Get task notifications and create tasks from Slack messages.",
    icon: MessageSquare,
    color: "#4A154B",
    configFields: ["webhookUrl"],
  },
  {
    type: "TEAMS" as const,
    name: "Microsoft Teams",
    description: "Receive task updates and collaborate within Teams channels.",
    icon: Video,
    color: "#6264A7",
    configFields: ["webhookUrl"],
  },
  {
    type: "GOOGLE_DRIVE" as const,
    name: "Google Drive",
    description: "Attach Drive files to tasks and auto-sync documents.",
    icon: FolderOpen,
    color: "#4285F4",
    configFields: ["apiKey"],
  },
  {
    type: "GITHUB" as const,
    name: "GitHub",
    description: "Link commits, PRs, and issues to tasks automatically.",
    icon: GitBranch,
    color: "#24292F",
    configFields: ["webhookUrl", "apiKey"],
  },
  {
    type: "GITLAB" as const,
    name: "GitLab",
    description: "Connect merge requests and pipelines to your tasks.",
    icon: GitBranch,
    color: "#FC6D26",
    configFields: ["webhookUrl", "apiKey"],
  },
  {
    type: "ZAPIER" as const,
    name: "Zapier",
    description: "Connect to 5,000+ apps with automated workflows.",
    icon: Zap,
    color: "#FF4A00",
    configFields: ["apiKey"],
  },
  {
    type: "EMAIL" as const,
    name: "Email to Task",
    description: "Forward emails to create tasks automatically.",
    icon: Mail,
    color: "#4573D2",
    configFields: [] as string[],
  },
  {
    type: "CALENDAR" as const,
    name: "Calendar Sync",
    description: "Sync task due dates with Google Calendar or Outlook.",
    icon: CalendarDays,
    color: "#16a34a",
    configFields: [] as string[],
  },
];

export function IntegrationsContent() {
  const { data: workspaces } = trpc.workspaces.list.useQuery();
  const workspaceId = workspaces?.[0]?.id;

  const { data: integrations } = trpc.integrations.list.useQuery(
    { workspaceId: workspaceId! },
    { enabled: !!workspaceId }
  );

  const utils = trpc.useUtils();

  const upsertIntegration = trpc.integrations.upsert.useMutation({
    onSuccess: () => {
      utils.integrations.list.invalidate();
      toast.success("Integration connected");
      setConfigDialog(null);
    },
  });

  const deleteIntegration = trpc.integrations.delete.useMutation({
    onSuccess: () => {
      utils.integrations.list.invalidate();
      toast.success("Integration disconnected");
    },
  });

  const generateApiKey = trpc.integrations.generateApiKey.useMutation({
    onSuccess: (data) => {
      setGeneratedApiKey(data.apiKey);
      toast.success("API key generated");
    },
  });

  const generateCalendarToken = trpc.integrations.generateCalendarToken.useMutation({
    onSuccess: (data) => {
      setCalendarFeedUrl(data.feedUrl);
      toast.success("Calendar feed URL generated");
    },
  });

  const [configDialog, setConfigDialog] = useState<string | null>(null);
  const [webhookUrl, setWebhookUrl] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [generatedApiKey, setGeneratedApiKey] = useState("");
  const [calendarFeedUrl, setCalendarFeedUrl] = useState("");
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const getIntegration = (type: string) =>
    integrations?.find((i) => i.type === type);

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleConnect = (type: string) => {
    const def = INTEGRATIONS.find((i) => i.type === type);
    if (!def || !workspaceId) return;

    if (type === "CALENDAR") {
      generateCalendarToken.mutate({ workspaceId });
      setConfigDialog(type);
      return;
    }

    if (type === "EMAIL") {
      upsertIntegration.mutate({
        workspaceId,
        type,
        name: def.name,
        config: {},
      });
      return;
    }

    if (def.configFields.length === 0) {
      upsertIntegration.mutate({ workspaceId, type, name: def.name, config: {} });
    } else {
      setConfigDialog(type);
      setWebhookUrl("");
      setApiKey("");
    }
  };

  const handleSaveConfig = () => {
    if (!configDialog || !workspaceId) return;

    const config: Record<string, string> = {};
    if (webhookUrl) config.webhookUrl = webhookUrl;
    if (apiKey) config.apiKey = apiKey;

    const name = currentConfig?.name ?? configDialog;
    upsertIntegration.mutate({
      workspaceId,
      type: configDialog,
      name,
      config,
    });
  };

  const currentConfig = configDialog
    ? INTEGRATIONS.find((i) => i.type === configDialog)
    : null;

  return (
    <div className="h-full">
      <div className="flex h-14 items-center justify-between border-b bg-white px-6 dark:bg-card">
        <div className="flex items-center gap-2">
          <Plug className="h-5 w-5 text-[#4573D2]" />
          <h1 className="text-lg font-medium text-[#1e1f21] dark:text-foreground">
            Integrations
          </h1>
        </div>
      </div>

      <div className="p-6">
        <p className="mb-6 text-sm text-muted-foreground">
          Connect your favorite tools to streamline your workflow.
        </p>

        {/* SSO/SAML Banner */}
        <div className="mb-6 rounded-lg border border-blue-200 bg-blue-50/50 p-4 dark:border-blue-800/30 dark:bg-blue-950/20">
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-blue-600" />
            <span className="text-sm font-medium text-blue-700 dark:text-blue-400">
              SSO / SAML
            </span>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Enterprise single sign-on with SAML 2.0 is available on the
            Enterprise plan. Contact sales for setup.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {INTEGRATIONS.map((integration) => {
            const existing = getIntegration(integration.type);
            const isConnected = !!existing;

            return (
              <div
                key={integration.type}
                className="rounded-lg border bg-white p-4 dark:bg-card"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className="flex h-10 w-10 items-center justify-center rounded-lg"
                      style={{ backgroundColor: integration.color + "15" }}
                    >
                      <integration.icon
                        className="h-5 w-5"
                        style={{ color: integration.color }}
                      />
                    </div>
                    <div>
                      <h3 className="text-sm font-medium">
                        {integration.name}
                      </h3>
                      {isConnected && (
                        <span className="text-xs text-green-600">
                          Connected
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  {integration.description}
                </p>
                <div className="mt-3">
                  {isConnected ? (
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full text-xs text-destructive hover:text-destructive"
                      onClick={() =>
                        deleteIntegration.mutate({ id: existing.id })
                      }
                    >
                      Disconnect
                    </Button>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full text-xs"
                      onClick={() => handleConnect(integration.type)}
                    >
                      <ExternalLink className="mr-1.5 h-3 w-3" />
                      Connect
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* API Key section */}
        <div className="mt-8">
          <h2 className="mb-3 text-sm font-medium">API Access</h2>
          <div className="rounded-lg border bg-white p-4 dark:bg-card">
            <p className="text-xs text-muted-foreground">
              Generate an API key for programmatic access to your workspace data.
            </p>
            {generatedApiKey ? (
              <div className="mt-3 flex items-center gap-2">
                <code className="flex-1 rounded bg-muted px-3 py-2 text-xs">
                  {generatedApiKey}
                </code>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() =>
                    copyToClipboard(generatedApiKey, "apiKey")
                  }
                >
                  {copiedField === "apiKey" ? (
                    <Check className="h-3.5 w-3.5 text-green-600" />
                  ) : (
                    <Copy className="h-3.5 w-3.5" />
                  )}
                </Button>
              </div>
            ) : (
              <Button
                variant="outline"
                size="sm"
                className="mt-3"
                onClick={() => {
                  if (workspaceId)
                    generateApiKey.mutate({ workspaceId });
                }}
              >
                Generate API Key
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Config Dialog */}
      <Dialog
        open={!!configDialog}
        onOpenChange={(open) => !open && setConfigDialog(null)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {currentConfig && (
                <>
                  <currentConfig.icon
                    className="h-5 w-5"
                    style={{ color: currentConfig.color }}
                  />
                  Connect {currentConfig.name}
                </>
              )}
            </DialogTitle>
          </DialogHeader>

          {configDialog === "CALENDAR" && calendarFeedUrl ? (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Add this iCal feed URL to your calendar app:
              </p>
              <div className="flex items-center gap-2">
                <code className="flex-1 rounded bg-muted px-3 py-2 text-xs break-all">
                  {calendarFeedUrl}
                </code>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 shrink-0"
                  onClick={() =>
                    copyToClipboard(calendarFeedUrl, "calendar")
                  }
                >
                  {copiedField === "calendar" ? (
                    <Check className="h-3.5 w-3.5 text-green-600" />
                  ) : (
                    <Copy className="h-3.5 w-3.5" />
                  )}
                </Button>
              </div>
              <Button
                className="w-full"
                onClick={() => setConfigDialog(null)}
              >
                Done
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {currentConfig?.configFields.includes("webhookUrl") && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">Webhook URL</label>
                  <Input
                    value={webhookUrl}
                    onChange={(e) => setWebhookUrl(e.target.value)}
                    placeholder="https://hooks.example.com/..."
                    className="text-sm"
                  />
                </div>
              )}
              {currentConfig?.configFields.includes("apiKey") && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">API Key / Token</label>
                  <Input
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder="Enter API key or token"
                    className="text-sm"
                    type="password"
                  />
                </div>
              )}
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => setConfigDialog(null)}
                >
                  Cancel
                </Button>
                <Button onClick={handleSaveConfig}>Connect</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
