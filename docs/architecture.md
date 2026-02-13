# Architecture Document
# TaskFlow AI — Technical Architecture

**Version**: 1.0
**Date**: February 9, 2026
**Author**: Animesh Mahato

---

## Table of Contents

1. [Technology Stack](#1-technology-stack)
2. [System Architecture](#2-system-architecture)
3. [Database Schema](#3-database-schema)
4. [API Design](#4-api-design)
5. [Real-time Architecture](#5-real-time-architecture)
6. [AI/ML Pipeline](#6-aiml-pipeline)
7. [Authentication & Authorization](#7-authentication--authorization)
8. [File Storage Architecture](#8-file-storage-architecture)
9. [Search Architecture](#9-search-architecture)
10. [Security Architecture](#10-security-architecture)
11. [Scalability Strategy](#11-scalability-strategy)
12. [Monitoring & Observability](#12-monitoring--observability)
13. [Development & Deployment](#13-development--deployment)
14. [Key Architectural Decisions](#14-key-architectural-decisions)

---

## 1. Technology Stack

### 1.1 Complete Stack Overview

| Layer | Technology | Version | Justification |
|-------|-----------|---------|---------------|
| **Frontend Framework** | Next.js (App Router) | 15.x | Server Components for performance, built-in routing, API routes, excellent Vercel integration |
| **Language** | TypeScript | 5.x (strict) | End-to-end type safety, catches bugs at compile time, essential for complex domain |
| **Styling** | Tailwind CSS | v4 | Utility-first for rapid development, excellent tree-shaking, consistent design tokens |
| **UI Components** | shadcn/ui + Radix UI | Latest | Copy-paste accessible components, fully customizable, no version lock-in |
| **Client State** | Zustand | 5.x | Lightweight (~1KB), simple API for UI state (sidebar, modals, command palette) |
| **Server State** | TanStack Query | v5 | Caching, optimistic updates, background refetch, infinite scroll, SSE integration |
| **API Layer** | tRPC | v11 | End-to-end type safety from server to client, zero API schema duplication |
| **Database** | PostgreSQL | 16 | Relational integrity, JSONB for custom fields, full-text search, proven at scale |
| **ORM** | Prisma | v6 | Type-safe queries, excellent migration system, visual schema management |
| **Real-time** | Server-Sent Events (SSE) | - | Works with serverless, one-way server push for notifications and data updates |
| **Bidirectional RT** | Socket.io | v4 | Only for collaborative editing where true bidirectional is required |
| **Authentication** | Auth.js (NextAuth) | v5 | Deep Next.js integration, OAuth + credentials, session management |
| **File Storage** | Cloudflare R2 | - | S3-compatible, zero egress fees, presigned URL uploads |
| **AI Provider** | Anthropic Claude API | Latest | Task summarization, NL understanding, structured output, streaming |
| **Embeddings** | OpenAI Embeddings API | text-embedding-3-small | For semantic search with pgvector |
| **Vector DB** | pgvector (PostgreSQL ext) | 0.7+ | Semantic search without additional infrastructure |
| **Search (MVP)** | PostgreSQL Full-Text Search | Built-in | Good enough for MVP, zero additional cost |
| **Search (Scale)** | Meilisearch | 1.x | Typo tolerance, faceted search, sub-50ms results |
| **Cache** | Redis (Upstash) | 7.x | Session store, rate limiting, pub/sub, BullMQ backing |
| **Job Queue** | BullMQ | 5.x | Background jobs: email, AI processing, reports, webhooks |
| **Email** | Resend | - | Developer-friendly API, React Email templates |
| **Rich Text** | Tiptap | 2.x | ProseMirror-based, collaborative editing, extensible |
| **Charts** | Recharts | 2.x | React-native charting, composable, responsive |
| **DnD** | @dnd-kit | 6.x | Accessible drag-and-drop, tree + sortable support |
| **Date Handling** | date-fns | 3.x | Tree-shakeable, immutable, timezone support |
| **Validation** | Zod | 3.x | Runtime validation, integrates natively with tRPC |
| **Testing** | Vitest + Testing Library + Playwright | Latest | Unit + component + E2E testing |
| **Deployment** | Vercel | - | Serverless, edge network, preview deployments |
| **DB Hosting** | Neon | - | Serverless PostgreSQL, auto-scaling, branching |
| **Redis Hosting** | Upstash | - | Serverless Redis, auto-scaling, per-request pricing |
| **Monitoring** | Sentry + Vercel Analytics | - | Error tracking + Core Web Vitals |
| **Logging** | Pino | 9.x | Structured JSON logging, fast, low overhead |

### 1.2 Package Manager & Build Tools

| Tool | Purpose |
|------|---------|
| pnpm | Package manager (faster than npm, strict dependency resolution) |
| Turbopack | Next.js bundler (dev server) |
| ESLint | Code linting with Next.js + TypeScript rules |
| Prettier | Code formatting |
| Husky + lint-staged | Pre-commit hooks |

---

## 2. System Architecture

### 2.1 High-Level Architecture Diagram

```
                            ┌─────────────────────────┐
                            │    Vercel Edge Network   │
                            │    (CDN + Edge Cache)    │
                            └────────────┬────────────┘
                                         │
                            ┌────────────▼────────────┐
                            │   Next.js 15 Application │
                            │   (Vercel Serverless)    │
                            ├──────────────────────────┤
                            │                          │
                            │  ┌─────────┐ ┌────────┐ │
                            │  │ App     │ │ API    │ │
                            │  │ Router  │ │ Routes │ │
                            │  │ (RSC +  │ │        │ │
                            │  │ Client) │ │ tRPC   │ │
                            │  └────┬────┘ └───┬────┘ │
                            │       │          │       │
                            │  ┌────▼──────────▼────┐ │
                            │  │    Auth.js v5      │ │
                            │  │  (Session/JWT)     │ │
                            │  └────────┬───────────┘ │
                            │           │              │
                            └───────────┼──────────────┘
                                        │
                   ┌────────────────────┼────────────────────┐
                   │                    │                     │
          ┌────────▼────────┐ ┌────────▼────────┐ ┌────────▼────────┐
          │   PostgreSQL    │ │     Redis        │ │  Cloudflare R2  │
          │   (Neon)        │ │   (Upstash)      │ │  (File Storage) │
          │                 │ │                   │ │                  │
          │ • User data     │ │ • Session store   │ │ • Attachments    │
          │ • Tasks         │ │ • Rate limiting   │ │ • Avatars        │
          │ • Projects      │ │ • Pub/Sub         │ │ • File uploads   │
          │ • Comments      │ │ • BullMQ queue    │ │                  │
          │ • Custom fields │ │ • Query cache     │ │                  │
          │ • FTS indexes   │ │                   │ │                  │
          │ • pgvector      │ │                   │ │                  │
          └─────────────────┘ └────────┬──────────┘ └──────────────────┘
                                       │
                              ┌────────▼────────┐
                              │  BullMQ Workers  │
                              │  (Background)    │
                              ├──────────────────┤
                              │ • Email (Resend) │
                              │ • AI Processing  │
                              │   (Claude API)   │
                              │ • Report Gen     │
                              │ • Notifications  │
                              │ • Webhooks       │
                              └──────────────────┘
```

### 2.2 Client-Side Architecture

```
┌──────────────────────────────────────────────────────┐
│                    Browser (Client)                    │
├──────────────────────────────────────────────────────┤
│                                                        │
│  ┌──────────────────┐  ┌────────────────────────────┐ │
│  │  React Server    │  │  React Client Components   │ │
│  │  Components      │  │                            │ │
│  │  (Layout, Page)  │  │  ┌──────────────────────┐ │ │
│  │                  │  │  │  TanStack Query      │ │ │
│  │  • Fetches data  │  │  │  (Server State)      │ │ │
│  │    on server     │  │  │  • Cache management  │ │ │
│  │  • Streams HTML  │  │  │  • Optimistic update │ │ │
│  │  • SEO-ready     │  │  │  • Background refetch│ │ │
│  └──────────────────┘  │  └──────────┬───────────┘ │ │
│                         │             │              │ │
│                         │  ┌──────────▼───────────┐ │ │
│                         │  │    tRPC Client       │ │ │
│                         │  │  (Type-safe RPC)     │ │ │
│                         │  └──────────┬───────────┘ │ │
│                         │             │              │ │
│                         │  ┌──────────▼───────────┐ │ │
│                         │  │  Zustand Stores      │ │ │
│                         │  │  (Client UI State)   │ │ │
│                         │  │  • Sidebar state     │ │ │
│                         │  │  • Modal state       │ │ │
│                         │  │  • Selection state   │ │ │
│                         │  │  • Theme             │ │ │
│                         │  └──────────────────────┘ │ │
│                         │                            │ │
│                         │  ┌──────────────────────┐ │ │
│                         │  │  SSE Client          │ │ │
│                         │  │  (Real-time events)  │ │ │
│                         │  │  • Task updates      │ │ │
│                         │  │  • Notifications     │ │ │
│                         │  │  • Presence          │ │ │
│                         │  └──────────────────────┘ │ │
│                         └────────────────────────────┘ │
└──────────────────────────────────────────────────────┘
```

### 2.3 Data Flow — Task Creation Example

```
1. User fills Quick Add form (Client Component)
         │
2. tRPC mutation: tasks.create({...})
         │
3. Auth.js middleware validates JWT session
         │
4. Zod validates input schema
         │
5. Prisma creates Task + TaskProject records in PostgreSQL
         │
6. Redis PUBLISH event to channel "workspace:{id}:events"
         │      └──> { type: "TASK_CREATED", task: {...}, userId: ... }
         │
7. Return created task to caller (optimistic update already shown)
         │
8. BullMQ enqueues jobs:
         ├──> notifyFollowers(taskId)  → Resend email + DB notification
         ├──> executeRules(taskId)     → Check & fire matching rules
         └──> indexForSearch(taskId)   → Update FTS index
         │
9. SSE subscribers on channel receive event
         │
10. TanStack Query invalidates relevant queries on other clients
```

---

## 3. Database Schema

### 3.1 Entity Relationship Overview

```
Workspace ─┬─── WorkspaceMember ───── User
            │
            ├─── Team ──── TeamMember ──── User
            │
            ├─── Project ─┬── Section ─── TaskProject ─── Task
            │              │                                 │
            │              ├── ProjectCustomField             ├── Subtask (self-ref)
            │              │                                 ├── TaskDependency
            │              └── ProjectMember                 ├── TaskFollower
            │                                                ├── TaskTag
            ├─── CustomFieldDefinition                       ├── TaskCustomFieldValue
            │                                                ├── Comment
            ├─── Tag                                         ├── Attachment
            │                                                └── Like
            ├─── Portfolio ─── PortfolioProject
            │
            ├─── Goal
            │
            ├─── Rule
            │
            ├─── Form
            │
            ├─── Notification
            │
            └─── ProjectTemplate
```

### 3.2 Core Tables (Prisma Schema Format)

```prisma
// ============================================================
// USERS & WORKSPACE
// ============================================================

model User {
  id            String   @id @default(cuid())
  email         String   @unique
  name          String
  avatarUrl     String?
  title         String?
  department    String?
  bio           String?
  passwordHash  String?
  emailVerified DateTime?
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  // Relations
  workspaceMemberships WorkspaceMember[]
  teamMemberships      TeamMember[]
  assignedTasks        Task[]            @relation("TaskAssignee")
  createdTasks         Task[]            @relation("TaskCreator")
  comments             Comment[]
  attachments          Attachment[]
  notifications        Notification[]
  taskFollows          TaskFollower[]
  likes                Like[]
  statusUpdates        StatusUpdate[]
  accounts             Account[]         // OAuth accounts
  sessions             Session[]         // Auth.js sessions
}

model Account {
  id                String  @id @default(cuid())
  userId            String
  type              String
  provider          String
  providerAccountId String
  refresh_token     String?
  access_token      String?
  expires_at        Int?
  token_type        String?
  scope             String?
  id_token          String?

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([provider, providerAccountId])
}

model Session {
  id           String   @id @default(cuid())
  sessionToken String   @unique
  userId       String
  expires      DateTime

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
}

model Workspace {
  id          String   @id @default(cuid())
  name        String
  description String?
  logoUrl     String?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  // Relations
  members              WorkspaceMember[]
  teams                Team[]
  projects             Project[]
  customFieldDefinitions CustomFieldDefinition[]
  tags                 Tag[]
  portfolios           Portfolio[]
  goals                Goal[]
  projectTemplates     ProjectTemplate[]
  tasks                Task[]
}

model WorkspaceMember {
  id          String          @id @default(cuid())
  workspaceId String
  userId      String
  role        WorkspaceRole   @default(MEMBER)
  joinedAt    DateTime        @default(now())

  workspace Workspace @relation(fields: [workspaceId], references: [id], onDelete: Cascade)
  user      User      @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([workspaceId, userId])
  @@index([workspaceId])
  @@index([userId])
}

enum WorkspaceRole {
  OWNER
  ADMIN
  MEMBER
  GUEST
}

// ============================================================
// TEAMS
// ============================================================

model Team {
  id          String   @id @default(cuid())
  name        String
  description String?
  workspaceId String
  createdAt   DateTime @default(now())

  workspace Workspace    @relation(fields: [workspaceId], references: [id], onDelete: Cascade)
  members   TeamMember[]
  projects  Project[]
  goals     Goal[]

  @@index([workspaceId])
}

model TeamMember {
  id     String   @id @default(cuid())
  teamId String
  userId String
  role   TeamRole @default(MEMBER)

  team Team @relation(fields: [teamId], references: [id], onDelete: Cascade)
  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([teamId, userId])
}

enum TeamRole {
  LEAD
  MEMBER
}

// ============================================================
// PROJECTS & SECTIONS
// ============================================================

model Project {
  id          String        @id @default(cuid())
  name        String
  description Json?         // Rich text stored as Tiptap JSON
  color       String        @default("#4573D2")
  icon        String?
  defaultView ProjectView   @default(LIST)
  privacy     ProjectPrivacy @default(PUBLIC)
  isArchived  Boolean       @default(false)
  startDate   DateTime?
  dueDate     DateTime?
  workspaceId String
  teamId      String?
  createdById String
  createdAt   DateTime      @default(now())
  updatedAt   DateTime      @updatedAt

  workspace     Workspace           @relation(fields: [workspaceId], references: [id], onDelete: Cascade)
  team          Team?               @relation(fields: [teamId], references: [id])
  sections      Section[]
  taskProjects  TaskProject[]
  customFields  ProjectCustomField[]
  members       ProjectMember[]
  statusUpdates StatusUpdate[]
  rules         Rule[]
  forms         Form[]
  portfolioLinks PortfolioProject[]

  @@index([workspaceId])
  @@index([teamId])
}

enum ProjectView {
  LIST
  BOARD
  TIMELINE
  CALENDAR
}

enum ProjectPrivacy {
  PUBLIC
  PRIVATE
  SPECIFIC_MEMBERS
}

model ProjectMember {
  id         String            @id @default(cuid())
  projectId  String
  userId     String
  permission ProjectPermission @default(EDITOR)

  project Project @relation(fields: [projectId], references: [id], onDelete: Cascade)

  @@unique([projectId, userId])
}

enum ProjectPermission {
  ADMIN
  EDITOR
  COMMENTER
  VIEWER
}

model Section {
  id        String @id @default(cuid())
  name      String
  projectId String
  position  Float  // Float for fractional ordering

  project      Project       @relation(fields: [projectId], references: [id], onDelete: Cascade)
  taskProjects TaskProject[]

  @@index([projectId, position])
}

// ============================================================
// TASKS
// ============================================================

model Task {
  id             String    @id @default(cuid())
  title          String
  description    Json?     // Rich text as Tiptap JSON
  status         TaskStatus @default(INCOMPLETE)
  completedAt    DateTime?
  assigneeId     String?
  parentTaskId   String?   // For subtasks (self-referencing)
  dueDate        DateTime?
  startDate      DateTime?
  isRecurring    Boolean   @default(false)
  recurrenceRule Json?     // { frequency: "WEEKLY", interval: 1, daysOfWeek: [...] }
  isMilestone    Boolean   @default(false)
  workspaceId    String
  createdById    String
  createdAt      DateTime  @default(now())
  updatedAt      DateTime  @updatedAt

  // Self-relation for subtasks
  parentTask Task?  @relation("TaskSubtasks", fields: [parentTaskId], references: [id])
  subtasks   Task[] @relation("TaskSubtasks")

  assignee   User?     @relation("TaskAssignee", fields: [assigneeId], references: [id])
  createdBy  User      @relation("TaskCreator", fields: [createdById], references: [id])
  workspace  Workspace @relation(fields: [workspaceId], references: [id])

  // Many-to-many with Projects (multi-homing)
  taskProjects     TaskProject[]
  // Dependencies
  dependsOn        TaskDependency[] @relation("DependentTask")
  blocking         TaskDependency[] @relation("BlockingTask")
  // Metadata
  customFieldValues TaskCustomFieldValue[]
  tags             TaskTag[]
  followers        TaskFollower[]
  // Content
  comments         Comment[]
  attachments      Attachment[]
  likes            Like[]

  @@index([assigneeId, status])
  @@index([workspaceId, updatedAt])
  @@index([parentTaskId])
  @@index([dueDate])
}

enum TaskStatus {
  INCOMPLETE
  COMPLETE
}

model TaskProject {
  id        String @id @default(cuid())
  taskId    String
  projectId String
  sectionId String?
  position  Float  // Float for fractional ordering

  task    Task     @relation(fields: [taskId], references: [id], onDelete: Cascade)
  project Project  @relation(fields: [projectId], references: [id], onDelete: Cascade)
  section Section? @relation(fields: [sectionId], references: [id])

  @@unique([taskId, projectId])
  @@index([projectId, sectionId, position])
}

model TaskDependency {
  id              String @id @default(cuid())
  taskId          String // The dependent task
  dependsOnTaskId String // The blocking task

  task      Task @relation("DependentTask", fields: [taskId], references: [id], onDelete: Cascade)
  dependsOn Task @relation("BlockingTask", fields: [dependsOnTaskId], references: [id], onDelete: Cascade)

  @@unique([taskId, dependsOnTaskId])
}

model TaskFollower {
  id     String @id @default(cuid())
  taskId String
  userId String

  task Task @relation(fields: [taskId], references: [id], onDelete: Cascade)
  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([taskId, userId])
}

// ============================================================
// CUSTOM FIELDS
// ============================================================

model CustomFieldDefinition {
  id          String          @id @default(cuid())
  name        String
  type        CustomFieldType
  options     Json?           // For DROPDOWN: [{ id, label, color }]
  workspaceId String
  createdById String
  createdAt   DateTime        @default(now())

  workspace      Workspace              @relation(fields: [workspaceId], references: [id], onDelete: Cascade)
  projectFields  ProjectCustomField[]
  taskValues     TaskCustomFieldValue[]

  @@index([workspaceId])
}

enum CustomFieldType {
  TEXT
  NUMBER
  DATE
  SINGLE_SELECT
  MULTI_SELECT
  PEOPLE
  CURRENCY
  PERCENTAGE
}

model ProjectCustomField {
  id             String @id @default(cuid())
  projectId      String
  customFieldId  String
  position       Int    @default(0)

  project     Project              @relation(fields: [projectId], references: [id], onDelete: Cascade)
  customField CustomFieldDefinition @relation(fields: [customFieldId], references: [id], onDelete: Cascade)

  @@unique([projectId, customFieldId])
}

model TaskCustomFieldValue {
  id              String  @id @default(cuid())
  taskId          String
  customFieldId   String
  stringValue     String?
  numberValue     Float?
  dateValue       DateTime?
  selectedOptions Json?   // For SINGLE_SELECT/MULTI_SELECT: [optionId, ...]

  task        Task                  @relation(fields: [taskId], references: [id], onDelete: Cascade)
  customField CustomFieldDefinition @relation(fields: [customFieldId], references: [id], onDelete: Cascade)

  @@unique([taskId, customFieldId])
}

// ============================================================
// COMMENTS & ATTACHMENTS
// ============================================================

model Comment {
  id        String   @id @default(cuid())
  taskId    String
  authorId  String
  body      Json     // Rich text as Tiptap JSON
  isPinned  Boolean  @default(false)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  task   Task @relation(fields: [taskId], references: [id], onDelete: Cascade)
  author User @relation(fields: [authorId], references: [id])
  likes  Like[]

  @@index([taskId, createdAt])
}

model Attachment {
  id           String   @id @default(cuid())
  taskId       String
  uploadedById String
  fileName     String
  fileUrl      String
  fileSize     Int      // bytes
  mimeType     String
  createdAt    DateTime @default(now())

  task       Task @relation(fields: [taskId], references: [id], onDelete: Cascade)
  uploadedBy User @relation(fields: [uploadedById], references: [id])

  @@index([taskId])
}

model Like {
  id         String   @id @default(cuid())
  userId     String
  taskId     String?
  commentId  String?
  createdAt  DateTime @default(now())

  user    User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  task    Task?    @relation(fields: [taskId], references: [id], onDelete: Cascade)
  comment Comment? @relation(fields: [commentId], references: [id], onDelete: Cascade)

  @@unique([userId, taskId])
  @@unique([userId, commentId])
}

// ============================================================
// TAGS
// ============================================================

model Tag {
  id          String @id @default(cuid())
  name        String
  color       String @default("#6D6E6F")
  workspaceId String

  workspace Workspace @relation(fields: [workspaceId], references: [id], onDelete: Cascade)
  tasks     TaskTag[]

  @@unique([workspaceId, name])
}

model TaskTag {
  id     String @id @default(cuid())
  taskId String
  tagId  String

  task Task @relation(fields: [taskId], references: [id], onDelete: Cascade)
  tag  Tag  @relation(fields: [tagId], references: [id], onDelete: Cascade)

  @@unique([taskId, tagId])
}

// ============================================================
// NOTIFICATIONS
// ============================================================

model Notification {
  id           String           @id @default(cuid())
  userId       String           // Recipient
  type         NotificationType
  resourceType String           // "task", "project", "comment", etc.
  resourceId   String
  actorId      String?          // Who triggered the notification
  message      String?
  isRead       Boolean          @default(false)
  isArchived   Boolean          @default(false)
  createdAt    DateTime         @default(now())

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId, isRead, createdAt])
  @@index([userId, isArchived, createdAt])
}

enum NotificationType {
  TASK_ASSIGNED
  TASK_COMPLETED
  COMMENT_ADDED
  MENTIONED
  STATUS_UPDATE
  APPROVAL_REQUEST
  FOLLOWER_ADDED
  DUE_DATE_APPROACHING
  TASK_OVERDUE
}

// ============================================================
// STATUS UPDATES
// ============================================================

model StatusUpdate {
  id        String             @id @default(cuid())
  projectId String?
  portfolioId String?
  authorId  String
  status    ProjectStatusType
  title     String
  body      Json               // Rich text as Tiptap JSON
  createdAt DateTime           @default(now())

  project   Project?  @relation(fields: [projectId], references: [id], onDelete: Cascade)
  author    User      @relation(fields: [authorId], references: [id])

  @@index([projectId, createdAt])
}

enum ProjectStatusType {
  ON_TRACK
  AT_RISK
  OFF_TRACK
  ON_HOLD
  COMPLETE
}

// ============================================================
// PORTFOLIOS
// ============================================================

model Portfolio {
  id              String  @id @default(cuid())
  name            String
  description     String?
  workspaceId     String
  ownerId         String
  parentPortfolioId String?
  createdAt       DateTime @default(now())

  workspace       Workspace          @relation(fields: [workspaceId], references: [id], onDelete: Cascade)
  parentPortfolio Portfolio?         @relation("NestedPortfolios", fields: [parentPortfolioId], references: [id])
  childPortfolios Portfolio[]        @relation("NestedPortfolios")
  projects        PortfolioProject[]

  @@index([workspaceId])
}

model PortfolioProject {
  id          String @id @default(cuid())
  portfolioId String
  projectId   String

  portfolio Portfolio @relation(fields: [portfolioId], references: [id], onDelete: Cascade)
  project   Project   @relation(fields: [projectId], references: [id], onDelete: Cascade)

  @@unique([portfolioId, projectId])
}

// ============================================================
// GOALS
// ============================================================

model Goal {
  id              String      @id @default(cuid())
  name            String
  description     String?
  workspaceId     String
  teamId          String?
  ownerId         String
  parentGoalId    String?
  status          GoalStatus  @default(ON_TRACK)
  currentValue    Float       @default(0)
  targetValue     Float       @default(100)
  unit            String      @default("percent")
  timePeriodStart DateTime?
  timePeriodEnd   DateTime?
  createdAt       DateTime    @default(now())
  updatedAt       DateTime    @updatedAt

  workspace  Workspace @relation(fields: [workspaceId], references: [id], onDelete: Cascade)
  team       Team?     @relation(fields: [teamId], references: [id])
  parentGoal Goal?     @relation("GoalHierarchy", fields: [parentGoalId], references: [id])
  childGoals Goal[]    @relation("GoalHierarchy")

  @@index([workspaceId])
}

enum GoalStatus {
  ON_TRACK
  AT_RISK
  OFF_TRACK
  CLOSED
}

// ============================================================
// AUTOMATION (RULES & FORMS)
// ============================================================

model Rule {
  id        String  @id @default(cuid())
  name      String
  projectId String
  trigger   Json    // { type: "TASK_ADDED_TO_SECTION", sectionId: "..." }
  conditions Json?  // [{ field: "status", operator: "equals", value: "..." }]
  actions   Json    // [{ type: "SET_ASSIGNEE", userId: "..." }]
  isActive  Boolean @default(true)
  createdById String
  createdAt DateTime @default(now())

  project Project @relation(fields: [projectId], references: [id], onDelete: Cascade)

  @@index([projectId, isActive])
}

model Form {
  id          String  @id @default(cuid())
  name        String
  description String?
  projectId   String
  fields      Json    // [{ name, type, required, options, mappedField }]
  isPublished Boolean @default(false)
  publicSlug  String? @unique
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  project Project @relation(fields: [projectId], references: [id], onDelete: Cascade)

  @@index([publicSlug])
}

model ProjectTemplate {
  id           String @id @default(cuid())
  name         String
  description  String?
  templateData Json   // Snapshot of sections, tasks, rules
  workspaceId  String
  createdById  String
  createdAt    DateTime @default(now())

  workspace Workspace @relation(fields: [workspaceId], references: [id], onDelete: Cascade)

  @@index([workspaceId])
}

// ============================================================
// AI FEATURES
// ============================================================

model AiCache {
  id           String   @id @default(cuid())
  resourceType String   // "task_summary", "status_update", "embedding"
  resourceId   String
  result       Json     // Cached AI response
  model        String   // "claude-haiku", "claude-sonnet"
  createdAt    DateTime @default(now())
  expiresAt    DateTime

  @@unique([resourceType, resourceId])
  @@index([expiresAt])
}

// ============================================================
// ACTIVITY LOG
// ============================================================

model ActivityLog {
  id           String   @id @default(cuid())
  taskId       String
  userId       String
  action       String   // "created", "completed", "assigned", "field_changed", etc.
  field        String?  // Which field changed
  oldValue     String?
  newValue     String?
  createdAt    DateTime @default(now())

  @@index([taskId, createdAt])
}
```

### 3.3 Key Database Indexes

```sql
-- Performance-critical indexes (beyond Prisma defaults)

-- My Tasks query: all tasks for a user, sorted by due date
CREATE INDEX idx_task_assignee_status_due ON "Task" ("assigneeId", "status", "dueDate");

-- Project list view: tasks in a project/section, ordered by position
CREATE INDEX idx_taskproject_project_section_pos ON "TaskProject" ("projectId", "sectionId", "position");

-- Inbox: user's notifications, unread first
CREATE INDEX idx_notification_user_read_created ON "Notification" ("userId", "isRead", "createdAt" DESC);

-- Full-text search on tasks
CREATE INDEX idx_task_fts ON "Task" USING GIN (to_tsvector('english', "title" || ' ' || COALESCE("description"::text, '')));

-- Semantic search with pgvector (Phase 3)
-- CREATE INDEX idx_task_embedding ON "TaskEmbedding" USING ivfflat (embedding vector_cosine_ops);
```

---

## 4. API Design

### 4.1 tRPC Router Structure

```typescript
// src/server/trpc/router.ts — Root Router

export const appRouter = createTRPCRouter({
  auth:          authRouter,
  workspaces:    workspacesRouter,
  teams:         teamsRouter,
  projects:      projectsRouter,
  sections:      sectionsRouter,
  tasks:         tasksRouter,
  subtasks:      subtasksRouter,
  comments:      commentsRouter,
  attachments:   attachmentsRouter,
  customFields:  customFieldsRouter,
  notifications: notificationsRouter,
  portfolios:    portfoliosRouter,
  goals:         goalsRouter,
  search:        searchRouter,
  reporting:     reportingRouter,
  rules:         rulesRouter,
  forms:         formsRouter,
  ai:            aiRouter,
});
```

### 4.2 Key Procedures (Selected Examples)

```typescript
// tasks router — key procedures
tasksRouter = {
  // Queries
  list:            publicProcedure.input(TaskListInput).query(...)      // Filterable, sortable, paginated
  get:             publicProcedure.input(z.object({ id: z.string() })).query(...)
  myTasks:         protectedProcedure.input(MyTasksInput).query(...)

  // Mutations
  create:          protectedProcedure.input(CreateTaskInput).mutation(...)
  update:          protectedProcedure.input(UpdateTaskInput).mutation(...)
  delete:          protectedProcedure.input(z.object({ id: z.string() })).mutation(...)
  complete:        protectedProcedure.input(z.object({ id: z.string() })).mutation(...)
  uncomplete:      protectedProcedure.input(z.object({ id: z.string() })).mutation(...)
  move:            protectedProcedure.input(MoveTaskInput).mutation(...)
  reorder:         protectedProcedure.input(ReorderTaskInput).mutation(...)
  addToProject:    protectedProcedure.input(AddToProjectInput).mutation(...)
  removeFromProject: protectedProcedure.input(RemoveFromProjectInput).mutation(...)
  setCustomField:  protectedProcedure.input(SetCustomFieldInput).mutation(...)
  addDependency:   protectedProcedure.input(AddDependencyInput).mutation(...)
  addFollower:     protectedProcedure.input(AddFollowerInput).mutation(...)
}

// ai router — key procedures
aiRouter = {
  summarizeTask:        protectedProcedure.input(z.object({ taskId: z.string() })).mutation(...)
  generateStatus:       protectedProcedure.input(z.object({ projectId: z.string() })).mutation(...)
  suggestPriority:      protectedProcedure.input(z.object({ taskId: z.string() })).query(...)
  chat:                 protectedProcedure.input(z.object({ message: z.string(), workspaceId: z.string() })).mutation(...)  // streaming
  parseNaturalLanguage: protectedProcedure.input(z.object({ text: z.string() })).mutation(...)
  suggestAssignee:      protectedProcedure.input(z.object({ taskId: z.string() })).query(...)
}
```

### 4.3 Input Validation Schemas (Zod)

```typescript
// Example: CreateTaskInput
const CreateTaskInput = z.object({
  title: z.string().min(1).max(500),
  description: z.any().optional(),       // Tiptap JSON
  assigneeId: z.string().cuid().optional(),
  dueDate: z.date().optional(),
  startDate: z.date().optional(),
  projectId: z.string().cuid(),
  sectionId: z.string().cuid().optional(),
  parentTaskId: z.string().cuid().optional(),
  tagIds: z.array(z.string().cuid()).optional(),
  customFields: z.array(z.object({
    customFieldId: z.string().cuid(),
    value: z.union([z.string(), z.number(), z.date(), z.array(z.string())]),
  })).optional(),
});
```

---

## 5. Real-time Architecture

### 5.1 Event Flow

```
┌─────────┐    mutation    ┌──────────┐    publish    ┌─────────┐
│  Client  │──────────────>│  tRPC    │──────────────>│  Redis  │
│  (User A)│               │  Server  │               │  Pub/Sub│
└─────────┘               └──────────┘               └────┬────┘
                                                          │
                                                     subscribe
                                                          │
                                                    ┌─────▼─────┐
                                                    │    SSE     │
                                                    │  Endpoint  │
                                                    └──┬─────┬──┘
                                                       │     │
                                              event    │     │    event
                                                       │     │
                                                ┌──────▼┐  ┌─▼──────┐
                                                │Client │  │Client  │
                                                │(User B)│  │(User C)│
                                                └───────┘  └────────┘
```

### 5.2 SSE Endpoint

```typescript
// /api/realtime/subscribe — Server-Sent Events endpoint
// Client connects with: EventSource('/api/realtime/subscribe?workspaceId=xxx')

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const workspaceId = searchParams.get('workspaceId');

  // Verify user session and workspace membership
  const session = await auth();
  if (!session) return new Response('Unauthorized', { status: 401 });

  const stream = new ReadableStream({
    start(controller) {
      // Subscribe to Redis channel
      const channel = `workspace:${workspaceId}:events`;
      const subscriber = redis.subscribe(channel, (message) => {
        const event = JSON.parse(message);
        // Filter: only send events the user should see
        if (shouldUserSeeEvent(session.user.id, event)) {
          controller.enqueue(`data: ${JSON.stringify(event)}\n\n`);
        }
      });

      // Heartbeat every 30s to keep connection alive
      const heartbeat = setInterval(() => {
        controller.enqueue(': heartbeat\n\n');
      }, 30000);

      // Cleanup on disconnect
      request.signal.addEventListener('abort', () => {
        subscriber.unsubscribe();
        clearInterval(heartbeat);
        controller.close();
      });
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}
```

### 5.3 Event Types

```typescript
type RealtimeEvent = {
  type:
    | 'TASK_CREATED' | 'TASK_UPDATED' | 'TASK_COMPLETED' | 'TASK_DELETED'
    | 'COMMENT_ADDED' | 'COMMENT_UPDATED'
    | 'PROJECT_UPDATED'
    | 'SECTION_REORDERED'
    | 'NOTIFICATION_NEW'
    | 'STATUS_UPDATE_POSTED'
    | 'PRESENCE_JOIN' | 'PRESENCE_LEAVE';
  payload: Record<string, unknown>;
  userId: string;      // Who triggered the event
  timestamp: string;
};
```

### 5.4 Client Integration with TanStack Query

```typescript
// useRealtimeSubscription hook
function useRealtimeSubscription(workspaceId: string) {
  const queryClient = useQueryClient();

  useEffect(() => {
    const eventSource = new EventSource(
      `/api/realtime/subscribe?workspaceId=${workspaceId}`
    );

    eventSource.onmessage = (event) => {
      const data: RealtimeEvent = JSON.parse(event.data);

      switch (data.type) {
        case 'TASK_UPDATED':
          // Invalidate the specific task query
          queryClient.invalidateQueries({ queryKey: ['tasks', data.payload.taskId] });
          // Invalidate the project's task list
          queryClient.invalidateQueries({ queryKey: ['tasks', 'list', data.payload.projectId] });
          break;
        case 'NOTIFICATION_NEW':
          queryClient.invalidateQueries({ queryKey: ['notifications'] });
          break;
        // ... other event handlers
      }
    };

    return () => eventSource.close();
  }, [workspaceId, queryClient]);
}
```

---

## 6. AI/ML Pipeline

### 6.1 Architecture

```
┌──────────┐     tRPC     ┌───────────┐    check    ┌──────────┐
│  Client   │────────────>│  AI Router │───────────>│  Redis   │
│           │             │            │   cache     │  Cache   │
└──────────┘             └─────┬──────┘             └────┬─────┘
                                │                         │
                           cache miss               cache hit
                                │                         │
                         ┌──────▼──────┐            return cached
                         │   BullMQ    │            response
                         │   Queue     │
                         └──────┬──────┘
                                │
                         ┌──────▼──────┐
                         │  AI Worker  │
                         ├─────────────┤
                         │ 1. Fetch    │
                         │    context  │───> PostgreSQL (task, comments, project data)
                         │ 2. Build    │
                         │    prompt   │
                         │ 3. Call API │───> Claude API (Anthropic)
                         │ 4. Parse    │
                         │    response │
                         │ 5. Cache    │───> Redis (TTL-based)
                         │ 6. Return   │
                         └─────────────┘
```

### 6.2 Prompt Templates

```typescript
// Task Summarization Prompt
const TASK_SUMMARY_PROMPT = `
You are a project management assistant. Summarize the following task and its discussion thread concisely.

Task: {title}
Description: {description}
Subtasks: {subtaskList}
Comments ({commentCount} total):
{recentComments}

Provide a 2-3 sentence summary covering:
1. What the task is about
2. Current status/progress
3. Key decisions or blockers mentioned in comments

Format: Return plain text, no markdown headers.
`;

// Project Status Generation Prompt
const STATUS_GENERATION_PROMPT = `
You are a project manager writing a weekly status update.

Project: {projectName}
Time period: {startDate} to {endDate}

Activity this period:
- Tasks completed: {completedCount} ({completedList})
- Tasks created: {createdCount}
- Tasks overdue: {overdueCount} ({overdueList})
- Comments: {commentCount}
- Milestones hit: {milestonesList}

Based on this data, generate a status update with:
1. Overall status recommendation: ON_TRACK, AT_RISK, or OFF_TRACK
2. Summary paragraph (3-4 sentences)
3. Key accomplishments (bullet points)
4. Blockers or risks (bullet points, if any)
5. Next steps (bullet points)

Return as JSON: { status, summary, accomplishments: [], blockers: [], nextSteps: [] }
`;
```

### 6.3 Cost Management Strategy

| Strategy | Implementation |
|----------|---------------|
| Response caching | Cache in Redis with TTL (1h for summaries, 24h for status updates) |
| Model selection | Haiku for simple tasks (summaries), Sonnet for complex (status generation) |
| Rate limiting | 50 AI requests/day per free user, 200/day for paid |
| Batch processing | Generate embeddings in off-peak batches, not per-request |
| Token budgets | Limit context window per request (max 4K tokens input) |
| Cache invalidation | Only invalidate when underlying data changes |

---

## 7. Authentication & Authorization

### 7.1 Auth Flow

```
Registration:
  1. User submits email + password
  2. Zod validates input
  3. bcrypt hashes password (cost factor 12)
  4. Create User record in PostgreSQL
  5. Send verification email via Resend
  6. User clicks email link → emailVerified set

Login:
  1. User submits credentials
  2. bcrypt.compare password
  3. Auth.js creates JWT session
  4. JWT stored in httpOnly, SameSite=Strict, Secure cookie
  5. Refresh token rotation on each request

OAuth:
  1. User clicks "Sign in with Google"
  2. Auth.js redirects to Google OAuth consent
  3. Google returns authorization code
  4. Auth.js exchanges for tokens
  5. Create/link User + Account records
  6. JWT session created
```

### 7.2 Authorization Middleware

```typescript
// Every tRPC procedure goes through this authorization chain:
// 1. Session check (is user logged in?)
// 2. Workspace membership check (is user in this workspace?)
// 3. Resource permission check (does user have access to this project/task?)

const protectedProcedure = t.procedure.use(async ({ ctx, next }) => {
  if (!ctx.session?.user) {
    throw new TRPCError({ code: 'UNAUTHORIZED' });
  }
  return next({ ctx: { ...ctx, user: ctx.session.user } });
});

const workspaceProcedure = protectedProcedure.use(async ({ ctx, input, next }) => {
  const workspaceId = (input as any).workspaceId;
  const membership = await prisma.workspaceMember.findUnique({
    where: { workspaceId_userId: { workspaceId, userId: ctx.user.id } }
  });
  if (!membership) {
    throw new TRPCError({ code: 'FORBIDDEN' });
  }
  return next({ ctx: { ...ctx, membership } });
});
```

---

## 8. File Storage Architecture

### 8.1 Upload Flow (Presigned URLs)

```
1. Client requests upload URL:
   tRPC: attachments.getUploadUrl({ fileName, mimeType, fileSize })

2. Server generates presigned PUT URL from Cloudflare R2:
   - Validates file type and size (max 100MB)
   - Generates unique key: uploads/{workspaceId}/{taskId}/{uuid}/{fileName}
   - Returns: { uploadUrl, fileKey }

3. Client uploads directly to R2:
   fetch(uploadUrl, { method: 'PUT', body: file, headers: { 'Content-Type': mimeType } })

4. Client confirms upload:
   tRPC: attachments.create({ taskId, fileName, fileUrl, fileSize, mimeType })

5. Server creates Attachment record in PostgreSQL
```

### 8.2 Access Control

- Presigned GET URLs for reading files (1-hour expiry)
- Files are not publicly accessible
- URL generation checks user's workspace membership

---

## 9. Search Architecture

### 9.1 MVP: PostgreSQL Full-Text Search

```sql
-- Search query
SELECT * FROM "Task"
WHERE to_tsvector('english', "title" || ' ' || COALESCE("description"::text, ''))
      @@ plainto_tsquery('english', $1)
AND "workspaceId" = $2
ORDER BY ts_rank(
  to_tsvector('english', "title" || ' ' || COALESCE("description"::text, '')),
  plainto_tsquery('english', $1)
) DESC
LIMIT 20;
```

### 9.2 Phase 3: Semantic Search with pgvector

```
1. When task is created/updated:
   - BullMQ job generates embedding via OpenAI text-embedding-3-small
   - Store 1536-dimension vector in TaskEmbedding table

2. When user searches:
   - Generate embedding for search query
   - Cosine similarity search: ORDER BY embedding <=> query_embedding LIMIT 20
   - Combine with FTS results for hybrid ranking
```

---

## 10. Security Architecture

| Layer | Protection | Implementation |
|-------|-----------|----------------|
| Transport | HTTPS/TLS 1.3 | Vercel automatic |
| Authentication | JWT + httpOnly cookies | Auth.js v5 |
| Authorization | RBAC middleware | tRPC middleware chain |
| Input validation | Schema validation | Zod on all tRPC inputs |
| SQL injection | Parameterized queries | Prisma ORM (auto) |
| XSS | Output escaping | React (auto) + DOMPurify for rich text |
| CSRF | SameSite cookies + origin check | Auth.js config |
| Rate limiting | Token bucket | Redis-based, per user/IP |
| File upload | Type + size validation | Presigned URL with restrictions |
| Secrets | Environment variables | Vercel encrypted env vars |
| Dependencies | CVE scanning | npm audit + Dependabot |
| Headers | Security headers | Next.js middleware (CSP, HSTS, X-Frame-Options) |

---

## 11. Scalability Strategy

### 11.1 Caching Layers

```
Layer 1: Browser Cache
  └── TanStack Query (stale-while-revalidate, 5min staleTime)

Layer 2: CDN Cache
  └── Vercel Edge Network (static assets, ISR pages)

Layer 3: Application Cache
  └── Redis (API response caching, session store, AI response cache)

Layer 4: Database Cache
  └── PostgreSQL query plan cache + shared buffers
  └── Neon connection pooling
```

### 11.2 Database Scaling

| Phase | Strategy |
|-------|----------|
| MVP | Single Neon database (free tier, auto-scaling compute) |
| Growth | Neon read replicas for reporting/search queries |
| Scale | Table partitioning on workspace_id for large tables |
| Enterprise | Dedicated PostgreSQL cluster with PgBouncer connection pooling |

---

## 12. Monitoring & Observability

| Concern | Tool | What |
|---------|------|------|
| Error tracking | Sentry | Client + server errors with source maps |
| Performance | Vercel Analytics | Core Web Vitals, page load times |
| API monitoring | Custom middleware | Log request duration, status codes |
| Database | Neon dashboard | Query performance, connection count |
| Redis | Upstash dashboard | Memory usage, operations/sec |
| Uptime | BetterUptime | External ping monitoring |
| Logging | Pino → Vercel Logs | Structured JSON logs |
| Alerting | Sentry alerts | Error rate spikes, performance regressions |

---

## 13. Development & Deployment

### 13.1 Project Structure

```
src/
├── app/                          # Next.js App Router
│   ├── (auth)/                   # Auth route group (login, register)
│   │   ├── login/page.tsx
│   │   ├── register/page.tsx
│   │   └── layout.tsx
│   ├── (dashboard)/              # Main app route group
│   │   ├── home/page.tsx
│   │   ├── my-tasks/page.tsx
│   │   ├── inbox/page.tsx
│   │   ├── projects/[projectId]/
│   │   │   ├── list/page.tsx
│   │   │   ├── board/page.tsx
│   │   │   ├── timeline/page.tsx
│   │   │   ├── calendar/page.tsx
│   │   │   ├── overview/page.tsx
│   │   │   ├── files/page.tsx
│   │   │   ├── messages/page.tsx
│   │   │   └── dashboard/page.tsx
│   │   ├── portfolios/page.tsx
│   │   ├── goals/page.tsx
│   │   ├── reporting/page.tsx
│   │   ├── search/page.tsx
│   │   ├── teams/[teamId]/page.tsx
│   │   ├── settings/page.tsx
│   │   └── layout.tsx            # Sidebar + topbar layout
│   ├── api/
│   │   ├── trpc/[trpc]/route.ts
│   │   ├── auth/[...nextauth]/route.ts
│   │   └── realtime/subscribe/route.ts
│   ├── layout.tsx
│   └── page.tsx                  # Landing / redirect
├── components/
│   ├── ui/                       # shadcn/ui components
│   ├── layout/                   # Sidebar, Topbar, TaskDetailPane
│   ├── tasks/                    # TaskRow, TaskCard, TaskForm, TaskDetail
│   ├── projects/                 # ListView, BoardView, TimelineView, CalendarView
│   ├── home/                     # Dashboard widgets
│   ├── inbox/                    # Notification items
│   └── shared/                   # RichTextEditor, Avatar, DatePicker, etc.
├── server/
│   ├── trpc/                     # tRPC setup + routers
│   │   ├── router.ts
│   │   ├── trpc.ts
│   │   ├── context.ts
│   │   └── routers/              # Individual route files
│   ├── db/
│   │   ├── prisma.ts             # Prisma client singleton
│   │   └── seed.ts
│   └── services/                 # Business logic
│       ├── notification.service.ts
│       ├── realtime.service.ts
│       ├── ai.service.ts
│       ├── rule-engine.service.ts
│       └── search.service.ts
├── lib/
│   ├── utils.ts
│   ├── constants.ts
│   └── validations/              # Shared Zod schemas
├── stores/                       # Zustand stores
├── hooks/                        # Custom React hooks
└── types/                        # Shared TypeScript types
```

### 13.2 CI/CD Pipeline

```
Push to main branch
  │
  ├── Lint (ESLint)
  ├── Type check (tsc --noEmit)
  ├── Unit tests (Vitest)
  ├── Build (next build)
  │
  └── Deploy to Vercel (auto)
       ├── Preview deployment (PR branches)
       └── Production deployment (main branch)

Nightly:
  ├── E2E tests (Playwright)
  ├── Dependency audit (npm audit)
  └── Lighthouse CI (performance regression)
```

---

## 14. Key Architectural Decisions

### ADR-01: tRPC over REST API
- **Decision**: Use tRPC v11 for all API communication
- **Rationale**: Eliminates API contract drift, auto-generated types from server to client, excellent DX
- **Trade-off**: Couples client to server (can't serve a separate mobile app without a REST adapter)
- **Mitigation**: Can add REST endpoints later via tRPC's OpenAPI adapter if mobile app needed

### ADR-02: SSE over WebSocket for most real-time
- **Decision**: SSE as primary real-time transport, WebSocket only for collaborative editing
- **Rationale**: SSE works with serverless (Vercel), simpler than WebSocket, sufficient for one-way updates
- **Trade-off**: Can't do bidirectional communication for collaborative editing
- **Mitigation**: Add Socket.io only for the collaborative editing feature in Phase 3

### ADR-03: Prisma over Drizzle ORM
- **Decision**: Use Prisma v6 as the ORM
- **Rationale**: Superior migration system, visual schema management, mature ecosystem for 30+ table schema
- **Trade-off**: Slightly higher runtime overhead than Drizzle
- **Mitigation**: Prisma v6 has significant performance improvements; use raw SQL for hot paths

### ADR-04: Zustand + TanStack Query over Redux
- **Decision**: Zustand for client state, TanStack Query for server state
- **Rationale**: Clean separation of concerns; Zustand is ~1KB for UI state; TanStack Query handles all caching/syncing for API data
- **Trade-off**: Two libraries instead of one
- **Mitigation**: They serve different purposes and compose well together

### ADR-05: Cloudflare R2 over AWS S3
- **Decision**: Use Cloudflare R2 for file storage
- **Rationale**: Zero egress fees (huge cost savings for file-heavy app), S3-compatible API
- **Trade-off**: Slightly less mature ecosystem than S3
- **Mitigation**: S3-compatible means trivial migration if needed

### ADR-06: Monolith over Microservices
- **Decision**: Single Next.js application (monolith)
- **Rationale**: Small team, manageable complexity, shared types, single deployment
- **Trade-off**: Can't scale services independently
- **Mitigation**: Clean module boundaries allow future extraction; tRPC routers are already logically separated

### ADR-07: PostgreSQL FTS over Elasticsearch/Meilisearch for MVP
- **Decision**: Start with PostgreSQL full-text search, migrate to Meilisearch later
- **Rationale**: Zero additional infrastructure for MVP, PG FTS is "good enough" for <100K tasks
- **Trade-off**: No typo tolerance, slower for large datasets, less relevance tuning
- **Mitigation**: Meilisearch migration planned for Phase 3; search interface is abstracted behind a service

### ADR-08: Float-based ordering over Integer positions
- **Decision**: Use `Float` type for `position` fields (sections, tasks)
- **Rationale**: Allows inserting between any two items without reindexing (e.g., position 1.5 between 1 and 2)
- **Trade-off**: Floating point precision issues over many insertions
- **Mitigation**: Periodic rebalancing job that re-assigns clean integer positions
