"use client";

import { useState, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import {
  GitBranch,
  Plus,
  Zap,
  CheckCircle2,
  ArrowRight,
  Users,
  Clock,
  AlertTriangle,
  FileText,
  Repeat,
  Sparkles,
  Search,
  ChevronDown,
  Share2,
  Settings2,
  Upload,
  LayoutGrid,
  List,
  Filter,
  Globe,
  Lock,
  Megaphone,
  Briefcase,
  Target,
  Mail,
  Eye,
  Layers,
  Palette,
  Cpu,
  HeartHandshake,
  TrendingUp,
  ClipboardList,
  CalendarCheck,
  BarChart3,
  FolderPlus,
  FileUp,
} from "lucide-react";

// ── Gallery Tabs ──────────────────────────────────────────────────────
const GALLERY_TABS = [
  "For You",
  "My Organization",
  "Marketing",
  "Operations & PMO",
  "Productivity",
] as const;

const MORE_TABS = [
  { label: "IT", icon: Cpu },
  { label: "Design", icon: Palette },
  { label: "Product & Engineering", icon: Layers },
  { label: "HR", icon: HeartHandshake },
  { label: "Sales & CX", icon: TrendingUp },
] as const;

type GalleryTab = (typeof GALLERY_TABS)[number] | string;

// ── Workflow Templates (existing) ─────────────────────────────────────
const WORKFLOW_TEMPLATES = [
  {
    id: "bug-tracking",
    name: "Bug Tracking",
    description: "Track and resolve bugs with a structured workflow",
    icon: AlertTriangle,
    color: "#E8384F",
    category: "Product & Engineering",
    steps: ["Reported", "Triaged", "In Progress", "In Review", "Resolved"],
  },
  {
    id: "content-creation",
    name: "Content Creation",
    description: "Manage content from ideation to publication",
    icon: FileText,
    color: "#4573D2",
    category: "Marketing",
    steps: ["Ideation", "Drafting", "Review", "Editing", "Published"],
  },
  {
    id: "onboarding",
    name: "Employee Onboarding",
    description: "Streamline new employee onboarding process",
    icon: Users,
    color: "#7BC86C",
    category: "HR",
    steps: ["Pre-boarding", "Day 1", "Week 1", "Month 1", "Complete"],
  },
  {
    id: "sprint",
    name: "Sprint Planning",
    description: "Agile sprint workflow with planning and retrospective",
    icon: Repeat,
    color: "#FD9A00",
    category: "Product & Engineering",
    steps: ["Backlog", "Sprint Planning", "In Progress", "Review", "Done"],
  },
  {
    id: "approvals",
    name: "Approval Workflow",
    description: "Route tasks through approval chains",
    icon: CheckCircle2,
    color: "#4573D2",
    category: "Operations & PMO",
    steps: ["Draft", "Submitted", "Under Review", "Approved", "Implemented"],
  },
  {
    id: "event-planning",
    name: "Event Planning",
    description: "Plan and execute events from start to finish",
    icon: Clock,
    color: "#9B59B6",
    category: "Marketing",
    steps: ["Planning", "Logistics", "Promotion", "Execution", "Post-event"],
  },
  // ── Additional Templates ───────────────────────────────────────────
  {
    id: "work-intake",
    name: "Work Intake",
    description: "Centralize and manage incoming work requests",
    icon: ClipboardList,
    color: "#00BCD4",
    category: "Operations & PMO",
    steps: ["Submitted", "Screening", "Prioritized", "Assigned", "In Progress"],
  },
  {
    id: "org-planning",
    name: "Organizational Planning",
    description: "Align teams and resources around strategic objectives",
    icon: Users,
    color: "#3F51B5",
    category: "Operations & PMO",
    steps: ["Assessment", "Goal Setting", "Resource Plan", "Execution", "Review"],
  },
  {
    id: "strategic-planning",
    name: "Strategic Planning",
    description: "Define long-term goals and track strategic initiatives",
    icon: Target,
    color: "#E91E63",
    category: "Productivity",
    steps: ["Vision", "Analysis", "Strategy", "Roadmap", "Monitor"],
  },
  {
    id: "campaign-management",
    name: "Campaign Management",
    description: "Plan, execute, and measure marketing campaigns",
    icon: Megaphone,
    color: "#FF5722",
    category: "Marketing",
    steps: ["Brief", "Creative", "Review", "Launch", "Measure"],
  },
  {
    id: "project-tracking",
    name: "Project Tracking",
    description: "Track project milestones, tasks, and deliverables",
    icon: BarChart3,
    color: "#795548",
    category: "Productivity",
    steps: ["Initiation", "Planning", "Execution", "Monitoring", "Closure"],
  },
  {
    id: "daily-standup",
    name: "Daily Standup",
    description: "Facilitate daily team check-ins and blockers",
    icon: CalendarCheck,
    color: "#009688",
    category: "Productivity",
    steps: ["Yesterday", "Today", "Blockers", "Action Items", "Wrap-up"],
  },
];

// ── Component ─────────────────────────────────────────────────────────
export default function WorkflowsPage() {
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<GalleryTab>("For You");
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [projectName, setProjectName] = useState("");
  const [projectPrivacy, setProjectPrivacy] = useState<"workspace" | "private">("workspace");
  const [dragActive, setDragActive] = useState(false);
  const [importedFile, setImportedFile] = useState<File | null>(null);
  const [shareEmail, setShareEmail] = useState("");
  const [shareAccess, setShareAccess] = useState<"workspace" | "private">("workspace");
  const [notifyOnAdd, setNotifyOnAdd] = useState(true);
  const [notifyOnStatusChange, setNotifyOnStatusChange] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Filter templates based on search and active tab
  const filteredTemplates = WORKFLOW_TEMPLATES.filter((t) => {
    const matchesSearch =
      searchQuery === "" ||
      t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.description.toLowerCase().includes(searchQuery.toLowerCase());

    if (activeTab === "For You" || activeTab === "My Organization") return matchesSearch;
    return matchesSearch && t.category === activeTab;
  });

  // Drag handlers for import dropzone
  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setImportedFile(e.dataTransfer.files[0]);
      toast.success(`File "${e.dataTransfer.files[0].name}" selected for import`);
    }
  }, []);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setImportedFile(e.target.files[0]);
      toast.success(`File "${e.target.files[0].name}" selected for import`);
    }
  }, []);

  const handleCreateProject = () => {
    if (!projectName.trim()) {
      toast.error("Please enter a project name");
      return;
    }
    toast.success(`Project "${projectName}" created as ${projectPrivacy}${importedFile ? ` (imported from ${importedFile.name})` : ""}`);
    setProjectName("");
    setProjectPrivacy("workspace");
    setImportedFile(null);
    setCreateDialogOpen(false);
  };

  const handleShareInvite = () => {
    if (!shareEmail.trim()) {
      toast.error("Please enter an email address");
      return;
    }
    toast.success(`Invitation sent to ${shareEmail}`);
    setShareEmail("");
  };

  return (
    <div className="h-full overflow-auto">
      {/* ── Header Bar ─────────────────────────────────────────────── */}
      <div className="flex h-14 items-center justify-between border-b bg-white px-6">
        <div className="flex items-center gap-2">
          <GitBranch className="h-5 w-5 text-[#4573D2]" />
          <h1 className="text-lg font-medium text-[#1e1f21]">Workflows</h1>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={() => toast.info("Customize workflows layout")}
          >
            <Settings2 className="h-3.5 w-3.5" />
            Customize
          </Button>

          {/* Share Dialog */}
          <Dialog open={shareDialogOpen} onOpenChange={setShareDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" className="gap-1.5">
                <Share2 className="h-3.5 w-3.5" />
                Share
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-lg">
              <DialogHeader>
                <DialogTitle>Share Workflows</DialogTitle>
                <DialogDescription>
                  Invite teammates and manage access to this workspace.
                </DialogDescription>
              </DialogHeader>

              {/* Invite by email */}
              <div className="space-y-3">
                <Label>Invite people</Label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Mail className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      className="pl-9"
                      placeholder="Enter email address"
                      value={shareEmail}
                      onChange={(e) => setShareEmail(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleShareInvite()}
                    />
                  </div>
                  <Button size="sm" className="bg-[#4573D2] hover:bg-[#3A63B8]" onClick={handleShareInvite}>
                    Invite
                  </Button>
                </div>
              </div>

              {/* Access settings */}
              <div className="space-y-3 pt-2">
                <Label>Access settings</Label>
                <div className="space-y-2">
                  <label className="flex cursor-pointer items-center gap-3 rounded-md border p-3 hover:bg-muted/50">
                    <input
                      type="radio"
                      name="shareAccess"
                      checked={shareAccess === "workspace"}
                      onChange={() => setShareAccess("workspace")}
                      className="h-4 w-4 text-[#4573D2]"
                    />
                    <Globe className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">Workspace</p>
                      <p className="text-xs text-muted-foreground">Anyone in the workspace can access</p>
                    </div>
                  </label>
                  <label className="flex cursor-pointer items-center gap-3 rounded-md border p-3 hover:bg-muted/50">
                    <input
                      type="radio"
                      name="shareAccess"
                      checked={shareAccess === "private"}
                      onChange={() => setShareAccess("private")}
                      className="h-4 w-4 text-[#4573D2]"
                    />
                    <Lock className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">Private</p>
                      <p className="text-xs text-muted-foreground">Only invited members can access</p>
                    </div>
                  </label>
                </div>
              </div>

              {/* Who has access */}
              <div className="space-y-3 pt-2">
                <Label>Who has access</Label>
                <div className="space-y-2 rounded-md border p-3">
                  {[
                    { name: "Task Collaborators", email: "", role: "Commenter", isGroup: true },
                    { name: "My Workspace", email: "", role: "Editor", isGroup: true },
                    { name: "You", email: "you@company.com", role: "Admin", isGroup: false },
                  ].map((person) => (
                    <div key={person.name} className="flex items-center justify-between py-1.5">
                      <div className="flex items-center gap-2">
                        <div className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-medium ${
                          person.isGroup ? "bg-muted text-muted-foreground" : "bg-[#4573D2]/10 text-[#4573D2]"
                        }`}>
                          {person.isGroup ? <Users className="h-3.5 w-3.5" /> : person.name[0]}
                        </div>
                        <div>
                          <p className="text-sm font-medium">{person.name}</p>
                          {person.email && <p className="text-xs text-muted-foreground">{person.email}</p>}
                        </div>
                      </div>
                      <select
                        className="h-7 rounded-md border border-gray-200 bg-white px-2 text-xs outline-none focus:border-[#4573D2]"
                        defaultValue={person.role.toLowerCase()}
                      >
                        <option value="commenter">Commenter</option>
                        <option value="editor">Editor</option>
                        <option value="admin">Project Admin</option>
                        <option value="viewer">Viewer</option>
                      </select>
                    </div>
                  ))}
                </div>
              </div>

              {/* Manage Notifications */}
              <div className="space-y-3 pt-2">
                <Label>Manage notifications</Label>
                <div className="space-y-3 rounded-md border p-3">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-2">Your notifications</p>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Status updates</span>
                        <Switch checked={notifyOnStatusChange} onCheckedChange={setNotifyOnStatusChange} />
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Messages</span>
                        <Switch checked={notifyOnAdd} onCheckedChange={setNotifyOnAdd} />
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Tasks added</span>
                        <Switch defaultChecked />
                      </div>
                    </div>
                  </div>
                  <div className="border-t pt-3">
                    <p className="text-xs font-medium text-muted-foreground mb-2">Teams</p>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Status updates</span>
                        <Switch defaultChecked />
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Messages</span>
                        <Switch defaultChecked />
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Tasks added</span>
                        <Switch defaultChecked />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Copy project link */}
              <div className="pt-2">
                <Button
                  variant="outline"
                  className="w-full gap-2"
                  onClick={() => {
                    navigator.clipboard.writeText(window.location.href);
                    toast.success("Project link copied to clipboard");
                  }}
                >
                  <Share2 className="h-3.5 w-3.5" />
                  Copy project link
                </Button>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setShareDialogOpen(false)}>
                  Cancel
                </Button>
                <Button className="bg-[#4573D2] hover:bg-[#3A63B8]" onClick={() => { toast.success("Share settings saved"); setShareDialogOpen(false); }}>
                  Save changes
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Create Project Dialog */}
          <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-1.5 bg-[#4573D2] hover:bg-[#3A63B8]">
                <Plus className="h-3.5 w-3.5" />
                Create project
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Create project</DialogTitle>
                <DialogDescription>
                  Set up a new project with a name, privacy level, and optional file import.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                {/* Project name */}
                <div className="space-y-2">
                  <Label htmlFor="project-name">Project name</Label>
                  <Input
                    id="project-name"
                    placeholder="Enter project name"
                    value={projectName}
                    onChange={(e) => setProjectName(e.target.value)}
                  />
                </div>

                {/* Privacy */}
                <div className="space-y-2">
                  <Label>Privacy</Label>
                  <div className="space-y-2">
                    <label className="flex cursor-pointer items-center gap-3 rounded-md border p-3 hover:bg-muted/50">
                      <input
                        type="radio"
                        name="privacy"
                        checked={projectPrivacy === "workspace"}
                        onChange={() => setProjectPrivacy("workspace")}
                        className="h-4 w-4 text-[#4573D2]"
                      />
                      <Globe className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm font-medium">Workspace</p>
                        <p className="text-xs text-muted-foreground">All workspace members can find and access</p>
                      </div>
                    </label>
                    <label className="flex cursor-pointer items-center gap-3 rounded-md border p-3 hover:bg-muted/50">
                      <input
                        type="radio"
                        name="privacy"
                        checked={projectPrivacy === "private"}
                        onChange={() => setProjectPrivacy("private")}
                        className="h-4 w-4 text-[#4573D2]"
                      />
                      <Lock className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm font-medium">Private</p>
                        <p className="text-xs text-muted-foreground">Only invited members can access</p>
                      </div>
                    </label>
                  </div>
                </div>

                {/* File import dropzone */}
                <div className="space-y-2">
                  <Label>Import from file (optional)</Label>
                  <div
                    className={`flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-6 transition-colors ${
                      dragActive
                        ? "border-[#4573D2] bg-[#4573D2]/5"
                        : "border-muted-foreground/25 hover:border-muted-foreground/50"
                    }`}
                    onDragEnter={handleDrag}
                    onDragLeave={handleDrag}
                    onDragOver={handleDrag}
                    onDrop={handleDrop}
                  >
                    <Upload className="mb-2 h-8 w-8 text-muted-foreground/50" />
                    {importedFile ? (
                      <div className="text-center">
                        <p className="text-sm font-medium text-[#1e1f21]">{importedFile.name}</p>
                        <button
                          className="mt-1 text-xs text-[#4573D2] hover:underline"
                          onClick={() => setImportedFile(null)}
                        >
                          Remove
                        </button>
                      </div>
                    ) : (
                      <div className="text-center">
                        <p className="text-sm text-muted-foreground">
                          Drag and drop a file here, or{" "}
                          <button
                            className="text-[#4573D2] hover:underline"
                            onClick={() => fileInputRef.current?.click()}
                          >
                            browse
                          </button>
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground/70">
                          PDF, DOCX, PPTX, TXT, CSV, JPEG, PNG supported
                        </p>
                      </div>
                    )}
                    <input
                      ref={fileInputRef}
                      type="file"
                      className="hidden"
                      accept=".pdf,.docx,.pptx,.txt,.csv,.jpeg,.jpg,.png,.json,.xlsx,.xls"
                      onChange={handleFileChange}
                    />
                  </div>
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
                  Cancel
                </Button>
                <Button className="bg-[#4573D2] hover:bg-[#3A63B8]" onClick={handleCreateProject}>
                  Create project
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* ── Gallery Tab Navigation ─────────────────────────────────── */}
      <div className="border-b bg-white px-6">
        <div className="flex items-center gap-1 overflow-x-auto">
          {GALLERY_TABS.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`whitespace-nowrap border-b-2 px-3 py-2.5 text-sm font-medium transition-colors ${
                activeTab === tab
                  ? "border-[#4573D2] text-[#4573D2]"
                  : "border-transparent text-muted-foreground hover:border-muted-foreground/30 hover:text-[#1e1f21]"
              }`}
            >
              {tab}
            </button>
          ))}

          {/* More dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className={`flex items-center gap-1 whitespace-nowrap border-b-2 px-3 py-2.5 text-sm font-medium transition-colors ${
                  MORE_TABS.some((t) => t.label === activeTab)
                    ? "border-[#4573D2] text-[#4573D2]"
                    : "border-transparent text-muted-foreground hover:border-muted-foreground/30 hover:text-[#1e1f21]"
                }`}
              >
                {MORE_TABS.some((t) => t.label === activeTab) ? activeTab : "More"}
                <ChevronDown className="h-3.5 w-3.5" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              {MORE_TABS.map(({ label, icon: Icon }) => (
                <DropdownMenuItem
                  key={label}
                  onClick={() => setActiveTab(label)}
                  className={activeTab === label ? "bg-accent" : ""}
                >
                  <Icon className="mr-2 h-4 w-4" />
                  {label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* ── Search / Filter Bar ────────────────────────────────────── */}
      <div className="flex items-center gap-3 border-b bg-white px-6 py-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Search templates..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <Button variant="outline" size="sm" className="gap-1.5">
          <Filter className="h-3.5 w-3.5" />
          Filter
        </Button>
        {activeTab === "My Organization" && (
          <div className="ml-auto flex items-center gap-1 rounded-md border p-0.5">
            <button
              onClick={() => setViewMode("grid")}
              className={`rounded p-1.5 transition-colors ${
                viewMode === "grid" ? "bg-muted text-[#1e1f21]" : "text-muted-foreground hover:text-[#1e1f21]"
              }`}
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={`rounded p-1.5 transition-colors ${
                viewMode === "list" ? "bg-muted text-[#1e1f21]" : "text-muted-foreground hover:text-[#1e1f21]"
              }`}
            >
              <List className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>

      {/* ── Main Content ───────────────────────────────────────────── */}
      <div className="p-6">
        {/* ── "For You" Tab Content ───────────────────────────────── */}
        {activeTab === "For You" && (
          <>
            {/* Create with AI Card */}
            <div className="mb-8">
              <Card className="border border-dashed border-[#4573D2]/40 bg-gradient-to-r from-[#4573D2]/5 to-purple-500/5 shadow-sm cursor-pointer hover:shadow-md transition-all"
                onClick={() => toast.info("AI project creation coming soon")}
              >
                <CardContent className="flex items-center gap-4 py-6">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#4573D2] to-purple-500">
                    <Sparkles className="h-6 w-6 text-white" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-base font-semibold text-[#1e1f21]">Create with AI</h3>
                    <p className="text-sm text-muted-foreground">
                      Describe your project and let AI generate a workflow, tasks, and timeline for you.
                    </p>
                  </div>
                  <ArrowRight className="h-5 w-5 text-[#4573D2]" />
                </CardContent>
              </Card>
            </div>
          </>
        )}

        {/* ── "My Organization" Tab: Blank project + Template buttons ── */}
        {activeTab === "My Organization" && (
          <div className="mb-8">
            <div className="flex gap-3 mb-6">
              <Card
                className="flex-1 border shadow-sm cursor-pointer hover:border-[#4573D2] hover:shadow-md transition-all"
                onClick={() => { setProjectName(""); setCreateDialogOpen(true); }}
              >
                <CardContent className="flex items-center gap-3 py-5">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                    <FolderPlus className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-[#1e1f21]">Blank project</p>
                    <p className="text-xs text-muted-foreground">Start from scratch</p>
                  </div>
                </CardContent>
              </Card>
              <Card
                className="flex-1 border shadow-sm cursor-pointer hover:border-[#4573D2] hover:shadow-md transition-all"
                onClick={() => toast.info("Project template gallery opening...")}
              >
                <CardContent className="flex items-center gap-3 py-5">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#4573D2]/10">
                    <FileUp className="h-5 w-5 text-[#4573D2]" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-[#1e1f21]">Project template</p>
                    <p className="text-xs text-muted-foreground">Use a pre-built template</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {/* ── Automation Rules ─────────────────────────────────────── */}
        <div className="mb-8">
          <h2 className="mb-1 text-base font-medium text-[#1e1f21]">Automation Rules</h2>
          <p className="mb-4 text-sm text-muted-foreground">
            Automate repetitive work with rules that trigger actions
          </p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {[
              { label: "When task completed \u2192 notify team", trigger: "Task completed", action: "Send notification" },
              { label: "When due date passed \u2192 mark overdue", trigger: "Due date passed", action: "Change status" },
              { label: "When task created \u2192 assign reviewer", trigger: "Task created", action: "Set assignee" },
            ].map((rule, i) => (
              <Card
                key={i}
                className="border shadow-sm cursor-pointer hover:border-[#4573D2] transition-colors"
                onClick={() => toast.success(`Rule "${rule.label}" activated`)}
              >
                <CardContent className="pt-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Zap className="h-4 w-4 text-yellow-500" />
                    <span className="text-sm font-medium text-[#1e1f21]">{rule.label}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span className="rounded bg-muted px-1.5 py-0.5">{rule.trigger}</span>
                    <ArrowRight className="h-3 w-3" />
                    <span className="rounded bg-muted px-1.5 py-0.5">{rule.action}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* ── Workflow Templates ────────────────────────────────────── */}
        <h2 className="mb-1 text-base font-medium text-[#1e1f21]">Workflow Templates</h2>
        <p className="mb-4 text-sm text-muted-foreground">
          Start with a template and customize it for your team
        </p>

        {filteredTemplates.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-12">
            <Search className="mb-3 h-8 w-8 text-muted-foreground/40" />
            <p className="text-sm font-medium text-muted-foreground">No templates found</p>
            <p className="text-xs text-muted-foreground/70">Try adjusting your search or switching tabs</p>
          </div>
        ) : viewMode === "grid" ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filteredTemplates.map((template) => (
              <Card
                key={template.id}
                className={`border shadow-sm cursor-pointer transition-all hover:shadow-md ${
                  selectedTemplate === template.id ? "ring-2 ring-[#4573D2]" : ""
                }`}
                onClick={() => setSelectedTemplate(selectedTemplate === template.id ? null : template.id)}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-3">
                    <div
                      className="flex h-10 w-10 items-center justify-center rounded-lg"
                      style={{ backgroundColor: template.color + "20" }}
                    >
                      <template.icon className="h-5 w-5" style={{ color: template.color }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-sm font-semibold">{template.name}</CardTitle>
                      <p className="text-xs text-muted-foreground truncate">{template.description}</p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="mb-2">
                    <Badge variant="secondary" className="text-[10px]">
                      {template.category}
                    </Badge>
                  </div>
                  <div className="flex flex-wrap items-center gap-1">
                    {template.steps.map((step, i) => (
                      <div key={i} className="flex items-center">
                        <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
                          {step}
                        </span>
                        {i < template.steps.length - 1 && (
                          <ArrowRight className="mx-0.5 h-2.5 w-2.5 text-muted-foreground/50" />
                        )}
                      </div>
                    ))}
                  </div>
                  {selectedTemplate === template.id && (
                    <Button
                      className="mt-3 w-full gap-1.5 bg-[#4573D2] hover:bg-[#3A63B8]"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        toast.success(`Workflow "${template.name}" applied! Create a project to use it.`);
                        setSelectedTemplate(null);
                      }}
                    >
                      <Zap className="h-3.5 w-3.5" />
                      Use template
                    </Button>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          /* List View */
          <div className="space-y-2">
            {filteredTemplates.map((template) => (
              <Card
                key={template.id}
                className={`border shadow-sm cursor-pointer transition-all hover:shadow-md ${
                  selectedTemplate === template.id ? "ring-2 ring-[#4573D2]" : ""
                }`}
                onClick={() => setSelectedTemplate(selectedTemplate === template.id ? null : template.id)}
              >
                <CardContent className="flex items-center gap-4 py-3">
                  <div
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
                    style={{ backgroundColor: template.color + "20" }}
                  >
                    <template.icon className="h-4.5 w-4.5" style={{ color: template.color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-[#1e1f21]">{template.name}</p>
                      <Badge variant="secondary" className="text-[10px]">
                        {template.category}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground truncate">{template.description}</p>
                  </div>
                  <div className="hidden sm:flex items-center gap-1 shrink-0">
                    {template.steps.map((step, i) => (
                      <div key={i} className="flex items-center">
                        <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
                          {step}
                        </span>
                        {i < template.steps.length - 1 && (
                          <ArrowRight className="mx-0.5 h-2.5 w-2.5 text-muted-foreground/50" />
                        )}
                      </div>
                    ))}
                  </div>
                  {selectedTemplate === template.id && (
                    <Button
                      className="gap-1.5 bg-[#4573D2] hover:bg-[#3A63B8] shrink-0"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        toast.success(`Workflow "${template.name}" applied! Create a project to use it.`);
                        setSelectedTemplate(null);
                      }}
                    >
                      <Zap className="h-3.5 w-3.5" />
                      Use template
                    </Button>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* ── Project Templates & Custom Fields Cards ──────────────── */}
        <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Card className="border shadow-sm hover:shadow-md transition-all cursor-pointer" onClick={() => toast.info("Project Templates library coming soon")}>
            <CardHeader className="pb-2">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#4573D2]/10">
                  <Layers className="h-5 w-5 text-[#4573D2]" />
                </div>
                <div>
                  <CardTitle className="text-sm font-semibold">Project Templates</CardTitle>
                  <p className="text-xs text-muted-foreground">
                    Save and reuse project structures across your organization
                  </p>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span className="rounded bg-muted px-2 py-1">12 templates available</span>
                <span className="rounded bg-muted px-2 py-1">3 recently used</span>
              </div>
              <div className="mt-3 flex items-center gap-1.5 text-xs text-[#4573D2] font-medium">
                Browse templates
                <ArrowRight className="h-3 w-3" />
              </div>
            </CardContent>
          </Card>

          <Card className="border shadow-sm hover:shadow-md transition-all cursor-pointer" onClick={() => toast.info("Custom Fields manager coming soon")}>
            <CardHeader className="pb-2">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#FD9A00]/10">
                  <Settings2 className="h-5 w-5 text-[#FD9A00]" />
                </div>
                <div>
                  <CardTitle className="text-sm font-semibold">Custom Fields</CardTitle>
                  <p className="text-xs text-muted-foreground">
                    Create and manage custom fields for your workflows
                  </p>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span className="rounded bg-muted px-2 py-1">Priority</span>
                <span className="rounded bg-muted px-2 py-1">Effort</span>
                <span className="rounded bg-muted px-2 py-1">Impact</span>
                <span className="rounded bg-muted px-2 py-1">+5 more</span>
              </div>
              <div className="mt-3 flex items-center gap-1.5 text-xs text-[#FD9A00] font-medium">
                Manage fields
                <ArrowRight className="h-3 w-3" />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
