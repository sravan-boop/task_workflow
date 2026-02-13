"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  CheckCircle2,
  ArrowRight,
  Sparkles,
  Users,
  FolderKanban,
  Zap,
} from "lucide-react";

const steps = [
  {
    id: "welcome",
    title: "Welcome to TaskFlow AI",
    description: "Let's set up your workspace in a few quick steps.",
    icon: Sparkles,
  },
  {
    id: "workspace",
    title: "Name your workspace",
    description: "This is where your team will collaborate.",
    icon: Users,
  },
  {
    id: "project",
    title: "Create your first project",
    description: "Start organizing your work right away.",
    icon: FolderKanban,
  },
  {
    id: "ready",
    title: "You're all set!",
    description: "Your workspace is ready. Start managing your tasks with AI-powered features.",
    icon: Zap,
  },
];

interface OnboardingWizardProps {
  onComplete: () => void;
}

export function OnboardingWizard({ onComplete }: OnboardingWizardProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [workspaceName, setWorkspaceName] = useState("");
  const [projectName, setProjectName] = useState("");
  const [createdProjectId, setCreatedProjectId] = useState<string | null>(null);
  const router = useRouter();

  const { data: workspaces } = trpc.workspaces.list.useQuery();
  const workspaceId = workspaces?.[0]?.id;

  const updateWorkspace = trpc.workspaces.update.useMutation();

  const createProject = trpc.projects.create.useMutation({
    onSuccess: (project) => {
      setCreatedProjectId(project.id);
      setCurrentStep(currentStep + 1);
    },
  });

  const handleNext = () => {
    if (currentStep === 1 && workspaceName.trim() && workspaceId) {
      // Update workspace name
      updateWorkspace.mutate(
        { id: workspaceId, name: workspaceName.trim() },
        { onSuccess: () => setCurrentStep(currentStep + 1) }
      );
      return;
    }

    if (currentStep === 2) {
      // Create project
      if (projectName.trim() && workspaceId) {
        createProject.mutate({
          name: projectName.trim(),
          workspaceId,
        });
      } else {
        setCurrentStep(currentStep + 1);
      }
      return;
    }

    if (currentStep === steps.length - 1) {
      // Final step - navigate
      onComplete();
      if (createdProjectId) {
        router.push(`/projects/${createdProjectId}`);
      } else {
        router.push("/home");
      }
      return;
    }

    setCurrentStep(currentStep + 1);
  };

  const handleSkip = () => {
    onComplete();
    router.push("/home");
  };

  const isPending =
    updateWorkspace.isPending || createProject.isPending;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-xl bg-white p-8 shadow-2xl dark:bg-gray-950">
        {/* Progress */}
        <div className="mb-8 flex gap-2">
          {steps.map((_, i) => (
            <div
              key={i}
              className={cn(
                "h-1 flex-1 rounded-full transition-colors",
                i <= currentStep ? "bg-[#4573D2]" : "bg-gray-200 dark:bg-gray-700"
              )}
            />
          ))}
        </div>

        {/* Step Content */}
        <div className="text-center">
          <div className="mx-auto mb-4 inline-flex rounded-full bg-[#4573D2]/10 p-3">
            {(() => {
              const Icon = steps[currentStep].icon;
              return <Icon className="h-6 w-6 text-[#4573D2]" />;
            })()}
          </div>
          <h2 className="text-xl font-semibold text-[#1e1f21] dark:text-gray-100">
            {steps[currentStep].title}
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            {steps[currentStep].description}
          </p>
        </div>

        {/* Step Fields */}
        <div className="mt-8">
          {currentStep === 0 && (
            <div className="space-y-3">
              <div className="rounded-lg border bg-muted/30 p-4">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                  <span className="text-sm">Account created successfully</span>
                </div>
              </div>
              <div className="rounded-lg border bg-muted/30 p-4">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                  <span className="text-sm">Default workspace ready</span>
                </div>
              </div>
              <div className="rounded-lg border bg-muted/30 p-4">
                <div className="flex items-center gap-3">
                  <Sparkles className="h-5 w-5 text-[#4573D2]" />
                  <span className="text-sm">AI features enabled</span>
                </div>
              </div>
            </div>
          )}

          {currentStep === 1 && (
            <div className="space-y-2">
              <Input
                value={workspaceName}
                onChange={(e) => setWorkspaceName(e.target.value)}
                placeholder="e.g., Acme Corp"
                className="text-center"
                autoFocus
              />
              <p className="text-center text-xs text-muted-foreground">
                You can change this later in Settings
              </p>
            </div>
          )}

          {currentStep === 2 && (
            <div className="space-y-2">
              <Input
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                placeholder="e.g., Website Redesign"
                className="text-center"
                autoFocus
              />
              <p className="text-center text-xs text-muted-foreground">
                We&apos;ll create default sections: To do, In progress, Done
              </p>
            </div>
          )}

          {currentStep === 3 && (
            <div className="space-y-3">
              <div className="rounded-lg border bg-green-50/50 p-4 dark:bg-green-950/20">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                  <span className="text-sm">
                    Workspace{" "}
                    <span className="font-medium">
                      {workspaceName || "created"}
                    </span>
                  </span>
                </div>
              </div>
              {createdProjectId && (
                <div className="rounded-lg border bg-green-50/50 p-4 dark:bg-green-950/20">
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                    <span className="text-sm">
                      Project{" "}
                      <span className="font-medium">{projectName}</span> created
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="mt-8 flex items-center justify-between">
          <Button variant="ghost" onClick={handleSkip} className="text-sm">
            {currentStep === steps.length - 1 ? "" : "Skip for now"}
          </Button>
          <Button
            onClick={handleNext}
            disabled={isPending}
            className="gap-1.5 bg-[#4573D2] hover:bg-[#3A63B8]"
          >
            {isPending
              ? "Setting up..."
              : currentStep === steps.length - 1
                ? "Go to dashboard"
                : "Continue"}
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
