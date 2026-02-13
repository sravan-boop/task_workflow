import Link from "next/link";
import {
  ArrowRight,
  CheckCircle2,
  BarChart3,
  Users,
  Sparkles,
  Zap,
  Shield,
  Layout,
  Calendar,
  Target,
} from "lucide-react";

const features = [
  {
    icon: Layout,
    title: "Multiple Views",
    description:
      "List, Board, Timeline, and Calendar views to manage work the way you prefer.",
  },
  {
    icon: Sparkles,
    title: "AI-Powered",
    description:
      "Intelligent task creation, automatic summaries, and smart project status generation.",
  },
  {
    icon: Users,
    title: "Team Collaboration",
    description:
      "Comments, @mentions, real-time updates, and shared project visibility.",
  },
  {
    icon: Target,
    title: "Goals & OKRs",
    description:
      "Align your work to strategic objectives with hierarchical goals and progress tracking.",
  },
  {
    icon: BarChart3,
    title: "Portfolios & Reporting",
    description:
      "Bird's-eye view of all projects with status dashboards and health metrics.",
  },
  {
    icon: Zap,
    title: "Drag & Drop",
    description:
      "Intuitive Kanban boards with drag-and-drop cards across sections and statuses.",
  },
];

const stats = [
  { label: "Project Views", value: "5" },
  { label: "AI Features", value: "6" },
  { label: "Built-in Pages", value: "14" },
  { label: "API Endpoints", value: "60+" },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Nav */}
      <nav className="border-b">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <div className="flex items-center gap-2">
            <svg
              width="110"
              height="28"
              viewBox="0 0 110 28"
              fill="none"
            >
              <circle cx="14" cy="7" r="5.5" fill="#F06A6A" />
              <circle cx="6" cy="21" r="5.5" fill="#F06A6A" />
              <circle cx="22" cy="21" r="5.5" fill="#F06A6A" />
              <text
                x="32"
                y="21"
                fontFamily="system-ui"
                fontSize="17"
                fontWeight="700"
                fill="#1e1f21"
              >
                TaskFlow
              </text>
            </svg>
            <span className="rounded-full bg-gradient-to-r from-blue-500 to-purple-500 px-2 py-0.5 text-[10px] font-semibold text-white">
              AI
            </span>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="text-sm font-medium text-gray-600 transition-colors hover:text-gray-900"
            >
              Log in
            </Link>
            <Link
              href="/register"
              className="rounded-lg bg-[#1e1f21] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#2e2f31]"
            >
              Get started free
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-blue-50/50 to-white" />
        <div className="relative mx-auto max-w-6xl px-6 pb-20 pt-24 text-center">
          <div className="mx-auto mb-6 inline-flex items-center gap-2 rounded-full border bg-white px-4 py-1.5 text-sm text-gray-600 shadow-sm">
            <Sparkles className="h-4 w-4 text-[#4573D2]" />
            Now with AI-powered project management
          </div>
          <h1 className="mx-auto max-w-4xl text-5xl font-bold leading-tight tracking-tight text-[#1e1f21] sm:text-6xl">
            Manage work with
            <span className="bg-gradient-to-r from-[#F06A6A] to-[#4573D2] bg-clip-text text-transparent">
              {" "}
              clarity{" "}
            </span>
            and
            <span className="bg-gradient-to-r from-[#4573D2] to-[#7B68EE] bg-clip-text text-transparent">
              {" "}
              intelligence
            </span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-gray-600">
            TaskFlow AI helps teams organize, track, and manage their work.
            From daily tasks to strategic goals, with AI features that save
            hours every week.
          </p>
          <div className="mt-10 flex items-center justify-center gap-4">
            <Link
              href="/register"
              className="inline-flex items-center gap-2 rounded-lg bg-[#4573D2] px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-500/25 transition-all hover:bg-[#3A63B8] hover:shadow-blue-500/40"
            >
              Start for free
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/login"
              className="inline-flex items-center gap-2 rounded-lg border bg-white px-6 py-3 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50"
            >
              View demo
            </Link>
          </div>

          {/* App Preview */}
          <div className="mx-auto mt-16 max-w-5xl overflow-hidden rounded-xl border bg-white shadow-2xl shadow-gray-200/60">
            <div className="flex h-10 items-center gap-2 border-b bg-gray-50 px-4">
              <div className="h-3 w-3 rounded-full bg-[#FF5F57]" />
              <div className="h-3 w-3 rounded-full bg-[#FEBC2E]" />
              <div className="h-3 w-3 rounded-full bg-[#28C840]" />
              <span className="ml-3 text-xs text-gray-400">
                app.taskflow.ai
              </span>
            </div>
            <div className="flex">
              {/* Sidebar preview */}
              <div className="w-60 border-r bg-[#1e1f21] p-4">
                <div className="space-y-1">
                  {["Home", "My Tasks", "Inbox"].map((item) => (
                    <div
                      key={item}
                      className="rounded-md px-3 py-1.5 text-sm text-gray-400"
                    >
                      {item}
                    </div>
                  ))}
                  <div className="rounded-md bg-white/10 px-3 py-1.5 text-sm font-medium text-white">
                    Website Redesign
                  </div>
                  {["Mobile App", "Marketing"].map((item) => (
                    <div
                      key={item}
                      className="rounded-md px-3 py-1.5 text-sm text-gray-400"
                    >
                      {item}
                    </div>
                  ))}
                </div>
              </div>
              {/* Main content preview */}
              <div className="flex-1 p-6">
                <div className="mb-4 flex items-center justify-between">
                  <div className="text-lg font-semibold text-[#1e1f21]">
                    Website Redesign
                  </div>
                  <div className="flex gap-2">
                    {["List", "Board", "Timeline", "Calendar"].map(
                      (view) => (
                        <span
                          key={view}
                          className={`rounded-md px-3 py-1 text-xs ${
                            view === "Board"
                              ? "bg-[#4573D2] text-white"
                              : "bg-gray-100 text-gray-600"
                          }`}
                        >
                          {view}
                        </span>
                      )
                    )}
                  </div>
                </div>
                {/* Board columns preview */}
                <div className="grid grid-cols-3 gap-4">
                  {[
                    {
                      name: "To Do",
                      tasks: [
                        "Design homepage mockup",
                        "Setup CI/CD pipeline",
                      ],
                    },
                    {
                      name: "In Progress",
                      tasks: [
                        "Implement auth flow",
                        "Build component library",
                      ],
                    },
                    {
                      name: "Done",
                      tasks: [
                        "Create wireframes",
                        "Set up database",
                      ],
                    },
                  ].map((col) => (
                    <div key={col.name} className="space-y-2">
                      <div className="text-xs font-semibold uppercase text-gray-500">
                        {col.name}
                      </div>
                      {col.tasks.map((task) => (
                        <div
                          key={task}
                          className="rounded-lg border bg-white p-3 text-sm text-gray-700 shadow-sm"
                        >
                          {task}
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="border-y bg-gray-50/50">
        <div className="mx-auto grid max-w-4xl grid-cols-4 gap-8 px-6 py-12">
          {stats.map((stat) => (
            <div key={stat.label} className="text-center">
              <div className="text-3xl font-bold text-[#1e1f21]">
                {stat.value}
              </div>
              <div className="mt-1 text-sm text-gray-500">{stat.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-6xl px-6 py-24">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-[#1e1f21]">
            Everything you need to manage projects
          </h2>
          <p className="mt-3 text-gray-600">
            Powerful features designed for modern teams
          </p>
        </div>
        <div className="mt-16 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature) => (
            <div
              key={feature.title}
              className="group rounded-xl border p-6 transition-all hover:border-[#4573D2]/30 hover:shadow-lg hover:shadow-blue-500/5"
            >
              <div className="mb-4 inline-flex rounded-lg bg-[#4573D2]/10 p-2.5">
                <feature.icon className="h-5 w-5 text-[#4573D2]" />
              </div>
              <h3 className="text-lg font-semibold text-[#1e1f21]">
                {feature.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-gray-600">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* AI Section */}
      <section className="bg-gradient-to-b from-[#1e1f21] to-[#2a2b2d]">
        <div className="mx-auto max-w-6xl px-6 py-24">
          <div className="text-center">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-1.5 text-sm text-white/80">
              <Sparkles className="h-4 w-4 text-[#4573D2]" />
              Powered by Claude AI
            </div>
            <h2 className="text-3xl font-bold text-white">
              AI that actually helps you work
            </h2>
            <p className="mx-auto mt-3 max-w-lg text-gray-400">
              Built-in AI features that understand your projects and save you
              time every day.
            </p>
          </div>
          <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[
              {
                title: "Natural Language Tasks",
                desc: 'Just type "Schedule design review Friday" and AI creates a structured task.',
              },
              {
                title: "Smart Summaries",
                desc: "Get instant AI summaries of tasks, including subtasks, comments, and progress.",
              },
              {
                title: "Project Status Reports",
                desc: "One-click AI-generated status reports analyzing completion rates and blockers.",
              },
              {
                title: "AI Chat Assistant",
                desc: "Ask questions about your projects and get intelligent, context-aware answers.",
              },
              {
                title: "Priority Suggestions",
                desc: "AI analyzes your tasks and suggests optimal prioritization based on due dates.",
              },
              {
                title: "Semantic Search",
                desc: "Find anything across tasks and projects with intelligent, context-aware search.",
              },
            ].map((item) => (
              <div
                key={item.title}
                className="rounded-xl border border-white/10 bg-white/5 p-6 backdrop-blur"
              >
                <h3 className="font-semibold text-white">{item.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-gray-400">
                  {item.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-6xl px-6 py-24 text-center">
        <h2 className="text-3xl font-bold text-[#1e1f21]">
          Ready to get started?
        </h2>
        <p className="mx-auto mt-3 max-w-lg text-gray-600">
          Join teams who use TaskFlow AI to collaborate more effectively and
          ship projects faster.
        </p>
        <div className="mt-8">
          <Link
            href="/register"
            className="inline-flex items-center gap-2 rounded-lg bg-[#4573D2] px-8 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-500/25 transition-all hover:bg-[#3A63B8] hover:shadow-blue-500/40"
          >
            Get started for free
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-8">
          <div className="flex items-center gap-2">
            <svg
              width="90"
              height="22"
              viewBox="0 0 90 22"
              fill="none"
            >
              <circle cx="11" cy="5.5" r="4" fill="#F06A6A" />
              <circle cx="5" cy="16.5" r="4" fill="#F06A6A" />
              <circle cx="17" cy="16.5" r="4" fill="#F06A6A" />
              <text
                x="25"
                y="17"
                fontFamily="system-ui"
                fontSize="13"
                fontWeight="600"
                fill="#6d6e6f"
              >
                TaskFlow AI
              </text>
            </svg>
          </div>
          <p className="text-sm text-gray-500">
            Built with Next.js, tRPC, Prisma & Claude AI
          </p>
        </div>
      </footer>
    </div>
  );
}
