# Implementation Plan
# TaskFlow AI — Sprint-by-Sprint Breakdown

**Version**: 1.0
**Date**: February 9, 2026
**Total Duration**: 14 Sprints (28 weeks, 2-week sprints)
**Team Assumption**: 1-3 developers

---

## Overview

| Phase | Name | Sprints | Duration | Priority |
|-------|------|---------|----------|----------|
| 0 | Project Setup | Sprint 1 | 2 weeks | MVP |
| 1 | Core Foundation | Sprint 1-2 | 3 weeks | MVP |
| 2 | Task Management Core | Sprint 2-4 | 5 weeks | MVP |
| 3 | Project Views | Sprint 4-6 | 4 weeks | MVP |
| 4 | Collaboration & Real-time | Sprint 6-7 | 3 weeks | MVP |
| 5 | Advanced Features | Sprint 7-9 | 4 weeks | Phase 2 |
| 6 | Automation & Workflows | Sprint 9-10 | 3 weeks | Phase 2 |
| 7 | AI Features | Sprint 10-12 | 4 weeks | Phase 3 |
| 8 | Admin, Settings & Polish | Sprint 12-13 | 3 weeks | Phase 3 |
| 9 | Testing & Deployment | Sprint 13-14 | 3 weeks | Phase 3 |

---

## Phase 0: Project Setup (Sprint 1, Week 1)

### Task 0.1: Initialize Next.js Project
**Effort**: 2 hours | **Dependencies**: None

- [ ] 0.1.1: Run `npx create-next-app@latest taskflow-ai --typescript --tailwind --eslint --app --src-dir --use-pnpm`
- [ ] 0.1.2: Configure `tsconfig.json` with strict mode and path aliases (`@/components`, `@/server`, `@/lib`, `@/stores`, `@/hooks`, `@/types`)
- [ ] 0.1.3: Create `.env.local` and `.env.example` with all required environment variables
- [ ] 0.1.4: Initialize git repository with `.gitignore` (include `.env.local`, `node_modules`, `.next`)
- [ ] 0.1.5: Create initial folder structure per architecture document

**Acceptance Criteria**: `pnpm dev` runs without errors, TypeScript strict mode enabled

### Task 0.2: Configure Tailwind CSS & shadcn/ui
**Effort**: 2 hours | **Dependencies**: 0.1

- [ ] 0.2.1: Configure Tailwind v4 with custom theme (colors matching Asana's palette from UI doc)
- [ ] 0.2.2: Run `npx shadcn@latest init` and configure with New York style, CSS variables
- [ ] 0.2.3: Install core shadcn components: `button`, `input`, `label`, `dialog`, `dropdown-menu`, `popover`, `command`, `table`, `tabs`, `avatar`, `badge`, `card`, `separator`, `skeleton`, `toast`, `tooltip`, `sheet`, `select`, `checkbox`, `textarea`, `scroll-area`
- [ ] 0.2.4: Configure global CSS with Asana-like font stack and base styles
- [ ] 0.2.5: Create a test page showing all installed components render correctly

**AC**: All shadcn components render, theme colors match design spec

### Task 0.3: Set up Prisma & PostgreSQL
**Effort**: 3 hours | **Dependencies**: 0.1

- [ ] 0.3.1: Install Prisma: `pnpm add prisma @prisma/client`
- [ ] 0.3.2: Run `npx prisma init --datasource-provider postgresql`
- [ ] 0.3.3: Create Neon PostgreSQL database (free tier)
- [ ] 0.3.4: Add `DATABASE_URL` to `.env.local`
- [ ] 0.3.5: Write initial `schema.prisma` with User, Account, Session, Workspace, WorkspaceMember models
- [ ] 0.3.6: Run `npx prisma migrate dev --name init` to create initial migration
- [ ] 0.3.7: Create `src/server/db/prisma.ts` — Prisma client singleton (handle Next.js hot reload)
- [ ] 0.3.8: Create `src/server/db/seed.ts` — Seed script with test user and workspace
- [ ] 0.3.9: Add `prisma:migrate`, `prisma:studio`, `prisma:seed` scripts to `package.json`

**AC**: Prisma Studio shows database tables, seed script populates test data

### Task 0.4: Set up tRPC
**Effort**: 3 hours | **Dependencies**: 0.3

- [ ] 0.4.1: Install tRPC packages: `@trpc/server`, `@trpc/client`, `@trpc/react-query`, `@trpc/next`
- [ ] 0.4.2: Install TanStack Query: `@tanstack/react-query`
- [ ] 0.4.3: Create `src/server/trpc/trpc.ts` — Initialize tRPC with context
- [ ] 0.4.4: Create `src/server/trpc/context.ts` — Context factory with session + prisma
- [ ] 0.4.5: Create `src/server/trpc/router.ts` — Root router with hello procedure
- [ ] 0.4.6: Create `src/app/api/trpc/[trpc]/route.ts` — API handler
- [ ] 0.4.7: Create tRPC client provider component wrapping TanStack Query
- [ ] 0.4.8: Wrap root layout with providers
- [ ] 0.4.9: Test: Call `trpc.hello.useQuery()` from a page and see result

**AC**: tRPC hello procedure returns data to client, TypeScript types flow end-to-end

### Task 0.5: Set up Auth.js v5
**Effort**: 4 hours | **Dependencies**: 0.3, 0.4

- [ ] 0.5.1: Install `next-auth@beta` and `@auth/prisma-adapter`
- [ ] 0.5.2: Create `src/lib/auth.ts` — Auth.js configuration with Prisma adapter
- [ ] 0.5.3: Configure Credentials provider (email + password)
- [ ] 0.5.4: Configure Google OAuth provider
- [ ] 0.5.5: Create `src/app/api/auth/[...nextauth]/route.ts`
- [ ] 0.5.6: Add `AUTH_SECRET`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` to env
- [ ] 0.5.7: Create tRPC middleware for protected procedures (`protectedProcedure`)
- [ ] 0.5.8: Create `src/app/(auth)/login/page.tsx` — Login page with email/password form
- [ ] 0.5.9: Create `src/app/(auth)/register/page.tsx` — Registration page
- [ ] 0.5.10: Create `src/app/(auth)/layout.tsx` — Auth layout (centered card)
- [ ] 0.5.11: Add auth middleware to protect `/` and `/(dashboard)/*` routes
- [ ] 0.5.12: Install bcrypt for password hashing

**AC**: User can register, login with email/password, login with Google, protected routes redirect to login

### Task 0.6: Development Tooling
**Effort**: 1 hour | **Dependencies**: 0.1

- [ ] 0.6.1: Configure ESLint with `@next/eslint-plugin-next` and TypeScript rules
- [ ] 0.6.2: Configure Prettier with consistent settings
- [ ] 0.6.3: Set up Husky with lint-staged (lint + format on pre-commit)
- [ ] 0.6.4: Create docker-compose.yml for local PostgreSQL + Redis (optional, Neon/Upstash can be used directly)

**AC**: Pre-commit hooks run lint and format, CI-ready

---

## Phase 1: Core Foundation (Sprint 1-2, Weeks 2-3)

### Task 1.1: User Profile
**Effort**: 4 hours | **Dependencies**: 0.5

- [ ] 1.1.1: Add `title`, `department`, `bio`, `avatarUrl` fields to User model, run migration
- [ ] 1.1.2: Create `users` tRPC router with `getProfile`, `updateProfile` procedures
- [ ] 1.1.3: Create profile settings page at `/settings/profile`
- [ ] 1.1.4: Build profile form component (name, title, department, bio)
- [ ] 1.1.5: Implement avatar upload (presigned URL to R2 or base64 for MVP)
- [ ] 1.1.6: Create reusable `<UserAvatar>` component (image or initials with color)

**AC**: User can view and edit profile, avatar displays throughout app

### Task 1.2: Workspace Management
**Effort**: 8 hours | **Dependencies**: 0.5

- [ ] 1.2.1: Add Workspace, WorkspaceMember models if not already in schema
- [ ] 1.2.2: Create `workspaces` tRPC router:
  - `create` mutation
  - `get` query
  - `update` mutation
  - `list` query (user's workspaces)
  - `getMembers` query
  - `invite` mutation (generate invite link or send email)
  - `removeMember` mutation
  - `updateMemberRole` mutation
- [ ] 1.2.3: Create workspace creation flow (modal or page)
- [ ] 1.2.4: Create workspace settings page
- [ ] 1.2.5: Create member list with role badges
- [ ] 1.2.6: Create invite member dialog (email input)
- [ ] 1.2.7: Implement workspace context (store current workspace in URL or cookie)
- [ ] 1.2.8: Create workspace switcher dropdown (if user has multiple)
- [ ] 1.2.9: Auto-create default workspace on registration

**AC**: User can create workspace, invite members by email, manage roles, switch workspaces

### Task 1.3: Team Management
**Effort**: 4 hours | **Dependencies**: 1.2

- [ ] 1.3.1: Add Team, TeamMember models, run migration
- [ ] 1.3.2: Create `teams` tRPC router: `create`, `get`, `list`, `update`, `addMember`, `removeMember`
- [ ] 1.3.3: Create team creation dialog
- [ ] 1.3.4: Create team page at `/teams/[teamId]` with overview, members
- [ ] 1.3.5: Show teams in sidebar under "Teams" section

**AC**: User can create teams, add members, team appears in sidebar

### Task 1.4: Dashboard Layout (Sidebar + Topbar)
**Effort**: 8 hours | **Dependencies**: 1.2

- [ ] 1.4.1: Create `src/app/(dashboard)/layout.tsx` — Dashboard shell with sidebar + topbar
- [ ] 1.4.2: Build `<Sidebar>` component:
  - Create button (pink pill)
  - Navigation items: Home, My tasks, Inbox
  - Insights section: Reporting, Portfolios, Goals
  - Projects section with project list
  - Teams section with team list
  - Upgrade button (bottom)
  - Invite teammates link (bottom)
  - Collapse/expand toggle
- [ ] 1.4.3: Build `<Topbar>` component:
  - Hamburger menu (sidebar toggle)
  - Asana-style logo
  - Search bar (⌘K)
  - Help icon
  - User avatar dropdown
- [ ] 1.4.4: Create `sidebar` Zustand store (expanded/collapsed, active section)
- [ ] 1.4.5: Style sidebar to match Asana's warm cream background
- [ ] 1.4.6: Implement sidebar active state highlighting
- [ ] 1.4.7: Implement sidebar collapse/expand animation
- [ ] 1.4.8: Make sidebar responsive (auto-collapse on narrow viewports)

**AC**: Sidebar navigation works, matches Asana layout, collapses/expands smoothly

### Task 1.5: Email Verification & Password Reset
**Effort**: 4 hours | **Dependencies**: 0.5

- [ ] 1.5.1: Set up Resend: `pnpm add resend`
- [ ] 1.5.2: Create email templates using React Email (verification, password reset)
- [ ] 1.5.3: Implement email verification flow (send link on register, verify endpoint)
- [ ] 1.5.4: Implement password reset flow (forgot password page, email link, reset page)
- [ ] 1.5.5: Add `RESEND_API_KEY` to env

**AC**: Verification and reset emails send and work end-to-end

---

## Phase 2: Task Management Core (Sprint 2-4, Weeks 3-7)

### Task 2.1: Project CRUD
**Effort**: 6 hours | **Dependencies**: 1.3

- [ ] 2.1.1: Add Project, ProjectMember models, run migration
- [ ] 2.1.2: Create `projects` tRPC router: `create`, `get`, `update`, `delete`, `list`, `archive`
- [ ] 2.1.3: Create "New Project" dialog (name, team, color, privacy, icon)
- [ ] 2.1.4: Create project color picker (16 preset colors)
- [ ] 2.1.5: Show projects under their team in sidebar
- [ ] 2.1.6: Create project page layout at `/projects/[projectId]` with view tabs
- [ ] 2.1.7: Implement project star/favorite toggle (pin to sidebar)

**AC**: User can create, edit, archive, delete projects; projects appear in sidebar

### Task 2.2: Sections CRUD
**Effort**: 3 hours | **Dependencies**: 2.1

- [ ] 2.2.1: Add Section model with `position` (Float), run migration
- [ ] 2.2.2: Create `sections` tRPC router: `create`, `update`, `delete`, `reorder`, `list`
- [ ] 2.2.3: Auto-create default sections on project creation (e.g., "To do", "In progress", "Done")
- [ ] 2.2.4: Implement section rename (inline editing)
- [ ] 2.2.5: Implement section delete with confirmation
- [ ] 2.2.6: Implement section drag-and-drop reorder (update position values)

**AC**: Sections can be created, renamed, deleted, reordered via drag-and-drop

### Task 2.3: Task CRUD & Detail Pane
**Effort**: 12 hours | **Dependencies**: 2.2

- [ ] 2.3.1: Add Task, TaskProject models, run migration
- [ ] 2.3.2: Create `tasks` tRPC router: `create`, `get`, `update`, `delete`, `complete`, `uncomplete`, `list`, `myTasks`, `move`, `reorder`
- [ ] 2.3.3: Build `<TaskDetailPane>` — slide-out right panel:
  - Complete/uncomplete checkbox
  - Task title (editable)
  - Assignee selector
  - Due date picker
  - Project assignment
  - Tags
  - Description (rich text)
  - Subtasks list
  - Comments/Activity section
- [ ] 2.3.4: Create Zustand store for task detail pane (open/close, current task ID)
- [ ] 2.3.5: Build task detail slide-in animation (from right)
- [ ] 2.3.6: Implement close with Escape key and X button
- [ ] 2.3.7: Build Quick Add Task modal (Tab+Q shortcut):
  - Task name input
  - Assignee selector
  - Project selector
  - Description area
  - Toolbar (attach, emoji, mention, due date, create)
- [ ] 2.3.8: Implement optimistic updates for task completion
- [ ] 2.3.9: Implement task deletion with undo toast

**AC**: Full task CRUD works, detail pane slides in/out, quick add creates tasks

### Task 2.4: Rich Text Editor
**Effort**: 6 hours | **Dependencies**: 2.3

- [ ] 2.4.1: Install Tiptap: `@tiptap/react`, `@tiptap/starter-kit`, `@tiptap/extension-link`, `@tiptap/extension-mention`, `@tiptap/extension-placeholder`
- [ ] 2.4.2: Create `<RichTextEditor>` component with toolbar:
  - Bold, Italic, Strikethrough
  - Heading (H1, H2, H3)
  - Bullet list, Numbered list
  - Code block
  - Link
  - @mention (triggers user search)
- [ ] 2.4.3: Create `<RichTextViewer>` for read-only display
- [ ] 2.4.4: Store content as Tiptap JSON in database
- [ ] 2.4.5: Implement @mention with user search dropdown
- [ ] 2.4.6: Style editor to match Asana's description editor look

**AC**: Rich text editing works with all formatting options, @mentions resolve to users

### Task 2.5: Subtasks
**Effort**: 4 hours | **Dependencies**: 2.3

- [ ] 2.5.1: Implement self-referencing Task relation (parentTaskId)
- [ ] 2.5.2: Create `subtasks` tRPC router: `create`, `list`
- [ ] 2.5.3: Build subtask list in task detail pane
- [ ] 2.5.4: Add "Add subtask" button and inline creation
- [ ] 2.5.5: Show subtask completion count on parent task
- [ ] 2.5.6: Support nested subtasks (up to 3 levels in UI)
- [ ] 2.5.7: Clicking a subtask opens it in the detail pane (navigate hierarchy)

**AC**: Subtasks can be created, completed, nested 3 levels deep

### Task 2.6: Dependencies
**Effort**: 3 hours | **Dependencies**: 2.3

- [ ] 2.6.1: Add TaskDependency model, run migration
- [ ] 2.6.2: Add dependency procedures to tasks router: `addDependency`, `removeDependency`
- [ ] 2.6.3: Build dependency UI in task detail pane:
  - "Blocked by" section with task search
  - "Blocking" section showing downstream tasks
- [ ] 2.6.4: Validate no circular dependencies on creation

**AC**: Tasks can have blocked-by/blocking relationships, circular deps prevented

### Task 2.7: Comments & Activity Log
**Effort**: 6 hours | **Dependencies**: 2.4

- [ ] 2.7.1: Add Comment, ActivityLog models, run migration
- [ ] 2.7.2: Create `comments` tRPC router: `create`, `update`, `delete`, `list`
- [ ] 2.7.3: Build comment section in task detail pane:
  - Comment input with rich text editor
  - Comment list (newest last)
  - Each comment: avatar, author name, timestamp, body, edit/delete actions
- [ ] 2.7.4: Implement activity log recording (automatic on all task mutations)
- [ ] 2.7.5: Build combined Activity+Comments view (chronological)
- [ ] 2.7.6: @mention in comments auto-adds user as task follower

**AC**: Comments work with rich text, activity log shows all task changes

### Task 2.8: File Attachments
**Effort**: 4 hours | **Dependencies**: 2.3

- [ ] 2.8.1: Add Attachment model, run migration
- [ ] 2.8.2: Set up Cloudflare R2 bucket and credentials
- [ ] 2.8.3: Create `attachments` tRPC router: `getUploadUrl`, `create`, `delete`, `list`
- [ ] 2.8.4: Implement presigned URL upload flow
- [ ] 2.8.5: Build attachment UI in task detail:
  - Drag-and-drop zone
  - File list with previews
  - Download and delete actions
- [ ] 2.8.6: Implement clipboard paste for images
- [ ] 2.8.7: File type validation (block executables), size limit (100MB)

**AC**: Files can be uploaded via drag-and-drop, pasted from clipboard, previewed, and deleted

### Task 2.9: Custom Fields
**Effort**: 8 hours | **Dependencies**: 2.3

- [ ] 2.9.1: Add CustomFieldDefinition, ProjectCustomField, TaskCustomFieldValue models, run migration
- [ ] 2.9.2: Create `customFields` tRPC router: `define`, `addToProject`, `removeFromProject`, `setValue`, `list`
- [ ] 2.9.3: Build field definition dialog (name, type, options for dropdown)
- [ ] 2.9.4: Build custom field renderer component (switch on type):
  - Text: inline text input
  - Number: number input
  - Date: date picker
  - Single-select: dropdown with colored options
  - Multi-select: multi-select dropdown
  - People: user selector
- [ ] 2.9.5: Show custom fields as columns in list view
- [ ] 2.9.6: Show custom fields in task detail pane
- [ ] 2.9.7: Implement field value editing inline and in detail pane

**AC**: Custom fields can be defined, added to projects, values set on tasks, displayed in list view

### Task 2.10: Tags
**Effort**: 2 hours | **Dependencies**: 2.3

- [ ] 2.10.1: Add Tag, TaskTag models, run migration
- [ ] 2.10.2: Create tag CRUD procedures
- [ ] 2.10.3: Build tag picker component (search + create inline)
- [ ] 2.10.4: Display tags as colored badges on tasks

**AC**: Tags can be created, assigned to tasks, and displayed

---

## Phase 3: Project Views (Sprint 4-6, Weeks 7-11)

### Task 3.1: List View
**Effort**: 12 hours | **Dependencies**: 2.3, 2.9

- [ ] 3.1.1: Build `<ListView>` component at `/projects/[projectId]/list`
- [ ] 3.1.2: Implement task rows with columns: checkbox, task name, assignee, due date, custom fields
- [ ] 3.1.3: Implement section headers (collapsible) with task count
- [ ] 3.1.4: Implement inline editing (click cell to edit)
- [ ] 3.1.5: Implement column sorting (click header to sort asc/desc)
- [ ] 3.1.6: Implement group-by (section, assignee, due date, custom field)
- [ ] 3.1.7: Implement filter bar with AND/OR conditions
- [ ] 3.1.8: Implement multi-select (Shift+click, Ctrl+click)
- [ ] 3.1.9: Implement bulk actions toolbar (complete, assign, move, delete)
- [ ] 3.1.10: Implement inline "Add task" at bottom of each section
- [ ] 3.1.11: Implement drag-and-drop reorder with @dnd-kit (within section and between sections)
- [ ] 3.1.12: Click task name opens detail pane (right side)
- [ ] 3.1.13: Virtual scrolling for performance with 500+ tasks (use `@tanstack/react-virtual`)

**AC**: Full-featured spreadsheet-like list view with sort, filter, group, DnD, bulk actions

### Task 3.2: Board View
**Effort**: 8 hours | **Dependencies**: 2.2, 2.3

- [ ] 3.2.1: Build `<BoardView>` component at `/projects/[projectId]/board`
- [ ] 3.2.2: Render columns from sections
- [ ] 3.2.3: Build `<TaskCard>` component showing: title, assignee avatar, due date, priority badge
- [ ] 3.2.4: Implement drag-and-drop cards between columns (@dnd-kit sortable)
- [ ] 3.2.5: Implement "Add task" button at bottom of each column
- [ ] 3.2.6: Implement column add/rename/delete
- [ ] 3.2.7: Click card opens task detail pane
- [ ] 3.2.8: Show task count per column in header
- [ ] 3.2.9: Handle empty columns with placeholder

**AC**: Kanban board with drag-and-drop, card details, column management

### Task 3.3: Calendar View
**Effort**: 8 hours | **Dependencies**: 2.3

- [ ] 3.3.1: Build `<CalendarView>` component at `/projects/[projectId]/calendar`
- [ ] 3.3.2: Build monthly calendar grid (7 columns x 5-6 rows)
- [ ] 3.3.3: Display tasks on their due date cells (colored pills)
- [ ] 3.3.4: Implement month navigation (previous/next)
- [ ] 3.3.5: Implement drag-to-reschedule (drag task to new date cell)
- [ ] 3.3.6: Implement click-on-date to create task
- [ ] 3.3.7: Handle overflow ("+N more" link when too many tasks on one date)
- [ ] 3.3.8: Color-code tasks by project color or custom field

**AC**: Monthly calendar displays tasks, drag to reschedule, click to create

### Task 3.4: Timeline View (Gantt)
**Effort**: 16 hours | **Dependencies**: 2.6

- [ ] 3.4.1: Build `<TimelineView>` component at `/projects/[projectId]/timeline`
- [ ] 3.4.2: Build time axis header (dates with zoom levels: day, week, month)
- [ ] 3.4.3: Build task rows with horizontal bars (start date → due date)
- [ ] 3.4.4: Implement drag to move task bars (change dates)
- [ ] 3.4.5: Implement drag bar edges to resize (change start or end date)
- [ ] 3.4.6: Render dependency arrows between connected tasks (SVG lines)
- [ ] 3.4.7: Build zoom controls (day/week/month)
- [ ] 3.4.8: Build unscheduled tasks panel (sidebar for tasks without dates)
- [ ] 3.4.9: Show milestone markers (diamond icon)
- [ ] 3.4.10: Handle scroll synchronization (time axis stays fixed while tasks scroll vertically)
- [ ] 3.4.11: Today indicator (vertical red line)

**AC**: Gantt chart with task bars, dependencies, zoom, drag-to-reschedule

### Task 3.5: Project Overview, Files, Messages Tabs
**Effort**: 6 hours | **Dependencies**: 2.1

- [ ] 3.5.1: Build Overview tab: project brief (rich text), key resources, milestones
- [ ] 3.5.2: Build Files tab: grid of all attachments from project tasks, filter by type
- [ ] 3.5.3: Build Messages tab: thread-based project conversations, create message, @mention
- [ ] 3.5.4: Build project dashboard tab: placeholder for chart widgets (implement charts in Phase 5)

**AC**: All project tabs functional with appropriate content

### Task 3.6: View Tab Switching
**Effort**: 2 hours | **Dependencies**: 3.1-3.5

- [ ] 3.6.1: Implement tab bar in project header (List, Board, Timeline, Calendar, Overview, Files, Messages, Dashboard)
- [ ] 3.6.2: Active tab indicator (bottom border highlight)
- [ ] 3.6.3: URL-based routing (`/projects/[id]/list`, `/board`, etc.)
- [ ] 3.6.4: Remember last-used view per project (stored in localStorage or DB)
- [ ] 3.6.5: "+" button to add new views

**AC**: Seamless switching between all project views, URL reflects current view

---

## Phase 4: Collaboration & Real-time (Sprint 6-7, Weeks 11-13)

### Task 4.1: Real-time Infrastructure
**Effort**: 8 hours | **Dependencies**: 0.4

- [ ] 4.1.1: Set up Upstash Redis and add `REDIS_URL` to env
- [ ] 4.1.2: Create `src/server/services/realtime.service.ts` — publish events to Redis
- [ ] 4.1.3: Create `src/app/api/realtime/subscribe/route.ts` — SSE endpoint
- [ ] 4.1.4: Implement Redis pub/sub subscription per workspace channel
- [ ] 4.1.5: Create `useRealtimeSubscription` hook (connects EventSource, handles events)
- [ ] 4.1.6: Integrate with TanStack Query (invalidate queries on relevant events)
- [ ] 4.1.7: Add event publishing to all task/comment/project mutations
- [ ] 4.1.8: Implement heartbeat (30s) to keep SSE connections alive
- [ ] 4.1.9: Handle reconnection on disconnect

**AC**: Changes by User A appear in real-time for User B without refresh

### Task 4.2: Notifications & Inbox
**Effort**: 8 hours | **Dependencies**: 4.1

- [ ] 4.2.1: Add Notification model (if not already), run migration
- [ ] 4.2.2: Create `notifications` tRPC router: `list`, `markRead`, `markAllRead`, `archive`
- [ ] 4.2.3: Create notification service — generates notifications on events:
  - Task assigned to user
  - @mentioned in comment
  - Comment on followed task
  - Status update on followed project
  - Task completed (for followers)
- [ ] 4.2.4: Build Inbox page at `/(dashboard)/inbox`:
  - Tabs: Activity | Bookmarks | Archive
  - Notification list with: avatar, event description, timestamp, read/unread indicator
  - Filter button + density toggle
  - Empty state: "Hooray, you're up to date!"
- [ ] 4.2.5: Implement mark read/unread on click
- [ ] 4.2.6: Implement archive action
- [ ] 4.2.7: Show unread count badge on "Inbox" in sidebar
- [ ] 4.2.8: Send real-time notification event via SSE
- [ ] 4.2.9: Implement task follow/unfollow (TaskFollower model)

**AC**: Notifications appear in Inbox in real-time, read/unread/archive works, badge shows count

### Task 4.3: Home Dashboard
**Effort**: 6 hours | **Dependencies**: 4.2

- [ ] 4.3.1: Build Home page at `/(dashboard)/home`
- [ ] 4.3.2: Time-based greeting: "Good morning/afternoon/evening, {name}"
- [ ] 4.3.3: Date display and stats bar (tasks completed, collaborators)
- [ ] 4.3.4: **My Tasks widget**: upcoming tasks, overdue indicator, inline complete
- [ ] 4.3.5: **Projects widget**: recent projects as cards
- [ ] 4.3.6: **Tasks I've assigned widget**: tasks assigned to others with status
- [ ] 4.3.7: **Goals widget**: active goals with progress bars (placeholder if no goals)
- [ ] 4.3.8: "Customize" button for future widget management
- [ ] 4.3.9: 2-column responsive grid layout for widgets

**AC**: Home dashboard shows personalized widgets with live data

### Task 4.4: My Tasks
**Effort**: 6 hours | **Dependencies**: 3.1, 3.2

- [ ] 4.4.1: Build My Tasks page at `/(dashboard)/my-tasks`
- [ ] 4.4.2: Aggregate all tasks assigned to current user across all projects
- [ ] 4.4.3: Reuse `<ListView>` and `<BoardView>` components
- [ ] 4.4.4: Default sections: Recently Assigned, Today, Upcoming, Later
- [ ] 4.4.5: Tab bar: List | Board | Calendar | Files
- [ ] 4.4.6: Sorting and filtering options
- [ ] 4.4.7: Share and Customize buttons in header

**AC**: My Tasks aggregates all user's tasks with List, Board, and Calendar views

### Task 4.5: Global Search (Basic)
**Effort**: 4 hours | **Dependencies**: 2.3

- [ ] 4.5.1: Create `search` tRPC router: `global` query
- [ ] 4.5.2: Implement PostgreSQL full-text search on tasks (title + description)
- [ ] 4.5.3: Build `<CommandPalette>` component (⌘K shortcut):
  - Search input
  - Result grouping (Tasks, Projects)
  - Keyboard navigation (arrow keys, enter to select)
  - Recent searches
- [ ] 4.5.4: Click result navigates to task/project
- [ ] 4.5.5: Also search project names

**AC**: ⌘K opens search, results appear as user types, navigation works

---

## Phase 5: Advanced Features (Sprint 7-9, Weeks 13-17)

### Task 5.1: Portfolios
**Effort**: 8 hours | **Dependencies**: 2.1

- [ ] 5.1.1: Add Portfolio, PortfolioProject models, run migration
- [ ] 5.1.2: Create `portfolios` tRPC router: `create`, `get`, `update`, `addProject`, `removeProject`, `list`
- [ ] 5.1.3: Build Portfolios page at `/(dashboard)/portfolios`
- [ ] 5.1.4: Build portfolio list view (table with project name, owner, status, progress)
- [ ] 5.1.5: Implement status color indicators (on track = green, at risk = yellow, off track = red)
- [ ] 5.1.6: Build "Create portfolio" dialog
- [ ] 5.1.7: Build "Add project to portfolio" dialog (project search)

**AC**: Portfolios can be created, projects added, status overview displays correctly

### Task 5.2: Goals & OKRs
**Effort**: 8 hours | **Dependencies**: 1.3

- [ ] 5.2.1: Add Goal model, run migration
- [ ] 5.2.2: Create `goals` tRPC router: `create`, `get`, `update`, `updateProgress`, `list`
- [ ] 5.2.3: Build Goals page at `/(dashboard)/goals`
- [ ] 5.2.4: Tabs: Strategy map | Company goals | Team goals | My goals
- [ ] 5.2.5: Build goal list view (name, owner, progress bar, status, time period)
- [ ] 5.2.6: Build goal hierarchy (parent-child relationships)
- [ ] 5.2.7: Build goal detail pane (progress update, linked projects, key results)
- [ ] 5.2.8: Manual progress update (slider 0-100%)

**AC**: Goals can be created in hierarchy, progress tracked manually, goal pages functional

### Task 5.3: Reporting & Dashboards
**Effort**: 10 hours | **Dependencies**: 2.3

- [ ] 5.3.1: Install Recharts: `pnpm add recharts`
- [ ] 5.3.2: Create `reporting` tRPC router: `getChartData` query (configurable)
- [ ] 5.3.3: Build chart widget components:
  - `<BarChartWidget>`: tasks by status, assignee
  - `<PieChartWidget>`: task distribution
  - `<LineChartWidget>`: completion over time
  - `<BurnupChartWidget>`: scope vs completed over time
  - `<NumberWidget>`: single metric (total tasks, overdue count)
- [ ] 5.3.4: Build project Dashboard tab with widget grid
- [ ] 5.3.5: Build universal Reporting page at `/(dashboard)/reporting`
- [ ] 5.3.6: Implement chart data source configuration (which project, date range, grouping)
- [ ] 5.3.7: Build "Add chart" dialog with chart type selection

**AC**: Charts display real data, configurable data sources, project and universal dashboards work

### Task 5.4: Advanced Search
**Effort**: 6 hours | **Dependencies**: 4.5

- [ ] 5.4.1: Build advanced search page at `/(dashboard)/search`
- [ ] 5.4.2: Implement filter UI: assignee, project, team, due date range, status, custom fields, tags
- [ ] 5.4.3: Implement AND/OR filter logic
- [ ] 5.4.4: Build saved searches (save filter configuration)
- [ ] 5.4.5: Show saved searches in sidebar
- [ ] 5.4.6: Search result cards with relevant metadata

**AC**: Advanced search with multiple filter types, saved searches accessible from sidebar

### Task 5.5: Status Updates
**Effort**: 4 hours | **Dependencies**: 2.4

- [ ] 5.5.1: Add StatusUpdate model, run migration
- [ ] 5.5.2: Create status update procedures: `create`, `list`
- [ ] 5.5.3: Build status update composer (status dropdown: On Track/At Risk/Off Track/On Hold/Complete + rich text body)
- [ ] 5.5.4: Build status update feed on project Overview tab
- [ ] 5.5.5: Notify project followers when status posted

**AC**: Status updates can be posted and viewed on projects

---

## Phase 6: Automation & Workflows (Sprint 9-10, Weeks 17-19)

### Task 6.1: Rules Engine
**Effort**: 12 hours | **Dependencies**: 2.3

- [ ] 6.1.1: Add Rule model, run migration
- [ ] 6.1.2: Create `rules` tRPC router: `create`, `update`, `delete`, `list`, `toggle`
- [ ] 6.1.3: Build Rule builder UI:
  - Trigger selector (task added, moved, completed, field changed, due date approaching)
  - Condition builder (field comparisons)
  - Action selector (set assignee, move section, set field, add comment, create subtask)
- [ ] 6.1.4: Build rules list panel (accessible from project "Customize" menu)
- [ ] 6.1.5: Implement rule execution engine:
  - Hook into task mutations (create, update, move, complete)
  - Evaluate trigger conditions
  - Execute actions
  - Run asynchronously via BullMQ to avoid blocking mutations
- [ ] 6.1.6: Install BullMQ: `pnpm add bullmq`
- [ ] 6.1.7: Create rule worker process
- [ ] 6.1.8: Enable/disable toggle per rule
- [ ] 6.1.9: Rule execution logging (for debugging)

**AC**: Rules can be created with trigger+condition+action, fire automatically when conditions met

### Task 6.2: Forms
**Effort**: 6 hours | **Dependencies**: 2.9

- [ ] 6.2.1: Add Form model, run migration
- [ ] 6.2.2: Create `forms` tRPC router: `create`, `update`, `get`, `submit`
- [ ] 6.2.3: Build form builder UI (add fields, reorder, configure required/optional)
- [ ] 6.2.4: Map form fields to task fields and custom fields
- [ ] 6.2.5: Generate public form URL (no auth required to submit)
- [ ] 6.2.6: Build public form page at `/forms/[slug]`
- [ ] 6.2.7: Form submission creates task in project with field mapping
- [ ] 6.2.8: Publish/unpublish toggle

**AC**: Forms can be built, shared via public URL, submissions create tasks

### Task 6.3: Project Templates
**Effort**: 4 hours | **Dependencies**: 2.2

- [ ] 6.3.1: Add ProjectTemplate model, run migration
- [ ] 6.3.2: "Save as template" action on projects (snapshot sections, tasks, rules)
- [ ] 6.3.3: "Create from template" option in new project dialog
- [ ] 6.3.4: Template gallery page (list workspace templates)
- [ ] 6.3.5: Apply template creates project with all predefined structure

**AC**: Projects can be saved as templates, new projects created from templates

### Task 6.4: Multi-homing & Recurring Tasks
**Effort**: 4 hours | **Dependencies**: 2.3

- [ ] 6.4.1: Implement "Add to project" action (task appears in multiple projects)
- [ ] 6.4.2: Show all projects a task belongs to in detail pane
- [ ] 6.4.3: Implement recurring task configuration (daily, weekly, biweekly, monthly, custom)
- [ ] 6.4.4: On task completion, auto-create next occurrence
- [ ] 6.4.5: Build recurrence rule editor in task detail

**AC**: Tasks can belong to multiple projects, recurring tasks auto-generate next instance

---

## Phase 7: AI Features (Sprint 10-12, Weeks 19-23)

### Task 7.1: AI Infrastructure
**Effort**: 6 hours | **Dependencies**: 4.1

- [ ] 7.1.1: Install Anthropic SDK: `pnpm add @anthropic-ai/sdk`
- [ ] 7.1.2: Create `src/server/services/ai.service.ts`:
  - Claude API client initialization
  - Prompt template management
  - Rate limiting (Redis-based, 50 requests/day/user)
  - Response caching (Redis with TTL)
  - Streaming support
- [ ] 7.1.3: Create `ai` tRPC router
- [ ] 7.1.4: Add AiCache model for response caching
- [ ] 7.1.5: Create BullMQ worker for async AI jobs
- [ ] 7.1.6: Add `ANTHROPIC_API_KEY` to env

**AC**: AI service can call Claude API with rate limiting and caching

### Task 7.2: Task Summarization
**Effort**: 4 hours | **Dependencies**: 7.1

- [ ] 7.2.1: Create `ai.summarizeTask` mutation
- [ ] 7.2.2: Build context: fetch task + description + last 20 comments + subtasks
- [ ] 7.2.3: Create summarization prompt template
- [ ] 7.2.4: Add "Summarize" button (sparkle icon ✨) to task detail pane
- [ ] 7.2.5: Display summary in collapsible section at top of task detail
- [ ] 7.2.6: Cache summary for 1 hour, invalidate on new comments
- [ ] 7.2.7: Loading state with skeleton while generating

**AC**: Click "Summarize" generates 2-3 sentence summary of task and discussion

### Task 7.3: AI Project Status Generation
**Effort**: 4 hours | **Dependencies**: 7.1, 5.5

- [ ] 7.3.1: Create `ai.generateStatus` mutation
- [ ] 7.3.2: Build context: tasks completed/created/overdue in past 7 days, milestones, blockers
- [ ] 7.3.3: Create status generation prompt template
- [ ] 7.3.4: Add "Generate with AI" button to status update composer
- [ ] 7.3.5: Pre-fill status update form with AI-generated content (editable draft)
- [ ] 7.3.6: Include status recommendation (On Track / At Risk / Off Track)

**AC**: AI generates draft status update from project activity, user edits and posts

### Task 7.4: Natural Language Task Creation
**Effort**: 4 hours | **Dependencies**: 7.1

- [ ] 7.4.1: Create `ai.parseNaturalLanguage` mutation
- [ ] 7.4.2: Create parsing prompt (extract: title, assignee, due date, project from free text)
- [ ] 7.4.3: Use Claude's structured output (JSON mode)
- [ ] 7.4.4: Add NL input to command palette (⌘K → type "create a task for...")
- [ ] 7.4.5: Show parsed fields for user confirmation
- [ ] 7.4.6: On confirm, create task with parsed fields

**AC**: Type "Create a task for Sarah to review the homepage by Friday" → creates structured task

### Task 7.5: AI Chat Assistant
**Effort**: 8 hours | **Dependencies**: 7.1

- [ ] 7.5.1: Create `ai.chat` mutation with streaming
- [ ] 7.5.2: Build context retriever: workspace data, project stats, task queries
- [ ] 7.5.3: Create system prompt with workspace context and query capabilities
- [ ] 7.5.4: Build `<AiChatPanel>` component:
  - Toggle button in sidebar or ⌘J shortcut
  - Chat message history
  - Input with send button
  - Streaming response display
  - Clickable task/project links in responses
- [ ] 7.5.5: Implement query types:
  - "What tasks are overdue?" → query tasks WHERE dueDate < now AND status = INCOMPLETE
  - "Show me John's tasks" → query tasks WHERE assignee = John
  - "Summarize this week" → aggregate task activity
- [ ] 7.5.6: Rate limit chat messages (20/hour)

**AC**: AI chat answers questions about workspace data with streaming responses

### Task 7.6: Semantic Search
**Effort**: 6 hours | **Dependencies**: 7.1

- [ ] 7.6.1: Install pgvector extension on Neon database
- [ ] 7.6.2: Create TaskEmbedding table (taskId + 1536-dimension vector)
- [ ] 7.6.3: Install OpenAI SDK: `pnpm add openai`
- [ ] 7.6.4: Create embedding generation service (text-embedding-3-small)
- [ ] 7.6.5: BullMQ job: generate embedding on task create/update
- [ ] 7.6.6: Implement vector similarity search query
- [ ] 7.6.7: Combine with FTS for hybrid results (weighted scoring)
- [ ] 7.6.8: Update search UI to show relevance indicators

**AC**: Search understands natural language intent and returns semantically relevant results

### Task 7.7: AI Smart Suggestions
**Effort**: 4 hours | **Dependencies**: 7.1

- [ ] 7.7.1: Create `ai.suggestPriority` query (analyze task context → priority score)
- [ ] 7.7.2: Create `ai.suggestAssignee` query (analyze team workload → best assignee)
- [ ] 7.7.3: Show suggestions as subtle hints in task creation/editing
- [ ] 7.7.4: User can accept or dismiss suggestions
- [ ] 7.7.5: Add "AI suggested" badge to auto-suggestions

**AC**: AI suggestions appear during task creation for priority and assignee

---

## Phase 8: Admin, Settings & Polish (Sprint 12-13, Weeks 23-25)

### Task 8.1: Admin Console
**Effort**: 6 hours | **Dependencies**: 1.2

- [ ] 8.1.1: Build Admin page at `/(dashboard)/settings/admin`
- [ ] 8.1.2: Member management table: name, email, role, joined date, actions
- [ ] 8.1.3: Bulk invite via email list
- [ ] 8.1.4: Change roles, remove members
- [ ] 8.1.5: Workspace settings: name, description, defaults
- [ ] 8.1.6: Only show admin page to OWNER and ADMIN roles

**AC**: Admins can manage all workspace members and settings

### Task 8.2: Notification Preferences
**Effort**: 3 hours | **Dependencies**: 4.2

- [ ] 8.2.1: Build notification settings page
- [ ] 8.2.2: Per-event-type toggle: in-app, email, both, none
- [ ] 8.2.3: Save preferences in user settings
- [ ] 8.2.4: Respect preferences when creating notifications and sending emails

**AC**: Users can configure which events generate notifications and emails

### Task 8.3: Keyboard Shortcuts
**Effort**: 4 hours | **Dependencies**: 2.3

- [ ] 8.3.1: Install keyboard shortcut library or build custom hook
- [ ] 8.3.2: Implement shortcuts:
  - `⌘K` / `Ctrl+K`: Open search
  - `Tab+Q`: Quick add task
  - `Tab+I`: Go to Inbox
  - `Enter`: Open selected task
  - `Escape`: Close detail pane / modal
  - `⌘+Enter`: Save and close
  - `Up/Down`: Navigate task list
  - `Space`: Complete/uncomplete task
  - `Tab+M`: Assign to myself
- [ ] 8.3.3: Build keyboard shortcut reference modal (⌘/ to open)
- [ ] 8.3.4: Ensure shortcuts don't conflict with OS or browser

**AC**: All shortcuts work correctly, reference guide accessible

### Task 8.4: Dark Mode
**Effort**: 3 hours | **Dependencies**: 0.2

- [ ] 8.4.1: Configure Tailwind dark mode (class-based)
- [ ] 8.4.2: Create dark theme color palette
- [ ] 8.4.3: Add theme toggle in settings and user dropdown
- [ ] 8.4.4: Store preference in localStorage and user settings
- [ ] 8.4.5: Ensure all components look correct in dark mode

**AC**: Dark mode toggle works, all pages/components render correctly in both themes

### Task 8.5: UI Polish
**Effort**: 8 hours | **Dependencies**: All previous

- [ ] 8.5.1: Add loading skeletons for all data-loading states
- [ ] 8.5.2: Add empty states with illustrations for all sections
- [ ] 8.5.3: Add error boundaries with friendly error pages
- [ ] 8.5.4: Refine all animations (sidebar, detail pane, drag-and-drop)
- [ ] 8.5.5: Ensure all focus states have visible indicators
- [ ] 8.5.6: Audit and fix WCAG 2.1 AA issues (color contrast, ARIA labels, keyboard nav)
- [ ] 8.5.7: Add toast notifications for all actions (task created, saved, deleted)
- [ ] 8.5.8: Add responsive breakpoints (tablet-friendly layout)

**AC**: All UI states polished, no blank loading screens, consistent interactions

### Task 8.6: Onboarding Flow
**Effort**: 4 hours | **Dependencies**: 8.5

- [ ] 8.6.1: Create welcome screen after first login
- [ ] 8.6.2: Workspace creation wizard (name, invite members)
- [ ] 8.6.3: Create sample project with example tasks
- [ ] 8.6.4: Feature tooltip tour (highlight sidebar, create button, views)
- [ ] 8.6.5: Mark onboarding complete flag on user

**AC**: New users guided through setup, sample project created

---

## Phase 9: Testing & Deployment (Sprint 13-14, Weeks 25-28)

### Task 9.1: Unit & Integration Tests
**Effort**: 10 hours | **Dependencies**: All

- [ ] 9.1.1: Set up Vitest with TypeScript support
- [ ] 9.1.2: Unit tests for all tRPC procedures (mock Prisma, test input validation)
- [ ] 9.1.3: Unit tests for rule engine (trigger evaluation, action execution)
- [ ] 9.1.4: Unit tests for AI service (prompt construction, response parsing)
- [ ] 9.1.5: Unit tests for search service (query construction)
- [ ] 9.1.6: Component tests with Testing Library:
  - TaskRow interaction
  - TaskCard display
  - TaskDetailPane fields
  - BoardView drag-and-drop
  - CommandPalette keyboard navigation
- [ ] 9.1.7: Target: >80% code coverage on server code

**AC**: All critical paths have tests, >80% server coverage

### Task 9.2: E2E Tests
**Effort**: 8 hours | **Dependencies**: All

- [ ] 9.2.1: Set up Playwright
- [ ] 9.2.2: E2E test: Registration → Create Workspace → Create Project → Create Task → Complete Task
- [ ] 9.2.3: E2E test: Login → My Tasks → Mark Task Complete
- [ ] 9.2.4: E2E test: Project List View → Sort → Filter → Group By
- [ ] 9.2.5: E2E test: Board View → Drag Card Between Columns
- [ ] 9.2.6: E2E test: Search → Navigate to Result
- [ ] 9.2.7: E2E test: AI Summary → Chat → NL Task Creation
- [ ] 9.2.8: E2E test: Real-time → Two browser sessions, changes sync
- [ ] 9.2.9: Run E2E tests in CI

**AC**: All critical user flows pass E2E tests

### Task 9.3: Performance Optimization
**Effort**: 8 hours | **Dependencies**: All

- [ ] 9.3.1: Run Lighthouse audit on all pages, document baseline scores
- [ ] 9.3.2: Bundle analysis: identify and code-split large dependencies
- [ ] 9.3.3: Optimize images: next/image for all images, WebP format
- [ ] 9.3.4: Database: identify N+1 queries with Prisma logging, add includes/selects
- [ ] 9.3.5: Database: add missing indexes identified by slow query log
- [ ] 9.3.6: Redis: add caching for hot queries (home dashboard, my tasks count)
- [ ] 9.3.7: Lazy load heavy components: Timeline, Calendar, Charts, Tiptap editor
- [ ] 9.3.8: Virtual scrolling: ensure task lists use virtualization for 500+ tasks
- [ ] 9.3.9: Re-run Lighthouse, target >90 on all metrics

**AC**: Lighthouse Performance > 90, Accessibility > 95 on all pages

### Task 9.4: Production Deployment
**Effort**: 4 hours | **Dependencies**: 9.3

- [ ] 9.4.1: Create Vercel project and connect git repository
- [ ] 9.4.2: Configure production environment variables on Vercel
- [ ] 9.4.3: Create production Neon database (with daily backups enabled)
- [ ] 9.4.4: Create production Upstash Redis instance
- [ ] 9.4.5: Create production Cloudflare R2 bucket with CORS configured
- [ ] 9.4.6: Run Prisma migrations against production database
- [ ] 9.4.7: Set up Sentry project for production error tracking
- [ ] 9.4.8: Configure custom domain and SSL
- [ ] 9.4.9: Seed production with demo workspace for testing
- [ ] 9.4.10: Smoke test all features on production
- [ ] 9.4.11: Set up uptime monitoring

**AC**: App live on custom domain, all features working, error tracking active

### Task 9.5: Documentation
**Effort**: 4 hours | **Dependencies**: 9.4

- [ ] 9.5.1: Write README.md with setup instructions
- [ ] 9.5.2: Document all environment variables
- [ ] 9.5.3: Document API (auto-generated from tRPC with trpc-openapi)
- [ ] 9.5.4: Document database schema and key relationships
- [ ] 9.5.5: Contributing guide for other developers

**AC**: New developer can set up the project from README alone

---

## Dependency Graph

```
Phase 0 (Setup)
  ├── 0.1 Init ──────────┬── 0.2 Tailwind/shadcn
  │                       ├── 0.3 Prisma/DB ──────┬── 0.4 tRPC
  │                       └── 0.6 Tooling          └── 0.5 Auth.js
  │
Phase 1 (Foundation)
  ├── 1.1 Profile ────────── 0.5
  ├── 1.2 Workspace ──────── 0.5
  ├── 1.3 Teams ──────────── 1.2
  ├── 1.4 Layout ─────────── 1.2
  └── 1.5 Email ──────────── 0.5
  │
Phase 2 (Tasks)
  ├── 2.1 Projects ────────── 1.3
  ├── 2.2 Sections ────────── 2.1
  ├── 2.3 Task CRUD ───────── 2.2
  ├── 2.4 Rich Text ───────── 2.3
  ├── 2.5 Subtasks ────────── 2.3
  ├── 2.6 Dependencies ────── 2.3
  ├── 2.7 Comments ────────── 2.4
  ├── 2.8 Attachments ─────── 2.3
  ├── 2.9 Custom Fields ───── 2.3
  └── 2.10 Tags ───────────── 2.3
  │
Phase 3 (Views)
  ├── 3.1 List View ───────── 2.3, 2.9
  ├── 3.2 Board View ──────── 2.2, 2.3
  ├── 3.3 Calendar View ───── 2.3
  ├── 3.4 Timeline View ───── 2.6
  ├── 3.5 Other Tabs ──────── 2.1
  └── 3.6 Tab Switching ───── 3.1-3.5
  │
Phase 4 (Collab)
  ├── 4.1 Real-time ───────── 0.4
  ├── 4.2 Notifications ───── 4.1
  ├── 4.3 Home ────────────── 4.2
  ├── 4.4 My Tasks ────────── 3.1, 3.2
  └── 4.5 Search ──────────── 2.3
  │
Phase 5 (Advanced)
  ├── 5.1 Portfolios ──────── 2.1
  ├── 5.2 Goals ───────────── 1.3
  ├── 5.3 Reporting ───────── 2.3
  ├── 5.4 Adv Search ──────── 4.5
  └── 5.5 Status Updates ──── 2.4
  │
Phase 6 (Automation)
  ├── 6.1 Rules ───────────── 2.3
  ├── 6.2 Forms ───────────── 2.9
  ├── 6.3 Templates ───────── 2.2
  └── 6.4 Multi-home/Recur ── 2.3
  │
Phase 7 (AI)
  ├── 7.1 AI Infra ────────── 4.1
  ├── 7.2 Summarization ───── 7.1
  ├── 7.3 Status Gen ──────── 7.1, 5.5
  ├── 7.4 NL Task Creation ── 7.1
  ├── 7.5 Chat Assistant ──── 7.1
  ├── 7.6 Semantic Search ──── 7.1
  └── 7.7 Smart Suggestions ── 7.1
  │
Phase 8 (Polish)
  ├── 8.1 Admin ───────────── 1.2
  ├── 8.2 Notif Prefs ─────── 4.2
  ├── 8.3 Keyboard ────────── 2.3
  ├── 8.4 Dark Mode ───────── 0.2
  ├── 8.5 UI Polish ───────── All
  └── 8.6 Onboarding ──────── 8.5
  │
Phase 9 (Ship)
  ├── 9.1 Unit Tests ──────── All
  ├── 9.2 E2E Tests ───────── All
  ├── 9.3 Performance ─────── All
  ├── 9.4 Deploy ──────────── 9.3
  └── 9.5 Documentation ───── 9.4
```

---

## Effort Summary

| Phase | Tasks | Estimated Hours | Sprints |
|-------|-------|----------------|---------|
| Phase 0: Setup | 6 | 15 | 0.5 |
| Phase 1: Foundation | 5 | 28 | 1.5 |
| Phase 2: Tasks | 10 | 53 | 3 |
| Phase 3: Views | 6 | 52 | 2.5 |
| Phase 4: Collaboration | 5 | 32 | 1.5 |
| Phase 5: Advanced | 5 | 36 | 2 |
| Phase 6: Automation | 4 | 26 | 1.5 |
| Phase 7: AI | 7 | 36 | 2 |
| Phase 8: Polish | 6 | 28 | 1.5 |
| Phase 9: Testing/Deploy | 5 | 34 | 1.5 |
| **Total** | **59 tasks** | **~340 hours** | **~14 sprints** |

---

## Risk Mitigation Checkpoints

| Sprint | Checkpoint | Risk Check |
|--------|-----------|------------|
| 2 | Auth + Workspace working | Can we register, login, create workspace? |
| 4 | Task CRUD + List View | Can we create/edit/complete tasks in a functional list? |
| 6 | All 4 views working | Do List, Board, Calendar, Timeline all render and interact? |
| 7 | Real-time working | Do changes sync between two browser windows? |
| 9 | Portfolios + Goals + Reports | Do advanced features work with real data? |
| 10 | Rules engine working | Do automated rules fire correctly? |
| 12 | AI features working | Do summarization, chat, NL creation work? |
| 14 | Production live | Is the app deployed and stable? |
