"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
} from "lucide-react";

const WORKFLOW_TEMPLATES = [
  {
    id: "bug-tracking",
    name: "Bug Tracking",
    description: "Track and resolve bugs with a structured workflow",
    icon: AlertTriangle,
    color: "#E8384F",
    steps: ["Reported", "Triaged", "In Progress", "In Review", "Resolved"],
  },
  {
    id: "content-creation",
    name: "Content Creation",
    description: "Manage content from ideation to publication",
    icon: FileText,
    color: "#4573D2",
    steps: ["Ideation", "Drafting", "Review", "Editing", "Published"],
  },
  {
    id: "onboarding",
    name: "Employee Onboarding",
    description: "Streamline new employee onboarding process",
    icon: Users,
    color: "#7BC86C",
    steps: ["Pre-boarding", "Day 1", "Week 1", "Month 1", "Complete"],
  },
  {
    id: "sprint",
    name: "Sprint Planning",
    description: "Agile sprint workflow with planning and retrospective",
    icon: Repeat,
    color: "#FD9A00",
    steps: ["Backlog", "Sprint Planning", "In Progress", "Review", "Done"],
  },
  {
    id: "approvals",
    name: "Approval Workflow",
    description: "Route tasks through approval chains",
    icon: CheckCircle2,
    color: "#4573D2",
    steps: ["Draft", "Submitted", "Under Review", "Approved", "Implemented"],
  },
  {
    id: "event-planning",
    name: "Event Planning",
    description: "Plan and execute events from start to finish",
    icon: Clock,
    color: "#9B59B6",
    steps: ["Planning", "Logistics", "Promotion", "Execution", "Post-event"],
  },
];

export default function WorkflowsPage() {
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);

  return (
    <div className="h-full">
      <div className="flex h-14 items-center justify-between border-b bg-white px-6">
        <div className="flex items-center gap-2">
          <GitBranch className="h-5 w-5 text-[#4573D2]" />
          <h1 className="text-lg font-medium text-[#1e1f21]">Workflows</h1>
        </div>
        <Button
          size="sm"
          className="gap-1.5 bg-[#4573D2] hover:bg-[#3A63B8]"
          onClick={() => toast.info("Custom workflow builder coming soon")}
        >
          <Plus className="h-3.5 w-3.5" />
          Create workflow
        </Button>
      </div>

      <div className="p-6">
        {/* Automation Rules */}
        <div className="mb-8">
          <h2 className="mb-1 text-base font-medium text-[#1e1f21]">Automation Rules</h2>
          <p className="mb-4 text-sm text-muted-foreground">
            Automate repetitive work with rules that trigger actions
          </p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {[
              { label: "When task completed → notify team", trigger: "Task completed", action: "Send notification" },
              { label: "When due date passed → mark overdue", trigger: "Due date passed", action: "Change status" },
              { label: "When task created → assign reviewer", trigger: "Task created", action: "Set assignee" },
            ].map((rule, i) => (
              <Card key={i} className="border shadow-sm cursor-pointer hover:border-[#4573D2] transition-colors" onClick={() => toast.success(`Rule "${rule.label}" activated`)}>
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

        {/* Workflow Templates */}
        <h2 className="mb-1 text-base font-medium text-[#1e1f21]">Workflow Templates</h2>
        <p className="mb-4 text-sm text-muted-foreground">
          Start with a template and customize it for your team
        </p>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {WORKFLOW_TEMPLATES.map((template) => (
            <Card
              key={template.id}
              className={`border shadow-sm cursor-pointer transition-all hover:shadow-md ${selectedTemplate === template.id ? "ring-2 ring-[#4573D2]" : ""}`}
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
                  <div>
                    <CardTitle className="text-sm font-semibold">{template.name}</CardTitle>
                    <p className="text-xs text-muted-foreground">{template.description}</p>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-1">
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
      </div>
    </div>
  );
}
