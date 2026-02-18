"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Globe, Lock, List, LayoutGrid, GanttChart, Calendar, Briefcase, Users, Plus } from "lucide-react";

const VIEW_OPTIONS = [
  { value: "LIST", label: "List", icon: List },
  { value: "BOARD", label: "Board", icon: LayoutGrid },
  { value: "TIMELINE", label: "Timeline", icon: GanttChart },
  { value: "CALENDAR", label: "Calendar", icon: Calendar },
] as const;

interface CreatePortfolioDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workspaceId?: string;
}

export function CreatePortfolioDialog({
  open,
  onOpenChange,
  workspaceId,
}: CreatePortfolioDialogProps) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [privacy, setPrivacy] = useState<"PUBLIC" | "PRIVATE">("PUBLIC");
  const [defaultView, setDefaultView] = useState<"LIST" | "BOARD" | "TIMELINE" | "CALENDAR">("LIST");

  // Onboarding state
  const [onboardingOpen, setOnboardingOpen] = useState(false);
  const [newPortfolioId, setNewPortfolioId] = useState<string | null>(null);

  const utils = trpc.useUtils();

  const createPortfolio = trpc.portfolios.create.useMutation({
    onSuccess: (data) => {
      utils.portfolios.list.invalidate();
      onOpenChange(false);
      setName("");
      setPrivacy("PUBLIC");
      setDefaultView("LIST");
      // Show onboarding dialog
      setNewPortfolioId(data.id);
      setOnboardingOpen(true);
    },
  });

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !workspaceId) return;
    createPortfolio.mutate({
      name: name.trim(),
      workspaceId,
      privacy,
      defaultView,
    });
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[460px]">
          <DialogHeader>
            <DialogTitle>New portfolio</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-5">
            {/* Portfolio Name */}
            <div className="space-y-2">
              <Label htmlFor="portfolio-name">Portfolio name</Label>
              <Input
                id="portfolio-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter portfolio name"
                autoFocus
              />
            </div>

            {/* Privacy */}
            <div className="space-y-2">
              <Label>Privacy</Label>
              <Select
                value={privacy}
                onValueChange={(val) => setPrivacy(val as "PUBLIC" | "PRIVATE")}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PUBLIC">
                    <div className="flex items-center gap-2">
                      <Globe className="h-3.5 w-3.5 text-muted-foreground" />
                      <div>
                        <span className="font-medium">Public to workspace</span>
                        <p className="text-[11px] text-muted-foreground">Anyone in the workspace can find and access</p>
                      </div>
                    </div>
                  </SelectItem>
                  <SelectItem value="PRIVATE">
                    <div className="flex items-center gap-2">
                      <Lock className="h-3.5 w-3.5 text-muted-foreground" />
                      <div>
                        <span className="font-medium">Private</span>
                        <p className="text-[11px] text-muted-foreground">Only invited members can access</p>
                      </div>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Default View */}
            <div className="space-y-2">
              <Label>Default view</Label>
              <div className="grid grid-cols-4 gap-2">
                {VIEW_OPTIONS.map((opt) => {
                  const Icon = opt.icon;
                  const isSelected = defaultView === opt.value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setDefaultView(opt.value)}
                      className={`flex flex-col items-center gap-1.5 rounded-lg border-2 px-3 py-3 text-xs font-medium transition-colors ${
                        isSelected
                          ? "border-[#4573D2] bg-[#4573D2]/5 text-[#4573D2]"
                          : "border-gray-200 text-muted-foreground hover:border-gray-300 hover:bg-muted/30"
                      }`}
                    >
                      <Icon className="h-5 w-5" />
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={!name.trim() || createPortfolio.isPending}
                className="bg-[#4573D2] hover:bg-[#3A63B8]"
              >
                {createPortfolio.isPending ? "Creating..." : "Create portfolio"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Post-creation onboarding dialog */}
      <Dialog open={onboardingOpen} onOpenChange={setOnboardingOpen}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle>What do you want to do first?</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <button
              className="flex w-full items-center gap-4 rounded-lg border p-4 text-left transition-colors hover:border-[#4573D2] hover:bg-muted/30"
              onClick={() => {
                setOnboardingOpen(false);
                if (newPortfolioId) {
                  router.push(`/portfolios/${newPortfolioId}`);
                }
              }}
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-50">
                <Plus className="h-5 w-5 text-[#4573D2]" />
              </div>
              <div>
                <p className="text-sm font-medium text-[#1e1f21]">Start adding projects</p>
                <p className="text-xs text-muted-foreground">Add existing projects to your portfolio</p>
              </div>
            </button>
            <button
              className="flex w-full items-center gap-4 rounded-lg border p-4 text-left transition-colors hover:border-[#4573D2] hover:bg-muted/30"
              onClick={() => {
                setOnboardingOpen(false);
                if (newPortfolioId) {
                  router.push(`/portfolios/${newPortfolioId}`);
                }
              }}
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-50">
                <Users className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-[#1e1f21]">Share with teammates</p>
                <p className="text-xs text-muted-foreground">Invite team members to collaborate</p>
              </div>
            </button>
          </div>
          <div className="flex justify-end pt-2">
            <Button
              className="bg-[#4573D2] hover:bg-[#3A63B8]"
              onClick={() => {
                setOnboardingOpen(false);
                if (newPortfolioId) {
                  router.push(`/portfolios/${newPortfolioId}`);
                }
              }}
            >
              Go to portfolio
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
