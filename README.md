# TaskFlow AI

**A full-featured Asana clone with AI capabilities, built with modern web technologies.**

TaskFlow AI is a comprehensive project management platform that replicates and extends the core functionality of Asana. It includes multiple project views, real-time collaboration, automation workflows, and AI-powered features driven by Claude. Designed for teams that need powerful task tracking, portfolio management, goal setting, and intelligent assistance -- all within a polished, responsive interface.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | [Next.js 16](https://nextjs.org/) (App Router) with [Turbopack](https://turbo.build/pack) |
| Language | [TypeScript](https://www.typescriptlang.org/) 5.9 |
| Styling | [Tailwind CSS v4](https://tailwindcss.com/) + [shadcn/ui](https://ui.shadcn.com/) (New York style) |
| API | [tRPC v11](https://trpc.io/) -- end-to-end type-safe RPC |
| Database | [PostgreSQL](https://www.postgresql.org/) with [Prisma v7](https://www.prisma.io/) ORM |
| Authentication | [Auth.js v5](https://authjs.dev/) (next-auth beta) -- JWT strategy, Credentials + Google OAuth |
| AI | [Anthropic SDK](https://docs.anthropic.com/) (Claude) |
| Server State | [TanStack Query v5](https://tanstack.com/query) |
| Drag & Drop | [@dnd-kit](https://dndkit.com/) |
| Rich Text | [Tiptap](https://tiptap.dev/) |
| Theming | [next-themes](https://github.com/pacocoursey/next-themes) (dark/light mode) |
| Validation | [Zod v4](https://zod.dev/) |
| Unit Testing | [Vitest](https://vitest.dev/) + [Testing Library](https://testing-library.com/) |
| E2E Testing | [Playwright](https://playwright.dev/) |

---

## Features

### Core Project Management

- **Workspace and team management** with role-based access control (owner, admin, member)
- **Project creation** with multiple views: List, Board, Timeline/Gantt, and Calendar
- **Full task CRUD** with subtasks up to 3 levels deep, dependencies, and custom fields
- **Drag-and-drop board view** powered by @dnd-kit
- **Task multi-homing** -- assign a single task to multiple projects
- **Rich text descriptions and comments** via the Tiptap editor
- **File attachments** on tasks
- **Tags** and **custom fields** (text, number, date, dropdown, people, currency, percentage)
- **Recurring tasks** with configurable frequency

### Views and Navigation

- **List View** with sortable columns, inline editing, and grouping
- **Board View** (Kanban) with drag-and-drop between columns
- **Timeline View** (Gantt chart) with dependency visualization
- **Calendar View** with drag-to-reschedule
- **My Tasks** with list, board, and calendar layouts
- **Home Dashboard** with customizable widgets
- **Global Search** (Cmd+K / Ctrl+K) with advanced filters

### Collaboration

- **Real-time updates** via Server-Sent Events (SSE)
- **Comments** with @mentions
- **Task followers** for change notifications
- **Inbox / Notifications center** for all activity
- **Status updates** on projects for stakeholder communication

### AI Features (Claude-Powered)

- **AI Task Summarization** -- generate concise summaries of task threads
- **AI Project Status Generation** -- auto-draft project status reports
- **Natural Language Task Creation** -- describe tasks in plain English
- **AI Chat Assistant** -- ask questions about your projects and tasks
- **Smart Task Priority Suggestions** -- AI-recommended priority levels

### Automation and Workflows

- **Rules engine** -- trigger-action automation (e.g., "when status changes to Done, assign to QA")
- **Forms** -- public intake forms that create tasks automatically
- **Project templates** -- reusable project blueprints

### Admin and Settings

- **Admin console** -- manage members, security policies, and workspace settings
- **User profile settings** -- avatar, display name, email preferences
- **Notification preferences** -- fine-grained control over what triggers alerts
- **Display settings** -- theme toggle (dark/light), sidebar color, compact mode
- **Keyboard shortcuts** with a built-in reference dialog

---

## Screenshots

All screenshots are located in [`docs/screenshots/`](docs/screenshots/).

| Screen | Preview |
|---|---|
| Home Dashboard | ![Home Dashboard](docs/screenshots/02-home-dashboard/01-home-full.png) |
| My Tasks -- List View | ![My Tasks List](docs/screenshots/03-my-tasks/01-list-view.png) |
| My Tasks -- Board View | ![My Tasks Board](docs/screenshots/03-my-tasks/02-board-view.png) |
| My Tasks -- Calendar | ![My Tasks Calendar](docs/screenshots/03-my-tasks/03-calendar-view.png) |
| Project -- List View | ![Project List](docs/screenshots/05-project-views/01-list-view.png) |
| Project -- Calendar View | ![Project Calendar](docs/screenshots/05-project-views/04-calendar-view.png) |
| Project -- Overview | ![Project Overview](docs/screenshots/05-project-views/05-overview.png) |
| Inbox | ![Inbox](docs/screenshots/04-inbox/01-inbox-full.png) |
| Global Search | ![Search](docs/screenshots/10-search/01-search-overlay.png) |
| Portfolios | ![Portfolios](docs/screenshots/07-portfolios/01-portfolios-page.png) |
| Goals | ![Goals](docs/screenshots/08-goals/01-goals-page.png) |
| Reporting | ![Reporting](docs/screenshots/09-reporting/01-reporting-page.png) |
| Settings | ![Settings](docs/screenshots/11-settings/02-settings-page.png) |
| Admin Console | ![Admin](docs/screenshots/11-settings/04-admin-console.png) |
| Sidebar | ![Sidebar](docs/screenshots/13-sidebar/01-sidebar-expanded.png) |
| Quick Add Task | ![Quick Add](docs/screenshots/14-modals-forms/01-quick-add-task.png) |
| Login | ![Login](docs/screenshots/01-login/01-login-page.png) |

---

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) v20 or later
- [PostgreSQL](https://www.postgresql.org/) 15 or later
- [npm](https://www.npmjs.com/) (ships with Node.js)
- (Optional) An [Anthropic API key](https://console.anthropic.com/) for AI features
- (Optional) [Google OAuth credentials](https://console.cloud.google.com/) for social login

### 1. Clone the Repository

```bash
git clone <repository-url>
cd "Asana Clone"
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Environment Variables

Create a `.env` file in the project root:

```env
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/taskflow_ai

# Auth.js
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-secret-key          # Generate with: openssl rand -base64 32

# Google OAuth (optional)
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

# Anthropic AI (optional -- required for AI features)
ANTHROPIC_API_KEY=your-anthropic-api-key
```

### 4. Set Up the Database

```bash
# Generate the Prisma client
npm run db:generate

# Run database migrations
npm run db:migrate

# (Optional) Seed the database with sample data
npm run db:seed
```

### 5. Start the Development Server

```bash
npm run dev
```

The application will be available at [http://localhost:3000](http://localhost:3000).

---

## Project Structure

```
src/
├── app/                          # Next.js App Router
│   ├── (auth)/                   # Authentication pages
│   │   ├── login/                #   Login page
│   │   └── register/             #   Registration page
│   ├── (dashboard)/              # Authenticated application routes
│   │   ├── home/                 #   Home dashboard
│   │   ├── my-tasks/             #   Personal task views
│   │   ├── inbox/                #   Notifications inbox
│   │   ├── projects/[id]/        #   Project detail (list, board, timeline, calendar)
│   │   ├── portfolios/           #   Portfolio management
│   │   ├── goals/                #   Goal tracking
│   │   ├── reporting/            #   Reports and analytics
│   │   ├── settings/             #   User settings
│   │   └── admin/                #   Admin console
│   └── api/
│       ├── trpc/                 #   tRPC HTTP handler
│       └── auth/                 #   Auth.js API routes
│
├── components/
│   ├── ai/                       # AI chat panel, suggestions UI
│   ├── admin/                    # Admin console components
│   ├── automation/               # Rules engine, forms builder
│   ├── keyboard/                 # Keyboard shortcuts dialog
│   ├── layout/                   # Sidebar, topbar, navigation
│   ├── project/                  # Project views, task detail panel
│   ├── search/                   # Global search (Cmd+K)
│   ├── settings/                 # Settings panels
│   └── ui/                       # shadcn/ui primitives
│
├── lib/                          # Shared utilities
│   ├── auth.ts                   #   Auth.js configuration
│   ├── trpc.ts                   #   tRPC client setup
│   └── utils.ts                  #   General utility functions
│
└── server/
    ├── ai/                       # Anthropic client and prompt logic
    ├── db/                       # Prisma client instance
    ├── realtime/                 # SSE (Server-Sent Events) service
    └── trpc/
        └── routers/              # tRPC routers (17 total)
            ├── ai.ts             #   AI endpoints
            ├── attachments.ts    #   File attachment CRUD
            ├── auth.ts           #   Auth procedures
            ├── comments.ts       #   Comment threads
            ├── customFields.ts   #   Custom field definitions and values
            ├── forms.ts          #   Public intake forms
            ├── goals.ts          #   Goal tracking
            ├── notifications.ts  #   Notification management
            ├── portfolios.ts     #   Portfolio management
            ├── projects.ts       #   Project CRUD and settings
            ├── rules.ts          #   Automation rules
            ├── search.ts         #   Global search
            ├── sections.ts       #   Project sections
            ├── tasks.ts          #   Task CRUD, subtasks, dependencies
            ├── teams.ts          #   Team management
            ├── templates.ts      #   Project templates
            └── workspaces.ts     #   Workspace management

prisma/
├── schema.prisma                 # Database schema (33 models)
└── seed.ts                       # Database seed script

e2e/                              # Playwright end-to-end tests
docs/screenshots/                 # Application screenshots
```

---

## Available Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start the development server with Turbopack |
| `npm run build` | Create a production build |
| `npm run start` | Start the production server |
| `npm run lint` | Run ESLint across the codebase |
| `npm run db:generate` | Generate the Prisma client from the schema |
| `npm run db:migrate` | Run Prisma database migrations |
| `npm run db:push` | Push the Prisma schema directly to the database |
| `npm run db:studio` | Open Prisma Studio (visual database browser) |
| `npm run db:seed` | Seed the database with sample data |
| `npm run test` | Run unit tests with Vitest |
| `npm run test:watch` | Run unit tests in watch mode |
| `npm run e2e` | Run end-to-end tests with Playwright |
| `npm run e2e:ui` | Run end-to-end tests with the Playwright UI |

---

## Testing

### Unit Tests

Unit tests are written with [Vitest](https://vitest.dev/) and [Testing Library](https://testing-library.com/). They cover component rendering, utility functions, and tRPC router logic.

```bash
# Run all unit tests once
npm run test

# Run in watch mode during development
npm run test:watch
```

### End-to-End Tests

E2E tests use [Playwright](https://playwright.dev/) to simulate real user workflows across the full application.

```bash
# Run all E2E tests headlessly
npm run e2e

# Run with the interactive Playwright UI
npm run e2e:ui
```

Make sure the development server is running and the database is seeded before executing E2E tests.

---

## Architecture Overview

```
Browser
  |
  |  Next.js App Router (React Server Components + Client Components)
  |
  v
tRPC Client (@trpc/react-query)  <---->  TanStack Query (cache + mutations)
  |
  |  HTTP (batched requests)
  |
  v
tRPC Server (17 routers)  <---->  Anthropic SDK (Claude AI)
  |
  |  Prisma ORM
  |
  v
PostgreSQL (33 tables)
  |
  |  SSE (Server-Sent Events)
  |
  v
Real-time UI Updates
```

**Key architectural decisions:**

- **tRPC for the API layer** -- provides full end-to-end type safety from database queries through to React components, eliminating an entire class of runtime errors.
- **Next.js App Router** -- leverages React Server Components for initial page loads and client components for interactive features, giving the best balance of performance and interactivity.
- **JWT authentication strategy** -- chosen over database sessions for stateless, scalable authentication with Auth.js v5.
- **Server-Sent Events for real-time updates** -- a lightweight alternative to WebSockets that works well with Next.js serverless deployments and provides one-way server-to-client streaming.
- **Prisma v7 with PostgreSQL** -- type-safe database access with migrations, seeding, and a visual studio for development.
- **shadcn/ui component library** -- provides accessible, customizable UI primitives that are copied into the project (not installed as a dependency), giving full control over styling and behavior.

### Database

The PostgreSQL database contains **33 models** covering:

- **Identity and access**: User, Account, Session, VerificationToken, Workspace, WorkspaceMember
- **Teams**: Team, TeamMember
- **Projects**: Project, ProjectMember, Section, ProjectTemplate
- **Tasks**: Task, TaskProject, TaskDependency, TaskFollower, TaskTag
- **Custom fields**: CustomFieldDefinition, ProjectCustomField, TaskCustomFieldValue
- **Collaboration**: Comment, Attachment, Like, ActivityLog, Tag, Notification, StatusUpdate
- **Organization**: Portfolio, PortfolioProject, Goal
- **Automation**: Rule, Form
- **AI**: AiCache

---

## License

This project is licensed under the [MIT License](LICENSE).
