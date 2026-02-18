"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import {
  Plus,
  Zap,
  CheckCircle2,
  Users,
  Clock,
  AlertTriangle,
  FileText,
  Repeat,
  Sparkles,
  Search,
  ChevronDown,
  ChevronLeft,
  Globe,
  Lock,
  Megaphone,
  Target,
  Layers,
  ClipboardList,
  CalendarCheck,
  BarChart3,
  MoreHorizontal,
  Trash2,
  List,
  LayoutGrid,
  GanttChart,
  GitBranch,
  Copy,
  Edit3,
  Settings2,
  MessageSquare,
  ArrowRight,
  Calendar,
  FolderOpen,
  Shield,
  ChevronRight,
  X,
} from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

// ── Filter tag chips ────────────────────────────────────────────────
const FILTER_TAGS = [
  "Work intake",
  "Organizational planning",
  "Strategic planning",
  "Event planning",
  "Content creation",
  "Bug tracking",
  "Sprint planning",
] as const;

// ── Workflow Templates ──────────────────────────────────────────────
const WORKFLOW_TEMPLATES = [
  {
    id: "bug-tracking",
    name: "Bug Tracking",
    description: "Track and resolve bugs with a structured workflow",
    icon: AlertTriangle,
    color: "#E8384F",
    category: "Bug tracking",
    steps: ["Reported", "Triaged", "In Progress", "In Review", "Resolved"],
    sections: [
      {
        name: "Reported",
        tasks: [
          { name: "Login page crash on mobile", fields: ["High", "Bug"] },
          { name: "Dashboard loading slowly", fields: ["Medium", "Performance"] },
          { name: "Missing validation on form", fields: ["Low", "Bug"] },
        ],
      },
      {
        name: "Triaged",
        tasks: [
          { name: "API timeout on large requests", fields: ["High", "Backend"] },
        ],
      },
      {
        name: "In Progress",
        tasks: [
          { name: "Fix pagination offset", fields: ["Medium", "Bug"] },
        ],
      },
      {
        name: "In Review",
        tasks: [],
      },
      {
        name: "Resolved",
        tasks: [
          { name: "Header alignment issue", fields: ["Low", "UI"] },
        ],
      },
    ],
  },
  {
    id: "content-creation",
    name: "Content Creation",
    description: "Manage content from ideation to publication",
    icon: FileText,
    color: "#4573D2",
    category: "Content creation",
    steps: ["Ideation", "Drafting", "Review", "Editing", "Published"],
    sections: [
      {
        name: "Ideation",
        tasks: [
          { name: "Blog post: Getting started guide", fields: ["Draft", "Blog"] },
          { name: "Social media campaign Q1", fields: ["Planning", "Social"] },
        ],
      },
      {
        name: "Drafting",
        tasks: [
          { name: "Newsletter February edition", fields: ["In progress", "Email"] },
        ],
      },
      {
        name: "Review",
        tasks: [
          { name: "Product launch announcement", fields: ["Review", "PR"] },
        ],
      },
      {
        name: "Editing",
        tasks: [],
      },
      {
        name: "Published",
        tasks: [
          { name: "Year in review blog post", fields: ["Complete", "Blog"] },
        ],
      },
    ],
  },
  {
    id: "onboarding",
    name: "Employee Onboarding",
    description: "Streamline new employee onboarding process",
    icon: Users,
    color: "#7BC86C",
    category: "Organizational planning",
    steps: ["Pre-boarding", "Day 1", "Week 1", "Month 1", "Complete"],
    sections: [
      {
        name: "Pre-boarding",
        tasks: [
          { name: "Send welcome email", fields: ["HR", "Required"] },
          { name: "Set up workstation", fields: ["IT", "Required"] },
          { name: "Prepare onboarding docs", fields: ["HR", "Required"] },
        ],
      },
      {
        name: "Day 1",
        tasks: [
          { name: "Office tour", fields: ["Manager", "Required"] },
          { name: "Meet the team", fields: ["Manager", "Required"] },
        ],
      },
      {
        name: "Week 1",
        tasks: [
          { name: "Complete training modules", fields: ["Employee", "Required"] },
        ],
      },
      {
        name: "Month 1",
        tasks: [
          { name: "30-day check-in", fields: ["Manager", "Required"] },
        ],
      },
      {
        name: "Complete",
        tasks: [],
      },
    ],
  },
  {
    id: "sprint",
    name: "Sprint Planning",
    description: "Agile sprint workflow with planning and retrospective",
    icon: Repeat,
    color: "#FD9A00",
    category: "Sprint planning",
    steps: ["Backlog", "Sprint Planning", "In Progress", "Review", "Done"],
    sections: [
      {
        name: "Backlog",
        tasks: [
          { name: "User authentication flow", fields: ["5pts", "Feature"] },
          { name: "Dashboard redesign", fields: ["8pts", "Feature"] },
          { name: "API rate limiting", fields: ["3pts", "Tech debt"] },
        ],
      },
      {
        name: "Sprint Planning",
        tasks: [
          { name: "Sprint 12 planning meeting", fields: ["Team", "Meeting"] },
        ],
      },
      {
        name: "In Progress",
        tasks: [
          { name: "Implement search functionality", fields: ["5pts", "Feature"] },
        ],
      },
      {
        name: "Review",
        tasks: [],
      },
      {
        name: "Done",
        tasks: [
          { name: "Fix notification preferences", fields: ["2pts", "Bug"] },
        ],
      },
    ],
  },
  {
    id: "approvals",
    name: "Approval Workflow",
    description: "Route tasks through approval chains",
    icon: CheckCircle2,
    color: "#4573D2",
    category: "Work intake",
    steps: ["Draft", "Submitted", "Under Review", "Approved", "Implemented"],
    sections: [
      {
        name: "Draft",
        tasks: [
          { name: "Budget proposal Q2", fields: ["Finance", "Pending"] },
          { name: "New vendor contract", fields: ["Legal", "Pending"] },
        ],
      },
      {
        name: "Submitted",
        tasks: [
          { name: "Marketing spend increase", fields: ["Marketing", "Submitted"] },
        ],
      },
      {
        name: "Under Review",
        tasks: [],
      },
      {
        name: "Approved",
        tasks: [
          { name: "Office renovation plan", fields: ["Facilities", "Approved"] },
        ],
      },
      {
        name: "Implemented",
        tasks: [],
      },
    ],
  },
  {
    id: "event-planning",
    name: "Event Planning",
    description: "Plan and execute events from start to finish",
    icon: Clock,
    color: "#9B59B6",
    category: "Event planning",
    steps: ["Planning", "Logistics", "Promotion", "Execution", "Post-event"],
    sections: [
      {
        name: "Planning",
        tasks: [
          { name: "Define event goals", fields: ["Strategy", "Required"] },
          { name: "Set budget", fields: ["Finance", "Required"] },
          { name: "Choose venue", fields: ["Logistics", "Required"] },
        ],
      },
      {
        name: "Logistics",
        tasks: [
          { name: "Book catering", fields: ["Vendor", "In progress"] },
          { name: "AV equipment setup", fields: ["Tech", "Pending"] },
        ],
      },
      {
        name: "Promotion",
        tasks: [
          { name: "Create event page", fields: ["Marketing", "In progress"] },
        ],
      },
      {
        name: "Execution",
        tasks: [],
      },
      {
        name: "Post-event",
        tasks: [],
      },
    ],
  },
  {
    id: "work-intake",
    name: "Work Intake",
    description: "Centralize and manage incoming work requests",
    icon: ClipboardList,
    color: "#00BCD4",
    category: "Work intake",
    steps: ["Submitted", "Screening", "Prioritized", "Assigned", "In Progress"],
    sections: [
      {
        name: "Submitted",
        tasks: [
          { name: "Website redesign request", fields: ["Design", "New"] },
          { name: "Data migration project", fields: ["Engineering", "New"] },
        ],
      },
      {
        name: "Screening",
        tasks: [
          { name: "CRM integration", fields: ["Engineering", "Screening"] },
        ],
      },
      {
        name: "Prioritized",
        tasks: [],
      },
      {
        name: "Assigned",
        tasks: [],
      },
      {
        name: "In Progress",
        tasks: [],
      },
    ],
  },
  {
    id: "org-planning",
    name: "Organizational Planning",
    description: "Align teams and resources around strategic objectives",
    icon: Users,
    color: "#3F51B5",
    category: "Organizational planning",
    steps: ["Assessment", "Goal Setting", "Resource Plan", "Execution", "Review"],
    sections: [
      {
        name: "Assessment",
        tasks: [
          { name: "Team capacity review", fields: ["HR", "Required"] },
          { name: "Skills gap analysis", fields: ["HR", "Required"] },
        ],
      },
      {
        name: "Goal Setting",
        tasks: [
          { name: "Q2 OKRs", fields: ["Leadership", "Draft"] },
        ],
      },
      {
        name: "Resource Plan",
        tasks: [],
      },
      {
        name: "Execution",
        tasks: [],
      },
      {
        name: "Review",
        tasks: [],
      },
    ],
  },
  {
    id: "strategic-planning",
    name: "Strategic Planning",
    description: "Define long-term goals and track strategic initiatives",
    icon: Target,
    color: "#E91E63",
    category: "Strategic planning",
    steps: ["Vision", "Analysis", "Strategy", "Roadmap", "Monitor"],
    sections: [
      {
        name: "Vision",
        tasks: [
          { name: "Company mission review", fields: ["Leadership", "Annual"] },
        ],
      },
      {
        name: "Analysis",
        tasks: [
          { name: "Market research", fields: ["Strategy", "In progress"] },
          { name: "Competitor analysis", fields: ["Strategy", "In progress"] },
        ],
      },
      {
        name: "Strategy",
        tasks: [],
      },
      {
        name: "Roadmap",
        tasks: [],
      },
      {
        name: "Monitor",
        tasks: [],
      },
    ],
  },
  {
    id: "campaign-management",
    name: "Campaign Management",
    description: "Plan, execute, and measure marketing campaigns",
    icon: Megaphone,
    color: "#FF5722",
    category: "Content creation",
    steps: ["Brief", "Creative", "Review", "Launch", "Measure"],
    sections: [
      {
        name: "Brief",
        tasks: [
          { name: "Campaign brief: Spring launch", fields: ["Marketing", "Draft"] },
        ],
      },
      {
        name: "Creative",
        tasks: [
          { name: "Design ad creatives", fields: ["Design", "In progress"] },
          { name: "Write copy", fields: ["Content", "In progress"] },
        ],
      },
      {
        name: "Review",
        tasks: [],
      },
      {
        name: "Launch",
        tasks: [],
      },
      {
        name: "Measure",
        tasks: [],
      },
    ],
  },
  {
    id: "project-tracking",
    name: "Project Tracking",
    description: "Track project milestones, tasks, and deliverables",
    icon: BarChart3,
    color: "#795548",
    category: "Work intake",
    steps: ["Initiation", "Planning", "Execution", "Monitoring", "Closure"],
    sections: [
      {
        name: "Initiation",
        tasks: [
          { name: "Project charter", fields: ["PM", "Required"] },
          { name: "Stakeholder identification", fields: ["PM", "Required"] },
        ],
      },
      {
        name: "Planning",
        tasks: [
          { name: "Work breakdown structure", fields: ["PM", "In progress"] },
        ],
      },
      {
        name: "Execution",
        tasks: [],
      },
      {
        name: "Monitoring",
        tasks: [],
      },
      {
        name: "Closure",
        tasks: [],
      },
    ],
  },
  {
    id: "daily-standup",
    name: "Daily Standup",
    description: "Facilitate daily team check-ins and blockers",
    icon: CalendarCheck,
    color: "#009688",
    category: "Organizational planning",
    steps: ["Yesterday", "Today", "Blockers", "Action Items", "Wrap-up"],
    sections: [
      {
        name: "Yesterday",
        tasks: [
          { name: "Completed feature X", fields: ["Dev", "Done"] },
        ],
      },
      {
        name: "Today",
        tasks: [
          { name: "Start feature Y", fields: ["Dev", "Planned"] },
          { name: "Code review PRs", fields: ["Dev", "Planned"] },
        ],
      },
      {
        name: "Blockers",
        tasks: [
          { name: "Waiting on API access", fields: ["DevOps", "Blocked"] },
        ],
      },
      {
        name: "Action Items",
        tasks: [],
      },
      {
        name: "Wrap-up",
        tasks: [],
      },
    ],
  },
];

type TemplateType = (typeof WORKFLOW_TEMPLATES)[number];

// ── View type for the page ──────────────────────────────────────────
type PageView = "gallery" | "detail" | "edit";
type EditSidebarTab = "content" | "overview" | "dates" | "settings";

// ── Component ─────────────────────────────────────────────────────────
export default function WorkflowsPage() {
  // Page view state
  const [pageView, setPageView] = useState<PageView>("gallery");
  const [detailTemplate, setDetailTemplate] = useState<TemplateType | null>(null);
  const [detailSavedTemplate, setDetailSavedTemplate] = useState<any>(null);

  // Gallery state
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilterTag, setActiveFilterTag] = useState<string | null>(null);
  const [aiPrompt, setAiPrompt] = useState("");

  // Use template dialog state
  const [useTemplateDialogOpen, setUseTemplateDialogOpen] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");
  const [newProjectPrivacy, setNewProjectPrivacy] = useState<"workspace" | "private">("workspace");
  const [activePreviewTemplate, setActivePreviewTemplate] = useState<TemplateType | null>(null);

  // Detail preview view state
  const [detailPreviewView, setDetailPreviewView] = useState<"list" | "board" | "timeline">("list");
  const [detailInfoTab, setDetailInfoTab] = useState<"description" | "usage">("description");

  // Edit mode state
  const [editSidebarTab, setEditSidebarTab] = useState<EditSidebarTab>("content");
  const [editActiveView, setEditActiveView] = useState("List");

  // Project members dialog state
  const [membersDialogOpen, setMembersDialogOpen] = useState(false);
  const [memberSearch, setMemberSearch] = useState("");
  const [memberRole, setMemberRole] = useState("Editor");
  const [memberVisibility, setMemberVisibility] = useState("workspace");

  const { data: workspaces } = trpc.workspaces.list.useQuery();
  const workspaceId = workspaces?.[0]?.id;

  const { data: projects } = trpc.projects.list.useQuery(
    { workspaceId: workspaceId! },
    { enabled: !!workspaceId }
  );

  const { data: savedTemplates } = trpc.templates.list.useQuery(
    { workspaceId: workspaceId! },
    { enabled: !!workspaceId }
  );

  const utils = trpc.useUtils();

  const createProject = trpc.projects.create.useMutation({
    onSuccess: (project) => {
      toast.success(`Project "${project.name}" created`);
      setUseTemplateDialogOpen(false);
      setNewProjectName("");
      setNewProjectPrivacy("workspace");
      if (workspaceId) utils.projects.list.invalidate({ workspaceId });
    },
    onError: () => toast.error("Failed to create project"),
  });

  const createSection = trpc.sections.create.useMutation();
  const createTask = trpc.tasks.create.useMutation();

  const createFromTemplate = trpc.templates.createProjectFromTemplate.useMutation({
    onSuccess: (project) => {
      toast.success(`Project "${project.name}" created from template`);
      setUseTemplateDialogOpen(false);
      setNewProjectName("");
      if (workspaceId) utils.projects.list.invalidate({ workspaceId });
    },
    onError: (err) => toast.error(err.message || "Failed to create from template"),
  });

  const deleteTemplate = trpc.templates.delete.useMutation({
    onSuccess: () => {
      toast.success("Template deleted");
      if (workspaceId) utils.templates.list.invalidate({ workspaceId });
    },
    onError: (err) => toast.error(err.message || "Failed to delete template"),
  });

  // Filter templates based on search and active filter tag
  const filteredTemplates = WORKFLOW_TEMPLATES.filter((t) => {
    const matchesSearch =
      searchQuery === "" ||
      t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = !activeFilterTag || t.category === activeFilterTag;
    return matchesSearch && matchesFilter;
  });

  const openTemplateDetail = (template: TemplateType) => {
    setDetailTemplate(template);
    setDetailSavedTemplate(null);
    setPageView("detail");
  };

  const openSavedTemplateDetail = (tpl: any) => {
    setDetailSavedTemplate(tpl);
    // Find a matching gallery template or create a basic one
    const matchingGallery = WORKFLOW_TEMPLATES.find((t) =>
      t.name.toLowerCase() === tpl.name.toLowerCase()
    );
    setDetailTemplate(matchingGallery || null);
    setPageView("detail");
  };

  const openUseTemplateDialog = (template: TemplateType | null, savedTpl: any) => {
    setActivePreviewTemplate(template);
    setDetailSavedTemplate(savedTpl || null);
    if (savedTpl) {
      setNewProjectName(savedTpl.name);
    } else if (template) {
      setNewProjectName(template.name);
    }
    setNewProjectPrivacy("workspace");
    setUseTemplateDialogOpen(true);
  };

  const handleCreateFromTemplate = () => {
    if (!workspaceId) {
      toast.error("No workspace found");
      return;
    }
    if (!newProjectName.trim()) {
      toast.error("Please enter a project name");
      return;
    }

    // If we have a saved template, use createFromTemplate
    if (detailSavedTemplate) {
      createFromTemplate.mutate({
        templateId: detailSavedTemplate.id,
        workspaceId,
        name: newProjectName.trim(),
      });
      return;
    }

    // Otherwise use gallery template
    if (activePreviewTemplate) {
      const templateSections = activePreviewTemplate.sections;
      createProject.mutate(
        {
          workspaceId,
          name: newProjectName.trim(),
          color: activePreviewTemplate.color,
          privacy: newProjectPrivacy === "private" ? "PRIVATE" : "PUBLIC",
          skipDefaultSections: true,
        },
        {
          onSuccess: async (project) => {
            try {
              let taskCount = 0;
              for (const sectionData of templateSections) {
                const section = await createSection.mutateAsync({
                  projectId: project.id,
                  name: sectionData.name,
                });
                // Create tasks for this section
                for (const taskData of sectionData.tasks) {
                  await createTask.mutateAsync({
                    title: taskData.name,
                    projectId: project.id,
                    sectionId: section.id,
                    workspaceId,
                  });
                  taskCount++;
                }
              }
              toast.success(
                `Project "${project.name}" created with ${templateSections.length} sections and ${taskCount} tasks`
              );
            } catch {
              toast.success(
                `Project "${project.name}" created (some sections/tasks may not have been added)`
              );
            }
            setUseTemplateDialogOpen(false);
            setNewProjectName("");
            setPageView("gallery");
          },
        }
      );
      return;
    }

    // Blank project
    createProject.mutate({
      workspaceId,
      name: newProjectName.trim(),
      privacy: newProjectPrivacy === "private" ? "PRIVATE" : "PUBLIC",
    });
  };

  const handleAiCreate = () => {
    if (!aiPrompt.trim()) {
      toast.error("Please describe the work you want to manage");
      return;
    }
    toast.success("AI is creating your workflow...");
    setAiPrompt("");
  };

  // Helper to copy link
  const copyTemplateLink = () => {
    const url = typeof window !== "undefined" ? window.location.href : "";
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(url).then(() => {
        toast.success("Link copied to clipboard");
      }).catch(() => {
        toast.success("Link copied to clipboard");
      });
    } else {
      toast.success("Link copied to clipboard");
    }
  };

  // ── Template Detail View ──────────────────────────────────────────
  if (pageView === "detail" && (detailTemplate || detailSavedTemplate)) {
    const template = detailTemplate;
    const saved = detailSavedTemplate;
    const displayName = saved?.name || template?.name || "Template";
    const displayDescription = saved?.description || template?.description || "";
    const displaySteps = template?.steps || [];
    const displaySections = template?.sections || [];
    const daysAgo = saved
      ? Math.floor(
          (Date.now() - new Date(saved.createdAt).getTime()) /
            (1000 * 60 * 60 * 24)
        )
      : 0;

    return (
      <div className="flex h-full flex-col">
        {/* Header */}
        <div className="flex h-14 items-center justify-between border-b bg-white px-6">
          <button
            className="flex items-center gap-1.5 text-sm text-[#4573D2] hover:underline"
            onClick={() => setPageView("gallery")}
          >
            <ChevronLeft className="h-4 w-4" />
            Back to gallery
          </button>

          {/* 3-dots menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex h-8 w-8 items-center justify-center rounded-md hover:bg-muted">
                <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={copyTemplateLink}>
                <Copy className="mr-2 h-3.5 w-3.5" />
                Copy link
              </DropdownMenuItem>
              {saved && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="text-destructive"
                    onClick={() => {
                      deleteTemplate.mutate({ id: saved.id });
                      setPageView("gallery");
                    }}
                  >
                    <Trash2 className="mr-2 h-3.5 w-3.5" />
                    Delete this template
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Content */}
        <div className="flex flex-1 overflow-hidden">
          {/* Left panel - Template info */}
          <div className="w-[360px] shrink-0 overflow-y-auto border-r bg-white p-6">
            {/* Created by */}
            <div className="mb-1 flex items-center gap-2 text-xs text-muted-foreground">
              <Avatar className="h-5 w-5">
                <AvatarFallback className="bg-[#4573D2] text-[8px] text-white">
                  Y
                </AvatarFallback>
              </Avatar>
              <span>Created by you</span>
            </div>

            {/* Template name */}
            <h1 className="mb-1 text-2xl font-semibold text-[#1e1f21]">
              {displayName}
            </h1>

            {/* Used X days ago */}
            {saved && (
              <p className="mb-4 text-xs text-muted-foreground">
                Used {daysAgo === 0 ? "today" : `${daysAgo} day${daysAgo !== 1 ? "s" : ""} ago`}
              </p>
            )}
            {!saved && (
              <p className="mb-4 text-xs text-muted-foreground">
                Gallery template
              </p>
            )}

            {/* Use template button */}
            <Button
              className="mb-3 w-full gap-2 bg-[#1e1f21] text-white hover:bg-[#2e2f31]"
              onClick={() =>
                openUseTemplateDialog(template, saved)
              }
            >
              Use template
            </Button>

            {/* Edit button */}
            <Button
              variant="outline"
              className="mb-6 w-full gap-2"
              onClick={() => {
                setEditSidebarTab("content");
                setEditActiveView("List");
                setPageView("edit");
              }}
            >
              <Edit3 className="h-3.5 w-3.5" />
              Edit
            </Button>

            {/* View toggle */}
            <div className="mb-6 flex items-center gap-1 rounded-lg border p-1">
              {([
                { key: "list" as const, label: "List", icon: List },
                { key: "board" as const, label: "Board", icon: LayoutGrid },
                { key: "timeline" as const, label: "Timeline", icon: GanttChart },
              ]).map((v) => {
                const VIcon = v.icon;
                return (
                  <button
                    key={v.key}
                    onClick={() => setDetailPreviewView(v.key)}
                    className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                      detailPreviewView === v.key
                        ? "bg-muted text-[#1e1f21]"
                        : "text-muted-foreground hover:text-[#1e1f21]"
                    }`}
                  >
                    <VIcon className="h-3.5 w-3.5" />
                    {v.label}
                  </button>
                );
              })}
            </div>

            {/* Description / Usage tabs */}
            <div className="border-t pt-4">
              <div className="mb-3 flex gap-4 border-b">
                <button
                  onClick={() => setDetailInfoTab("description")}
                  className={`border-b-2 pb-2 text-sm font-medium transition-colors ${
                    detailInfoTab === "description"
                      ? "border-[#1e1f21] text-[#1e1f21]"
                      : "border-transparent text-muted-foreground hover:text-[#1e1f21]"
                  }`}
                >
                  Description
                </button>
                <button
                  onClick={() => setDetailInfoTab("usage")}
                  className={`border-b-2 pb-2 text-sm font-medium transition-colors ${
                    detailInfoTab === "usage"
                      ? "border-[#1e1f21] text-[#1e1f21]"
                      : "border-transparent text-muted-foreground hover:text-[#1e1f21]"
                  }`}
                >
                  Usage
                </button>
              </div>

              {detailInfoTab === "description" && (
                <>
                  <p className="text-sm text-muted-foreground">
                    {displayDescription || "No description provided"}
                  </p>
                  {displaySteps.length > 0 && (
                    <div className="mt-4">
                      <p className="mb-2 text-xs font-medium text-[#1e1f21]">
                        Workflow steps
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {displaySteps.map((step, i) => (
                          <Badge
                            key={i}
                            variant="secondary"
                            className="text-[10px]"
                          >
                            {step}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}

              {detailInfoTab === "usage" && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between rounded-lg border p-3">
                    <div>
                      <p className="text-xs font-medium text-[#1e1f21]">Projects created</p>
                      <p className="text-2xl font-semibold text-[#1e1f21]">
                        {saved ? 1 : 0}
                      </p>
                    </div>
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#4573D2]/10">
                      <FolderOpen className="h-5 w-5 text-[#4573D2]" />
                    </div>
                  </div>
                  <div className="flex items-center justify-between rounded-lg border p-3">
                    <div>
                      <p className="text-xs font-medium text-[#1e1f21]">Sections</p>
                      <p className="text-2xl font-semibold text-[#1e1f21]">
                        {displaySections.length}
                      </p>
                    </div>
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-50">
                      <Layers className="h-5 w-5 text-green-600" />
                    </div>
                  </div>
                  <div className="flex items-center justify-between rounded-lg border p-3">
                    <div>
                      <p className="text-xs font-medium text-[#1e1f21]">Total tasks</p>
                      <p className="text-2xl font-semibold text-[#1e1f21]">
                        {displaySections.reduce((sum, s) => sum + s.tasks.length, 0)}
                      </p>
                    </div>
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-50">
                      <CheckCircle2 className="h-5 w-5 text-orange-500" />
                    </div>
                  </div>
                  {saved && (
                    <div className="rounded-lg border p-3">
                      <p className="text-xs font-medium text-[#1e1f21] mb-1">Last used</p>
                      <p className="text-sm text-muted-foreground">
                        {daysAgo === 0 ? "Today" : `${daysAgo} day${daysAgo !== 1 ? "s" : ""} ago`}
                      </p>
                    </div>
                  )}
                  {!saved && (
                    <p className="text-xs text-muted-foreground">
                      This is a gallery template. Use it to create a project and start tracking usage.
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Right panel - Preview */}
          <div className="flex-1 overflow-y-auto bg-[#f9f8f8] p-6">
            <div className="mx-auto max-w-3xl">
              {/* Preview header with template name */}
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-7 w-7 items-center justify-center rounded bg-muted">
                  <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
                </div>
                <h3 className="text-sm font-semibold text-[#1e1f21]">
                  {displayName}
                </h3>
              </div>

              {/* ── List View ──────────────────────────────────── */}
              {detailPreviewView === "list" && (
                <div className="rounded-lg border bg-white shadow-sm">
                  <div className="flex items-center border-b px-4 py-2 text-xs font-medium text-muted-foreground">
                    <div className="flex-1">Task name</div>
                    <div className="w-24 text-center">Assignee</div>
                    <div className="w-24 text-center">Due date</div>
                    <div className="w-20 text-center">Priority</div>
                  </div>
                  {displaySections.map((section, si) => (
                    <div key={si}>
                      <div className="flex items-center gap-2 border-b bg-[#f9f8f8] px-4 py-2">
                        <ChevronDown className="h-3 w-3 text-muted-foreground" />
                        <span
                          className="text-xs font-semibold"
                          style={{ color: template?.color || "#1e1f21" }}
                        >
                          {section.name}
                        </span>
                        <span className="text-[10px] text-muted-foreground">
                          {section.tasks.length}
                        </span>
                      </div>
                      {section.tasks.map((task, ti) => (
                        <div
                          key={ti}
                          className="flex items-center border-b px-4 py-2.5 last:border-b-0 hover:bg-muted/20"
                        >
                          <div className="flex flex-1 items-center gap-2">
                            <div className="h-4 w-4 rounded-full border-2 border-gray-300" />
                            <span className="text-sm text-[#1e1f21]">{task.name}</span>
                          </div>
                          <div className="flex w-24 justify-center">
                            <div className="h-6 w-6 rounded-full bg-gray-200" />
                          </div>
                          <div className="w-24 text-center text-xs text-muted-foreground">—</div>
                          <div className="w-20 text-center">
                            {task.fields[0] && (
                              <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
                                {task.fields[0]}
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ))}
                  {displaySections.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                      <List className="mb-2 h-8 w-8 text-muted-foreground/30" />
                      <p className="text-sm">No preview available</p>
                    </div>
                  )}
                </div>
              )}

              {/* ── Board View ─────────────────────────────────── */}
              {detailPreviewView === "board" && (
                <div className="flex gap-3 overflow-x-auto pb-4">
                  {displaySections.map((section, si) => (
                    <div
                      key={si}
                      className="w-[250px] shrink-0 rounded-lg bg-white border shadow-sm"
                    >
                      {/* Column header */}
                      <div className="flex items-center justify-between border-b px-3 py-2.5">
                        <div className="flex items-center gap-2">
                          <div
                            className="h-2 w-2 rounded-full"
                            style={{ backgroundColor: template?.color || "#4573D2" }}
                          />
                          <span className="text-xs font-semibold text-[#1e1f21]">
                            {section.name}
                          </span>
                        </div>
                        <span className="text-[10px] text-muted-foreground">
                          {section.tasks.length}
                        </span>
                      </div>
                      {/* Cards */}
                      <div className="space-y-2 p-2">
                        {section.tasks.map((task, ti) => (
                          <div
                            key={ti}
                            className="rounded-lg border bg-white p-3 shadow-sm hover:shadow-md transition-shadow"
                          >
                            <p className="text-sm text-[#1e1f21] mb-2">
                              {task.name}
                            </p>
                            <div className="flex items-center justify-between">
                              <div className="flex gap-1">
                                {task.fields.map((f, fi) => (
                                  <span
                                    key={fi}
                                    className="rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground"
                                  >
                                    {f}
                                  </span>
                                ))}
                              </div>
                              <div className="h-5 w-5 rounded-full bg-gray-200" />
                            </div>
                          </div>
                        ))}
                        {section.tasks.length === 0 && (
                          <div className="rounded-lg border border-dashed py-6 text-center">
                            <p className="text-[10px] text-muted-foreground">
                              No tasks
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                  {displaySections.length === 0 && (
                    <div className="flex w-full flex-col items-center justify-center py-12 text-muted-foreground">
                      <LayoutGrid className="mb-2 h-8 w-8 text-muted-foreground/30" />
                      <p className="text-sm">No preview available</p>
                    </div>
                  )}
                </div>
              )}

              {/* ── Timeline View ──────────────────────────────── */}
              {detailPreviewView === "timeline" && (
                <div className="rounded-lg border bg-white shadow-sm">
                  {/* Timeline header */}
                  <div className="flex items-center border-b">
                    <div className="w-[200px] shrink-0 border-r px-4 py-2 text-xs font-medium text-muted-foreground">
                      Task name
                    </div>
                    <div className="flex flex-1">
                      {["Week 1", "Week 2", "Week 3", "Week 4", "Week 5"].map(
                        (w, i) => (
                          <div
                            key={i}
                            className="flex-1 border-r px-2 py-2 text-center text-[10px] text-muted-foreground last:border-r-0"
                          >
                            {w}
                          </div>
                        )
                      )}
                    </div>
                  </div>
                  {/* Timeline rows */}
                  {displaySections.map((section, si) => (
                    <div key={si}>
                      {/* Section header row */}
                      <div className="flex items-center border-b bg-[#f9f8f8]">
                        <div className="w-[200px] shrink-0 border-r px-4 py-2">
                          <span
                            className="text-xs font-semibold"
                            style={{ color: template?.color || "#1e1f21" }}
                          >
                            {section.name}
                          </span>
                        </div>
                        <div className="flex-1" />
                      </div>
                      {/* Task rows with gantt bars */}
                      {section.tasks.map((task, ti) => {
                        // Distribute bars across the timeline for visual variety
                        const startCol = (si + ti) % 4;
                        const barWidth = 1 + ((ti + si) % 3);
                        return (
                          <div
                            key={ti}
                            className="flex items-center border-b last:border-b-0 hover:bg-muted/10"
                          >
                            <div className="w-[200px] shrink-0 border-r px-4 py-2.5">
                              <div className="flex items-center gap-2">
                                <div className="h-3.5 w-3.5 rounded-full border-2 border-gray-300" />
                                <span className="text-xs text-[#1e1f21] truncate">
                                  {task.name}
                                </span>
                              </div>
                            </div>
                            <div className="flex flex-1 items-center py-1.5">
                              {[0, 1, 2, 3, 4].map((col) => (
                                <div
                                  key={col}
                                  className="flex-1 border-r px-0.5 last:border-r-0"
                                >
                                  {col >= startCol &&
                                    col < startCol + barWidth && (
                                      <div
                                        className="h-6 rounded"
                                        style={{
                                          backgroundColor:
                                            (template?.color || "#4573D2") + "40",
                                          borderLeft:
                                            col === startCol
                                              ? `3px solid ${template?.color || "#4573D2"}`
                                              : undefined,
                                        }}
                                      />
                                    )}
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ))}
                  {displaySections.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                      <GanttChart className="mb-2 h-8 w-8 text-muted-foreground/30" />
                      <p className="text-sm">No preview available</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Use Template Dialog */}
        {renderUseTemplateDialog()}
      </div>
    );
  }

  // ── Edit Mode ("Build your template") View ────────────────────────
  if (pageView === "edit" && (detailTemplate || detailSavedTemplate)) {
    const template = detailTemplate;
    const saved = detailSavedTemplate;
    const displayName = saved?.name || template?.name || "Template";
    const displaySections = template?.sections || [];
    const EDIT_VIEWS = ["Overview", "List", "Board", "Timeline", "Dashboard", "Calendar", "Workflow", "Messages", "Files"];

    return (
      <div className="flex h-full flex-col">
        {/* Top bar */}
        <div className="flex h-12 items-center justify-between border-b bg-white px-4">
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <button
              className="hover:text-[#1e1f21]"
              onClick={() => setPageView("gallery")}
            >
              My workspace
            </button>
            <ChevronRight className="h-3 w-3" />
            <span className="text-[#1e1f21]">{displayName}</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>All edits will be auto-saved</span>
            <Button
              size="sm"
              className="h-7 gap-1.5 bg-[#4573D2] hover:bg-[#3A63B8] text-xs"
              onClick={() => {
                toast.success("Template saved");
                setPageView("detail");
              }}
            >
              Save
            </Button>
          </div>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Left sidebar */}
          <div className="w-[240px] shrink-0 overflow-y-auto border-r bg-white">
            <div className="p-4">
              <h2 className="mb-4 text-base font-semibold text-[#1e1f21]">
                Build your template
              </h2>

              {/* Sidebar tabs */}
              <div className="space-y-0.5">
                {[
                  { id: "content" as EditSidebarTab, label: "Project content", icon: FolderOpen },
                  { id: "overview" as EditSidebarTab, label: "Overview", icon: FileText },
                  { id: "dates" as EditSidebarTab, label: "Due dates", icon: Calendar },
                  { id: "settings" as EditSidebarTab, label: "Settings", icon: Settings2 },
                ].map((tab) => {
                  const TabIcon = tab.icon;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setEditSidebarTab(tab.id)}
                      className={`flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors ${
                        editSidebarTab === tab.id
                          ? "bg-[#4573D2]/10 font-medium text-[#4573D2]"
                          : "text-muted-foreground hover:bg-muted/50 hover:text-[#1e1f21]"
                      }`}
                    >
                      <TabIcon className="h-4 w-4" />
                      {tab.label}
                    </button>
                  );
                })}
              </div>

              {/* Description text */}
              <div className="mt-6 rounded-lg border bg-muted/20 p-3">
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {editSidebarTab === "content" &&
                    "Add or edit the template's default tasks, assignees, and due dates."}
                  {editSidebarTab === "overview" &&
                    "Customize the project overview that appears when using this template."}
                  {editSidebarTab === "dates" &&
                    "Set relative due dates that will be calculated when the template is used."}
                  {editSidebarTab === "settings" &&
                    "Configure template settings like privacy and default views."}
                </p>
              </div>

              {/* Continue step */}
              <div className="mt-4">
                <button
                  className="flex w-full items-center gap-2 rounded-md border px-3 py-2 text-xs font-medium text-[#4573D2] hover:bg-muted/30"
                  onClick={() => {
                    toast.success("Template saved");
                    setPageView("detail");
                  }}
                >
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#4573D2] text-[10px] text-white">
                    1
                  </span>
                  Continue
                  <ChevronRight className="ml-auto h-3.5 w-3.5" />
                </button>
              </div>

              {/* Project rules section */}
              <div className="mt-6 border-t pt-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-xs font-semibold text-[#1e1f21]">
                    Project rules
                  </h3>
                  <button className="text-[10px] text-[#4573D2] hover:underline">
                    + Add rules
                  </button>
                </div>
                <p className="text-[10px] text-muted-foreground leading-relaxed">
                  Create project rules to automatically assign tasks to the right person, set due dates, and more.
                </p>
              </div>
            </div>
          </div>

          {/* Right content - Project editor */}
          <div className="flex flex-1 flex-col overflow-hidden bg-white">
            {/* Editor header */}
            <div className="flex items-center justify-between border-b px-4 py-2">
              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded bg-muted">
                  <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
                </div>
                <h3 className="text-sm font-semibold text-[#1e1f21]">
                  {displayName}
                </h3>
              </div>
              <div className="flex items-center gap-1.5">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 gap-1.5 text-xs"
                  onClick={() => setMembersDialogOpen(true)}
                >
                  <Users className="h-3.5 w-3.5" />
                  Project members
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 gap-1.5 text-xs"
                  onClick={() => toast.info("Customize fields")}
                >
                  <Settings2 className="h-3.5 w-3.5" />
                  Customize
                </Button>
              </div>
            </div>

            {/* View tabs */}
            <div className="flex items-center gap-0.5 border-b px-4 overflow-x-auto">
              {EDIT_VIEWS.map((view) => (
                <button
                  key={view}
                  onClick={() => setEditActiveView(view)}
                  className={`whitespace-nowrap border-b-2 px-3 py-2 text-xs font-medium transition-colors ${
                    editActiveView === view
                      ? "border-[#4573D2] text-[#4573D2]"
                      : "border-transparent text-muted-foreground hover:text-[#1e1f21]"
                  }`}
                >
                  {view}
                </button>
              ))}
            </div>

            {/* Editor content */}
            <div className="flex-1 overflow-y-auto p-4">
              {/* Sidebar-driven content (overview, dates, settings always show their own content) */}
              {editSidebarTab === "overview" && (
                <div className="mx-auto max-w-lg space-y-4">
                  <h3 className="text-sm font-medium text-[#1e1f21]">
                    Project overview
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    This overview will be shown when someone creates a project from this template.
                  </p>
                  <div className="rounded-lg border p-4">
                    <p className="text-sm text-muted-foreground">
                      {saved?.description || template?.description || "No overview description set."}
                    </p>
                  </div>
                </div>
              )}

              {editSidebarTab === "dates" && (
                <div className="mx-auto max-w-lg space-y-4">
                  <h3 className="text-sm font-medium text-[#1e1f21]">
                    Due dates
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Set relative due dates for tasks. When the template is used, dates will be calculated from the project start date.
                  </p>
                  <div className="rounded-lg border border-dashed p-8 text-center">
                    <Calendar className="mx-auto mb-2 h-8 w-8 text-muted-foreground/30" />
                    <p className="text-sm text-muted-foreground">
                      No due dates configured
                    </p>
                    <p className="text-xs text-muted-foreground/70">
                      Add due dates to tasks in the Project content tab
                    </p>
                  </div>
                </div>
              )}

              {editSidebarTab === "settings" && (
                <div className="mx-auto max-w-lg space-y-4">
                  <h3 className="text-sm font-medium text-[#1e1f21]">
                    Template settings
                  </h3>
                  <div className="space-y-3">
                    <div className="rounded-lg border p-4">
                      <Label className="text-xs font-medium">
                        Default privacy
                      </Label>
                      <p className="mb-2 text-[10px] text-muted-foreground">
                        Set the default privacy when creating a project from this template
                      </p>
                      <Select defaultValue="workspace">
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="workspace">
                            <div className="flex items-center gap-2">
                              <Globe className="h-3.5 w-3.5" />
                              My workspace
                            </div>
                          </SelectItem>
                          <SelectItem value="private">
                            <div className="flex items-center gap-2">
                              <Lock className="h-3.5 w-3.5" />
                              Private to members
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="rounded-lg border p-4">
                      <Label className="text-xs font-medium">
                        Default view
                      </Label>
                      <p className="mb-2 text-[10px] text-muted-foreground">
                        Choose which view to show by default
                      </p>
                      <Select defaultValue="list">
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="list">List</SelectItem>
                          <SelectItem value="board">Board</SelectItem>
                          <SelectItem value="timeline">Timeline</SelectItem>
                          <SelectItem value="calendar">Calendar</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              )}

              {/* View-tab-driven content (when sidebar is on "content") */}
              {editSidebarTab === "content" && editActiveView === "Overview" && (
                <div className="mx-auto max-w-2xl space-y-6">
                  {/* Project header */}
                  <div className="flex items-center gap-3">
                    <div
                      className="flex h-12 w-12 items-center justify-center rounded-lg"
                      style={{ backgroundColor: (template?.color || "#4573D2") + "20" }}
                    >
                      {template?.icon && (
                        <template.icon className="h-6 w-6" style={{ color: template.color }} />
                      )}
                    </div>
                    <div>
                      <h2 className="text-lg font-semibold text-[#1e1f21]">{displayName}</h2>
                      <p className="text-xs text-muted-foreground">
                        {displaySections.length} sections · {displaySections.reduce((s, sec) => s + sec.tasks.length, 0)} tasks
                      </p>
                    </div>
                  </div>

                  {/* Status section */}
                  <div className="rounded-lg border p-4">
                    <div className="mb-3 flex items-center justify-between">
                      <h3 className="text-sm font-medium text-[#1e1f21]">What&apos;s the status?</h3>
                      <Badge variant="outline" className="text-xs">No status</Badge>
                    </div>
                    <Button variant="outline" size="sm" className="text-xs gap-1.5">
                      <Plus className="h-3 w-3" />
                      Set status
                    </Button>
                  </div>

                  {/* Key resources */}
                  <div className="rounded-lg border p-4">
                    <h3 className="mb-2 text-sm font-medium text-[#1e1f21]">Key resources</h3>
                    <p className="text-xs text-muted-foreground mb-3">
                      Align your team around a shared vision with a project brief and target milestones.
                    </p>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" className="text-xs gap-1.5">
                        <FileText className="h-3 w-3" />
                        Create project brief
                      </Button>
                      <Button variant="outline" size="sm" className="text-xs gap-1.5">
                        <Target className="h-3 w-3" />
                        Add milestones
                      </Button>
                    </div>
                  </div>

                  {/* Description */}
                  <div className="rounded-lg border p-4">
                    <h3 className="mb-2 text-sm font-medium text-[#1e1f21]">Description</h3>
                    <p className="text-sm text-muted-foreground">
                      {saved?.description || template?.description || "Add a description for this project..."}
                    </p>
                  </div>

                  {/* Workflow steps */}
                  {(template?.steps || []).length > 0 && (
                    <div className="rounded-lg border p-4">
                      <h3 className="mb-3 text-sm font-medium text-[#1e1f21]">Workflow</h3>
                      <div className="flex items-center gap-2">
                        {(template?.steps || []).map((step, i) => (
                          <div key={i} className="flex items-center gap-2">
                            <div className="flex items-center gap-1.5 rounded-full border px-3 py-1.5">
                              <div
                                className="h-2 w-2 rounded-full"
                                style={{ backgroundColor: template?.color || "#4573D2" }}
                              />
                              <span className="text-xs font-medium text-[#1e1f21]">{step}</span>
                            </div>
                            {i < (template?.steps || []).length - 1 && (
                              <ArrowRight className="h-3 w-3 text-muted-foreground" />
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {editSidebarTab === "content" && editActiveView === "List" && (
                <div>
                  {/* Sections and tasks */}
                  {displaySections.map((section, si) => (
                    <div key={si} className="mb-4">
                      {/* Section header */}
                      <div className="flex items-center gap-2 py-2">
                        <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                        <span
                          className="text-sm font-semibold"
                          style={{ color: template?.color || "#1e1f21" }}
                        >
                          {section.name}
                        </span>
                      </div>
                      {/* Tasks */}
                      {section.tasks.map((task, ti) => (
                        <div
                          key={ti}
                          className="flex items-center gap-3 border-b py-2 pl-7 hover:bg-muted/20"
                        >
                          <div className="h-4 w-4 rounded-full border-2 border-gray-300" />
                          <span className="flex-1 text-sm text-[#1e1f21]">
                            {task.name}
                          </span>
                          <div className="flex items-center gap-4 text-xs text-muted-foreground">
                            <span>Assignee...</span>
                            <span>Due...</span>
                          </div>
                        </div>
                      ))}
                      {/* Add task input */}
                      <div className="flex items-center gap-3 py-2 pl-7">
                        <Plus className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">
                          Add task...
                        </span>
                      </div>
                    </div>
                  ))}

                  {/* Add section */}
                  <button className="mt-2 flex items-center gap-2 rounded-md px-2 py-2 text-sm text-muted-foreground hover:bg-muted/30 hover:text-[#1e1f21]">
                    <Plus className="h-4 w-4" />
                    Add section
                  </button>
                </div>
              )}

              {editSidebarTab === "content" && editActiveView === "Board" && (
                <div className="flex gap-3 overflow-x-auto pb-4">
                  {displaySections.map((section, si) => (
                    <div
                      key={si}
                      className="w-[260px] shrink-0 rounded-lg border bg-[#f9f8f8] shadow-sm"
                    >
                      <div className="flex items-center justify-between px-3 py-2.5">
                        <div className="flex items-center gap-2">
                          <div
                            className="h-2 w-2 rounded-full"
                            style={{ backgroundColor: template?.color || "#4573D2" }}
                          />
                          <span className="text-xs font-semibold text-[#1e1f21]">
                            {section.name}
                          </span>
                          <span className="text-[10px] text-muted-foreground">
                            {section.tasks.length}
                          </span>
                        </div>
                        <button className="text-muted-foreground hover:text-[#1e1f21]">
                          <Plus className="h-3.5 w-3.5" />
                        </button>
                      </div>
                      <div className="space-y-2 px-2 pb-2">
                        {section.tasks.map((task, ti) => (
                          <div
                            key={ti}
                            className="rounded-lg border bg-white p-3 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
                          >
                            <p className="text-sm text-[#1e1f21] mb-2">{task.name}</p>
                            <div className="flex items-center justify-between">
                              <div className="flex gap-1">
                                {task.fields.map((f, fi) => (
                                  <span
                                    key={fi}
                                    className="rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground"
                                  >
                                    {f}
                                  </span>
                                ))}
                              </div>
                              <div className="h-5 w-5 rounded-full bg-gray-200" />
                            </div>
                          </div>
                        ))}
                        <button className="flex w-full items-center gap-1.5 rounded-lg border border-dashed px-3 py-2 text-xs text-muted-foreground hover:bg-white hover:text-[#1e1f21]">
                          <Plus className="h-3 w-3" />
                          Add task
                        </button>
                      </div>
                    </div>
                  ))}
                  <div className="w-[260px] shrink-0">
                    <button className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed py-8 text-xs text-muted-foreground hover:bg-muted/20 hover:text-[#1e1f21]">
                      <Plus className="h-3.5 w-3.5" />
                      Add section
                    </button>
                  </div>
                </div>
              )}

              {editSidebarTab === "content" && editActiveView === "Timeline" && (
                <div className="rounded-lg border bg-white shadow-sm">
                  <div className="flex items-center border-b">
                    <div className="w-[200px] shrink-0 border-r px-4 py-2 text-xs font-medium text-muted-foreground">
                      Task name
                    </div>
                    <div className="flex flex-1">
                      {["Week 1", "Week 2", "Week 3", "Week 4", "Week 5"].map((w, i) => (
                        <div
                          key={i}
                          className="flex-1 border-r px-2 py-2 text-center text-[10px] text-muted-foreground last:border-r-0"
                        >
                          {w}
                        </div>
                      ))}
                    </div>
                  </div>
                  {displaySections.map((section, si) => (
                    <div key={si}>
                      <div className="flex items-center border-b bg-[#f9f8f8]">
                        <div className="w-[200px] shrink-0 border-r px-4 py-2">
                          <span
                            className="text-xs font-semibold"
                            style={{ color: template?.color || "#1e1f21" }}
                          >
                            {section.name}
                          </span>
                        </div>
                        <div className="flex-1" />
                      </div>
                      {section.tasks.map((task, ti) => {
                        const startCol = (si + ti) % 4;
                        const barWidth = 1 + ((ti + si) % 3);
                        return (
                          <div
                            key={ti}
                            className="flex items-center border-b last:border-b-0 hover:bg-muted/10"
                          >
                            <div className="w-[200px] shrink-0 border-r px-4 py-2.5">
                              <div className="flex items-center gap-2">
                                <div className="h-3.5 w-3.5 rounded-full border-2 border-gray-300" />
                                <span className="text-xs text-[#1e1f21] truncate">{task.name}</span>
                              </div>
                            </div>
                            <div className="flex flex-1 items-center py-1.5">
                              {[0, 1, 2, 3, 4].map((col) => (
                                <div key={col} className="flex-1 border-r px-0.5 last:border-r-0">
                                  {col >= startCol && col < startCol + barWidth && (
                                    <div
                                      className="h-6 rounded"
                                      style={{
                                        backgroundColor: (template?.color || "#4573D2") + "40",
                                        borderLeft: col === startCol ? `3px solid ${template?.color || "#4573D2"}` : undefined,
                                      }}
                                    />
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </div>
              )}

              {editSidebarTab === "content" && editActiveView === "Dashboard" && (
                <div className="mx-auto max-w-3xl space-y-6">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-medium text-[#1e1f21]">Dashboard</h3>
                    <Button variant="outline" size="sm" className="text-xs gap-1.5">
                      <Plus className="h-3 w-3" />
                      Add chart
                    </Button>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    {/* Tasks by section chart */}
                    <div className="rounded-lg border p-4">
                      <h4 className="mb-3 text-xs font-medium text-[#1e1f21]">Tasks by section</h4>
                      <div className="space-y-2">
                        {displaySections.map((section, i) => {
                          const totalTasks = displaySections.reduce((s, sec) => s + sec.tasks.length, 0);
                          const pct = totalTasks > 0 ? (section.tasks.length / totalTasks) * 100 : 0;
                          return (
                            <div key={i} className="flex items-center gap-2">
                              <span className="w-24 truncate text-xs text-muted-foreground">{section.name}</span>
                              <div className="flex-1 h-5 rounded bg-muted overflow-hidden">
                                <div
                                  className="h-full rounded"
                                  style={{
                                    width: `${Math.max(pct, 4)}%`,
                                    backgroundColor: template?.color || "#4573D2",
                                  }}
                                />
                              </div>
                              <span className="w-6 text-right text-xs text-muted-foreground">{section.tasks.length}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Task completion chart */}
                    <div className="rounded-lg border p-4">
                      <h4 className="mb-3 text-xs font-medium text-[#1e1f21]">Completion status</h4>
                      <div className="flex items-center justify-center py-4">
                        <div className="relative h-32 w-32">
                          <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90">
                            <circle cx="50" cy="50" r="40" fill="none" stroke="#e5e7eb" strokeWidth="12" />
                            <circle
                              cx="50" cy="50" r="40" fill="none"
                              stroke={template?.color || "#4573D2"}
                              strokeWidth="12"
                              strokeDasharray={`${0} ${251.2}`}
                              strokeLinecap="round"
                            />
                          </svg>
                          <div className="absolute inset-0 flex flex-col items-center justify-center">
                            <span className="text-lg font-semibold text-[#1e1f21]">0%</span>
                            <span className="text-[10px] text-muted-foreground">complete</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex justify-center gap-4 text-xs">
                        <div className="flex items-center gap-1.5">
                          <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: template?.color || "#4573D2" }} />
                          <span className="text-muted-foreground">Complete (0)</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <div className="h-2.5 w-2.5 rounded-full bg-gray-200" />
                          <span className="text-muted-foreground">
                            Incomplete ({displaySections.reduce((s, sec) => s + sec.tasks.length, 0)})
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Tasks by priority */}
                    <div className="rounded-lg border p-4">
                      <h4 className="mb-3 text-xs font-medium text-[#1e1f21]">Tasks by priority</h4>
                      <div className="space-y-2">
                        {[
                          { label: "High", color: "#E8384F", count: displaySections.reduce((s, sec) => s + sec.tasks.filter(t => t.fields.includes("High")).length, 0) },
                          { label: "Medium", color: "#FD9A00", count: displaySections.reduce((s, sec) => s + sec.tasks.filter(t => t.fields.includes("Medium")).length, 0) },
                          { label: "Low", color: "#7BC86C", count: displaySections.reduce((s, sec) => s + sec.tasks.filter(t => t.fields.includes("Low")).length, 0) },
                        ].map((p) => (
                          <div key={p.label} className="flex items-center gap-2">
                            <span className="w-16 text-xs text-muted-foreground">{p.label}</span>
                            <div className="flex-1 h-5 rounded bg-muted overflow-hidden">
                              <div
                                className="h-full rounded"
                                style={{ width: `${Math.max(p.count * 20, 4)}%`, backgroundColor: p.color }}
                              />
                            </div>
                            <span className="w-6 text-right text-xs text-muted-foreground">{p.count}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Upcoming tasks */}
                    <div className="rounded-lg border p-4">
                      <h4 className="mb-3 text-xs font-medium text-[#1e1f21]">Upcoming tasks</h4>
                      <div className="flex flex-col items-center justify-center py-6 text-center">
                        <Calendar className="mb-2 h-8 w-8 text-muted-foreground/30" />
                        <p className="text-xs text-muted-foreground">No upcoming deadlines</p>
                        <p className="text-[10px] text-muted-foreground/70">
                          Add due dates to tasks to see them here
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {editSidebarTab === "content" && editActiveView === "Calendar" && (
                <div className="mx-auto max-w-3xl">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-medium text-[#1e1f21]">February 2026</h3>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="icon" className="h-7 w-7">
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm" className="h-7 text-xs">Today</Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7">
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <div className="rounded-lg border bg-white">
                    {/* Day headers */}
                    <div className="grid grid-cols-7 border-b">
                      {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
                        <div key={day} className="border-r px-2 py-2 text-center text-xs font-medium text-muted-foreground last:border-r-0">
                          {day}
                        </div>
                      ))}
                    </div>
                    {/* Calendar grid - 5 weeks */}
                    {Array.from({ length: 5 }).map((_, weekIdx) => (
                      <div key={weekIdx} className="grid grid-cols-7 border-b last:border-b-0">
                        {Array.from({ length: 7 }).map((_, dayIdx) => {
                          const dayNum = weekIdx * 7 + dayIdx - 0; // Feb 2026 starts on Sunday
                          const date = dayNum + 1;
                          const isCurrentMonth = date >= 1 && date <= 28;
                          return (
                            <div
                              key={dayIdx}
                              className="min-h-[80px] border-r p-1 last:border-r-0"
                            >
                              {isCurrentMonth && (
                                <>
                                  <span className={`inline-flex h-5 w-5 items-center justify-center rounded-full text-[10px] ${
                                    date === 17 ? "bg-[#4573D2] text-white" : "text-muted-foreground"
                                  }`}>
                                    {date}
                                  </span>
                                </>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    ))}
                  </div>
                  <p className="mt-3 text-center text-xs text-muted-foreground">
                    Tasks with due dates will appear on the calendar. Add due dates to your template tasks to see them here.
                  </p>
                </div>
              )}

              {editSidebarTab === "content" && editActiveView === "Workflow" && (
                <div className="mx-auto max-w-3xl space-y-6">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-medium text-[#1e1f21]">Workflow</h3>
                    <Button variant="outline" size="sm" className="text-xs gap-1.5">
                      <Plus className="h-3 w-3" />
                      Add rule
                    </Button>
                  </div>

                  {/* Workflow steps visualization */}
                  <div className="rounded-lg border p-6">
                    <p className="mb-4 text-xs text-muted-foreground">
                      Define the stages tasks move through in this project.
                    </p>
                    <div className="space-y-3">
                      {displaySections.map((section, i) => (
                        <div key={i} className="flex items-center gap-3">
                          <div className="flex items-center gap-2 rounded-lg border px-4 py-3 flex-1">
                            <div
                              className="h-3 w-3 rounded-full"
                              style={{ backgroundColor: template?.color || "#4573D2" }}
                            />
                            <span className="text-sm font-medium text-[#1e1f21]">{section.name}</span>
                            <span className="ml-auto text-xs text-muted-foreground">{section.tasks.length} tasks</span>
                          </div>
                          {i < displaySections.length - 1 && (
                            <div className="flex flex-col items-center">
                              <ArrowRight className="h-4 w-4 text-muted-foreground rotate-90" />
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Rules section */}
                  <div className="rounded-lg border p-4">
                    <h4 className="mb-2 text-xs font-medium text-[#1e1f21]">Automation rules</h4>
                    <div className="flex flex-col items-center justify-center py-6 text-center">
                      <Zap className="mb-2 h-8 w-8 text-muted-foreground/30" />
                      <p className="text-xs text-muted-foreground">No automation rules configured</p>
                      <p className="text-[10px] text-muted-foreground/70 mb-3">
                        Add rules to automate task assignments, status changes, and more
                      </p>
                      <Button variant="outline" size="sm" className="text-xs gap-1.5">
                        <Plus className="h-3 w-3" />
                        Add rule
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {editSidebarTab === "content" && editActiveView === "Messages" && (
                <div className="mx-auto max-w-2xl space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-medium text-[#1e1f21]">Messages</h3>
                    <Button variant="outline" size="sm" className="text-xs gap-1.5">
                      <Plus className="h-3 w-3" />
                      Send message to project
                    </Button>
                  </div>
                  <div className="flex flex-col items-center justify-center rounded-lg border py-16 text-center">
                    <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-muted">
                      <MessageSquare className="h-7 w-7 text-muted-foreground/50" />
                    </div>
                    <h4 className="mb-1 text-sm font-medium text-[#1e1f21]">
                      Send messages to your project team
                    </h4>
                    <p className="mb-4 max-w-sm text-xs text-muted-foreground">
                      Connect and communicate with your team right here. Discuss project updates, share ideas, and keep everyone aligned.
                    </p>
                    <Button className="gap-1.5 bg-[#4573D2] hover:bg-[#3A63B8] text-xs">
                      <MessageSquare className="h-3.5 w-3.5" />
                      Send a message
                    </Button>
                  </div>
                </div>
              )}

              {editSidebarTab === "content" && editActiveView === "Files" && (
                <div className="mx-auto max-w-2xl space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-medium text-[#1e1f21]">Files</h3>
                    <Button variant="outline" size="sm" className="text-xs gap-1.5">
                      <Plus className="h-3 w-3" />
                      Attach file
                    </Button>
                  </div>
                  <div className="flex flex-col items-center justify-center rounded-lg border py-16 text-center">
                    <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-muted">
                      <FolderOpen className="h-7 w-7 text-muted-foreground/50" />
                    </div>
                    <h4 className="mb-1 text-sm font-medium text-[#1e1f21]">
                      Keep project files organized
                    </h4>
                    <p className="mb-4 max-w-sm text-xs text-muted-foreground">
                      Attach files to your project for easy access. Files attached to tasks in this project will also appear here.
                    </p>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" className="gap-1.5 text-xs">
                        <Plus className="h-3 w-3" />
                        Attach from computer
                      </Button>
                      <Button variant="outline" size="sm" className="gap-1.5 text-xs">
                        <Globe className="h-3 w-3" />
                        Attach from URL
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Project Members Dialog */}
        <Dialog open={membersDialogOpen} onOpenChange={setMembersDialogOpen}>
          <DialogContent className="sm:max-w-[460px]">
            <DialogHeader>
              <DialogTitle className="text-base">Project members</DialogTitle>
            </DialogHeader>

            {/* Add members */}
            <div className="space-y-3">
              <Label className="text-xs font-medium">Add members</Label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Input
                    placeholder="Add people or teams by name..."
                    value={memberSearch}
                    onChange={(e) => setMemberSearch(e.target.value)}
                    className="text-sm"
                  />
                </div>
                <Select value={memberRole} onValueChange={setMemberRole}>
                  <SelectTrigger className="w-[100px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Editor">Editor</SelectItem>
                    <SelectItem value="Commenter">Commenter</SelectItem>
                    <SelectItem value="Viewer">Viewer</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <p className="text-[11px] text-muted-foreground">
                These are the people who will always be added as project members when a project is created from this template.
              </p>
            </div>

            {/* Visibility */}
            <div className="space-y-2 pt-2">
              <Label className="text-xs font-medium">Visibility</Label>
              <Select value={memberVisibility} onValueChange={setMemberVisibility}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="workspace">
                    <div className="flex items-center gap-2">
                      <Globe className="h-3.5 w-3.5 text-muted-foreground" />
                      My workspace
                    </div>
                  </SelectItem>
                  <SelectItem value="private">
                    <div className="flex items-center gap-2">
                      <Lock className="h-3.5 w-3.5 text-muted-foreground" />
                      Private to members
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* People with access */}
            <div className="space-y-2 pt-2">
              <Label className="text-xs font-medium">People with access</Label>
              <div className="space-y-2">
                <div className="flex items-center justify-between rounded-md px-1 py-1.5">
                  <div className="flex items-center gap-2.5">
                    <Avatar className="h-7 w-7">
                      <AvatarFallback className="bg-[#4573D2] text-[10px] text-white">
                        SG
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-sm font-medium text-[#1e1f21]">
                        You
                      </p>
                    </div>
                  </div>
                  <Select defaultValue="editor">
                    <SelectTrigger className="h-7 w-[90px] text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="editor">Editor</SelectItem>
                      <SelectItem value="commenter">Commenter</SelectItem>
                      <SelectItem value="viewer">Viewer</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Use Template Dialog */}
        {renderUseTemplateDialog()}
      </div>
    );
  }

  // ── Gallery View (default) ────────────────────────────────────────
  function renderUseTemplateDialog() {
    const template = activePreviewTemplate;
    const sections = template?.sections || [];
    const totalTasks = sections.reduce(
      (sum, s) => sum + s.tasks.length,
      0
    );

    return (
      <Dialog
        open={useTemplateDialogOpen}
        onOpenChange={setUseTemplateDialogOpen}
      >
        <DialogContent className="sm:max-w-[820px] p-0 overflow-hidden">
          <div className="flex">
            {/* Left side - Form */}
            <div className="w-[380px] shrink-0 p-6">
              <DialogHeader className="mb-5">
                <div className="mb-1 flex items-center gap-2 text-xs text-muted-foreground">
                  {template && (
                    <div
                      className="flex h-5 w-5 items-center justify-center rounded"
                      style={{
                        backgroundColor: (template.color || "#4573D2") + "20",
                      }}
                    >
                      <template.icon
                        className="h-3 w-3"
                        style={{ color: template.color }}
                      />
                    </div>
                  )}
                  <span>{template?.name || detailSavedTemplate?.name || "New project"}</span>
                </div>
                <DialogTitle className="text-lg">New project</DialogTitle>
              </DialogHeader>

              <div className="space-y-4">
                {/* Project name */}
                <div className="space-y-1.5">
                  <Label
                    htmlFor="new-proj-name"
                    className="text-xs font-medium"
                  >
                    Project name
                  </Label>
                  <Input
                    id="new-proj-name"
                    value={newProjectName}
                    onChange={(e) => setNewProjectName(e.target.value)}
                    placeholder="Enter project name"
                    autoFocus
                  />
                </div>

                {/* Privacy */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Privacy</Label>
                  <Select
                    value={newProjectPrivacy}
                    onValueChange={(val) =>
                      setNewProjectPrivacy(
                        val as "workspace" | "private"
                      )
                    }
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="workspace">
                        <div className="flex items-center gap-2">
                          <Globe className="h-3.5 w-3.5 text-muted-foreground" />
                          <div>
                            <span className="font-medium">My workspace</span>
                            <p className="text-[11px] text-muted-foreground">
                              Any team member can find and access this project
                            </p>
                          </div>
                        </div>
                      </SelectItem>
                      <SelectItem value="private">
                        <div className="flex items-center gap-2">
                          <Lock className="h-3.5 w-3.5 text-muted-foreground" />
                          <div>
                            <span className="font-medium">
                              Private to members
                            </span>
                            <p className="text-[11px] text-muted-foreground">
                              Only team members can find and access this
                              project
                            </p>
                          </div>
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Section count badge */}
                {template && (
                  <div className="flex items-center gap-2">
                    <Badge
                      variant="secondary"
                      className="gap-1 text-xs"
                    >
                      <Layers className="h-3 w-3" />
                      {template.steps.length} sections
                    </Badge>
                    <Badge
                      variant="secondary"
                      className="gap-1 text-xs"
                    >
                      {totalTasks} tasks
                    </Badge>
                  </div>
                )}

                {/* Create project button */}
                <Button
                  className="w-full bg-[#4573D2] hover:bg-[#3A63B8]"
                  onClick={handleCreateFromTemplate}
                  disabled={
                    !newProjectName.trim() ||
                    createProject.isPending ||
                    createFromTemplate.isPending
                  }
                >
                  {createProject.isPending || createFromTemplate.isPending
                    ? "Creating..."
                    : "Create project"}
                </Button>
              </div>
            </div>

            {/* Right side - Preview */}
            <div className="flex-1 border-l bg-[#f9f8f8] p-4 overflow-y-auto max-h-[500px]">
              {/* View tabs */}
              {template && (
                <div className="mb-3 flex items-center gap-1 rounded-lg border bg-white p-1">
                  <button className="rounded-md px-2.5 py-1 text-[11px] font-medium text-muted-foreground hover:bg-muted">
                    Overview
                  </button>
                  <button className="rounded-md bg-muted px-2.5 py-1 text-[11px] font-medium text-[#1e1f21]">
                    List
                  </button>
                  <button className="rounded-md px-2.5 py-1 text-[11px] font-medium text-muted-foreground hover:bg-muted">
                    Board
                  </button>
                  <button className="rounded-md px-2.5 py-1 text-[11px] font-medium text-muted-foreground hover:bg-muted">
                    Timeline
                  </button>
                  <button className="rounded-md px-2.5 py-1 text-[11px] font-medium text-muted-foreground hover:bg-muted">
                    Calendar
                  </button>
                  <button className="rounded-md px-2.5 py-1 text-[11px] font-medium text-muted-foreground hover:bg-muted">
                    Workflow
                  </button>
                </div>
              )}

              {/* Preview list */}
              <div className="rounded-lg border bg-white shadow-sm">
                <div className="flex items-center border-b px-3 py-1.5 text-[10px] font-medium text-muted-foreground">
                  <div className="flex-1">Task name</div>
                  <div className="w-16 text-center">Assignee</div>
                  <div className="w-16 text-center">Due date</div>
                </div>
                {(template?.sections || []).map((section, si) => (
                  <div key={si}>
                    <div className="flex items-center gap-1.5 border-b bg-[#f9f8f8] px-3 py-1.5">
                      <ChevronDown className="h-2.5 w-2.5 text-muted-foreground" />
                      <span
                        className="text-[10px] font-semibold"
                        style={{
                          color: template?.color || "#1e1f21",
                        }}
                      >
                        {section.name}
                      </span>
                    </div>
                    {section.tasks.map((task, ti) => (
                      <div
                        key={ti}
                        className="flex items-center border-b px-3 py-1.5 last:border-b-0"
                      >
                        <div className="flex flex-1 items-center gap-1.5">
                          <div className="h-3 w-3 rounded-full border border-gray-300" />
                          <span className="text-[11px] text-[#1e1f21]">
                            {task.name}
                          </span>
                        </div>
                        <div className="flex w-16 justify-center">
                          <div className="h-4 w-4 rounded-full bg-gray-200" />
                        </div>
                        <div className="w-16 text-center text-[10px] text-muted-foreground">
                          —
                        </div>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <div className="h-full overflow-auto bg-white">
      {/* ── Header Bar ─────────────────────────────────────────────── */}
      <div className="flex h-14 items-center justify-between border-b px-6">
        <div className="flex items-center gap-2">
          <GitBranch className="h-5 w-5 text-[#4573D2]" />
          <h1 className="text-lg font-medium text-[#1e1f21]">Workflows</h1>
        </div>
      </div>

      <div className="p-6">
        {/* ── Create with AI Section ──────────────────────────────── */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-[#4573D2] to-purple-500">
              <Sparkles className="h-4 w-4 text-white" />
            </div>
            <h2 className="text-base font-semibold text-[#1e1f21]">
              Create with AI
            </h2>
          </div>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Input
                className="h-10 pl-4 pr-10 text-sm"
                placeholder="Briefly describe the work you want to manage"
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAiCreate()}
              />
            </div>
            <Button
              className="h-10 gap-1.5 bg-[#1e1f21] hover:bg-[#2e2f31]"
              onClick={handleAiCreate}
              disabled={!aiPrompt.trim()}
            >
              <Sparkles className="h-3.5 w-3.5" />
              Generate
            </Button>
          </div>
        </div>

        {/* ── Filter Tags ────────────────────────────────────────── */}
        <div className="mb-6 flex flex-wrap items-center gap-2">
          {FILTER_TAGS.map((tag) => (
            <button
              key={tag}
              onClick={() =>
                setActiveFilterTag(
                  activeFilterTag === tag ? null : tag
                )
              }
              className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                activeFilterTag === tag
                  ? "border-[#4573D2] bg-[#4573D2]/10 text-[#4573D2]"
                  : "border-gray-200 text-muted-foreground hover:border-gray-300 hover:bg-muted/30"
              }`}
            >
              {tag}
            </button>
          ))}
        </div>

        {/* ── Search ─────────────────────────────────────────────── */}
        {activeFilterTag && (
          <div className="mb-6">
            <div className="relative max-w-md">
              <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="pl-9"
                placeholder="Search templates..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
        )}

        {/* ── Filtered Gallery Templates ─────────────────────────── */}
        {activeFilterTag && (
          <div className="mb-8">
            <h2 className="mb-4 text-base font-semibold text-[#1e1f21]">
              {activeFilterTag}
            </h2>
            {filteredTemplates.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-12">
                <Search className="mb-3 h-8 w-8 text-muted-foreground/40" />
                <p className="text-sm font-medium text-muted-foreground">
                  No templates found
                </p>
                <p className="text-xs text-muted-foreground/70">
                  Try adjusting your search or filter
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {filteredTemplates.map((template) => (
                  <button
                    key={template.id}
                    className="flex items-start gap-3 rounded-lg border bg-white p-4 text-left transition-all hover:border-[#4573D2] hover:shadow-md"
                    onClick={() => openTemplateDetail(template)}
                  >
                    <div
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg"
                      style={{
                        backgroundColor: template.color + "20",
                      }}
                    >
                      <template.icon
                        className="h-5 w-5"
                        style={{ color: template.color }}
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-[#1e1f21]">
                        {template.name}
                      </p>
                      <p className="mt-0.5 text-xs text-muted-foreground line-clamp-2">
                        {template.description}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Your Workflows Section ─────────────────────────────── */}
        <div className="mb-8">
          <h2 className="mb-4 text-base font-semibold text-[#1e1f21]">
            Your workflows
          </h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {/* Saved templates */}
            {savedTemplates?.map((tpl) => {
              const daysAgo = Math.floor(
                (Date.now() -
                  new Date(
                    tpl.createdAt
                  ).getTime()) /
                  (1000 * 60 * 60 * 24)
              );
              return (
                <div
                  key={tpl.id}
                  className="group relative cursor-pointer rounded-lg border bg-white transition-all hover:border-[#4573D2] hover:shadow-md"
                  onClick={() => openSavedTemplateDetail(tpl)}
                >
                  {/* Thumbnail preview area */}
                  <div className="h-32 rounded-t-lg bg-gradient-to-br from-[#4573D2]/5 to-purple-50 p-3">
                    <div className="space-y-1">
                      {["Task 1", "Task 2", "Task 3"].map(
                        (t, i) => (
                          <div
                            key={i}
                            className="flex items-center gap-1.5"
                          >
                            <div className="h-2.5 w-2.5 rounded-full border border-gray-300" />
                            <div className="h-2 flex-1 rounded bg-gray-200/60" />
                            <div className="h-2 w-8 rounded bg-gray-200/40" />
                          </div>
                        )
                      )}
                    </div>
                  </div>

                  {/* Template info */}
                  <div className="p-3">
                    <p className="text-sm font-medium text-[#1e1f21]">
                      {tpl.name}
                    </p>
                    {tpl.description && (
                      <p className="mt-0.5 text-xs text-muted-foreground line-clamp-1">
                        {tpl.description}
                      </p>
                    )}
                    <p className="mt-1 text-[10px] text-muted-foreground">
                      Used {daysAgo} day{daysAgo !== 1 ? "s" : ""}{" "}
                      ago
                    </p>
                  </div>

                  {/* Context menu */}
                  <div
                    className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button className="flex h-7 w-7 items-center justify-center rounded-md bg-white/90 shadow-sm hover:bg-white">
                          <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() => {
                            openUseTemplateDialog(null, tpl);
                          }}
                        >
                          <Zap className="mr-2 h-3.5 w-3.5" />
                          Use template
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={() =>
                            deleteTemplate.mutate({
                              id: tpl.id,
                            })
                          }
                        >
                          <Trash2 className="mr-2 h-3.5 w-3.5" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              );
            })}

            {/* Start something new card */}
            <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-200 bg-white p-6 transition-colors hover:border-gray-300">
              <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                <Plus className="h-6 w-6 text-muted-foreground" />
              </div>
              <p className="mb-1 text-sm font-medium text-[#1e1f21]">
                Start something new
              </p>
              <Button
                variant="outline"
                size="sm"
                className="mt-2 gap-1.5 text-xs"
                onClick={() => {
                  setActivePreviewTemplate(null);
                  setNewProjectName("");
                  setNewProjectPrivacy("workspace");
                  setUseTemplateDialogOpen(true);
                }}
              >
                <Plus className="h-3 w-3" />
                Create blank project
              </Button>
            </div>
          </div>
        </div>

        {/* ── All Gallery Templates (when no filter active) ──────── */}
        {!activeFilterTag && (
          <div>
            <h2 className="mb-4 text-base font-semibold text-[#1e1f21]">
              Browse all templates
            </h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {WORKFLOW_TEMPLATES.map((template) => (
                <button
                  key={template.id}
                  className="flex items-start gap-3 rounded-lg border bg-white p-4 text-left transition-all hover:border-[#4573D2] hover:shadow-md"
                  onClick={() => openTemplateDetail(template)}
                >
                  <div
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg"
                    style={{
                      backgroundColor: template.color + "20",
                    }}
                  >
                    <template.icon
                      className="h-5 w-5"
                      style={{ color: template.color }}
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-[#1e1f21]">
                      {template.name}
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground line-clamp-2">
                      {template.description}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-1">
                      {template.steps.slice(0, 3).map((step, i) => (
                        <span
                          key={i}
                          className="rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground"
                        >
                          {step}
                        </span>
                      ))}
                      {template.steps.length > 3 && (
                        <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
                          +{template.steps.length - 3}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Use Template Dialog */}
      {renderUseTemplateDialog()}
    </div>
  );
}
