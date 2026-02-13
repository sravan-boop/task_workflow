# Asana UI Documentation

> Generated from live screenshots of app.asana.com on February 9, 2026
> Account: animesh@freedomwithai.com | Plan: Starter (with trial features visible)

---

## Table of Contents

1. [Global Layout & Navigation](#1-global-layout--navigation)
2. [Home Dashboard](#2-home-dashboard)
3. [My Tasks](#3-my-tasks)
4. [Inbox](#4-inbox)
5. [Projects](#5-projects)
6. [Task Detail & Creation](#6-task-detail--creation)
7. [Portfolios](#7-portfolios)
8. [Goals](#8-goals)
9. [Reporting](#9-reporting)
10. [Search](#10-search)
11. [Settings & Admin](#11-settings--admin)
12. [Teams](#12-teams)
13. [Design System & Patterns](#13-design-system--patterns)

---

## 1. Global Layout & Navigation

### 1.1 Overall Page Structure

Asana uses a **3-panel layout**:

```
┌─────────────────────────────────────────────────────────────────────┐
│ [≡] [Asana Logo]          [🔍 Search         ⌘K]    [?] [AM ▾]   │  <- Top Bar
├────────────┬────────────────────────────────────────────────────────┤
│            │                                                        │
│  Sidebar   │              Main Content Area                         │
│  (~180px)  │              (fluid width)                             │
│            │                                                        │
│ + Create   │  ┌─ Header ─────────────────────────────────────────┐ │
│            │  │ Page Title    [view tabs]         [Share][Custom] │ │
│ Home       │  ├──────────────────────────────────────────────────┤ │
│ My tasks   │  │                                                   │ │
│ Inbox      │  │              Content Region                       │ │
│            │  │              (scrollable)                          │ │
│ ─────────  │  │                                                   │ │
│ Insights   │  │                                                   │ │
│  Reporting │  │                                    ┌────────────┐ │ │
│  Portfolios│  │                                    │ Task Detail │ │ │
│  Goals     │  │                                    │ Pane        │ │ │
│            │  │                                    │ (slide-out) │ │ │
│ ─────────  │  │                                    └────────────┘ │ │
│ Projects   │  └──────────────────────────────────────────────────┘ │
│  + New     │                                                        │
│  Video Ed..│                                                        │
│ ─────────  │                                                        │
│ Teams      │                                                        │
│  Animesh's │                                                        │
│  Browse... │                                                        │
│            │                                                        │
│ [Upgrade]  │                                                        │
│ [Invite]   │                                                        │
└────────────┴────────────────────────────────────────────────────────┘
```

### 1.2 Top Navigation Bar

**Height**: ~48px
**Background**: White with subtle bottom border
**Contents** (left to right):
- **Hamburger menu** (≡): Toggles sidebar collapse/expand
- **Asana logo**: Pink/coral gradient logo mark + "asana" wordmark
- **Search bar**: Centered, pill-shaped input with placeholder "Search" and ⌘K shortcut badge
- **Help icon** (?): Circle with question mark, opens help panel
- **User avatar** (AM): Circular avatar with user initials, dropdown for profile/settings/logout

**Browser warning banner** (conditional):
- Yellow/amber background banner below top bar
- "You are on an old version of a browser..." warning text
- "See supported browsers" link button on right

### 1.3 Sidebar Navigation

**Width**: ~180px (expanded), ~48px (collapsed with icons only)
**Background**: Light cream/beige (`#FFF8F0` approximate)
**Structure**:

1. **Create button**: Pink/coral pill button with "+" icon, positioned at top
2. **Primary navigation** (icon + label):
   - 🏠 Home
   - ✓ My tasks
   - 📥 Inbox
3. **Insights section** (collapsible, with + button):
   - 📊 Reporting
   - 📁 Portfolios
   - 🎯 Goals
4. **Projects section** (collapsible, with + button):
   - Lists user's projects with colored dot indicators
   - e.g., "🟢 Video Editing Team"
5. **Teams section** (collapsible, with + button):
   - Lists teams with team avatar
   - e.g., "👥 Animesh's first team" with expand arrow (>)
   - "Browse teams" link
6. **Bottom section** (fixed to bottom):
   - **Upgrade button**: Orange/amber background, full-width
   - **Invite teammates**: Text link with envelope icon

**Active state**: Active item has darker background highlight, slightly left-indented
**Hover state**: Light background on hover
**Collapse behavior**: Hamburger icon toggles sidebar between expanded (labels visible) and collapsed (icons only)

### 1.4 Main Content Area

**Layout**: Fluid width, takes remaining space after sidebar
**Structure**:
- **Page header**: Title + action buttons + view tabs
- **Content region**: Scrollable area with the main content
- **Task detail pane** (conditional): Slides in from right when a task is clicked (~450px wide)

---

## 2. Home Dashboard

**URL path**: `/home`
**Screenshot**: `02-home-dashboard/01-home-full.png`

### 2.1 Page Header
- Greeting: "Good afternoon, Animesh" (time-based greeting)
- Date: "Monday, February 9"
- Stats bar: "My week ▾ | ✓ 0 tasks completed | 👥 0 Collaborators | ⚙ Customize"

### 2.2 Widget Grid Layout

The home page uses a **card-based grid layout** (2 columns):

**Left Column:**
1. **My tasks** widget:
   - User avatar + "My tasks" title + link icon
   - Tabs: Upcoming | Overdue (6) | Completed
   - "+ Create task" action link
   - Task list with checkboxes, task names, due dates, and assignee avatars
   - Each task row: `[☐] [task name blurred] [due date] [avatar]`

**Right Column:**
1. **Projects** widget:
   - Title: "Projects" | Recents ▾
   - Cards: "+ Create project" card + project cards
   - Project card: Icon + project name + team name

2. **Tasks I've assigned** widget:
   - Title + "..." menu
   - Upgrade prompt (Starter plan): "Upgrade to Asana Starter to keep track of tasks..."
   - "Try for free" button
   - Task list below (blurred in free tier)

3. **Goals** widget:
   - Title + "..." menu
   - "Restore Advanced to make traction on your goals"
   - "Restore Asana Advanced" button
   - Goal progress bars (90%, 75%, 90%)

4. **People** widget (below fold):
   - "Frequent collaborators ▾" dropdown
   - "Browse teams" link

### 2.3 Visual Design Notes
- Background: Light cream/warm beige
- Cards: White with rounded corners (~12px), subtle shadow
- Each widget has a "..." overflow menu (top right)
- Customizable via "⚙ Customize" button

---

## 3. My Tasks

**URL path**: `/my-tasks`
**Screenshots**: `03-my-tasks/01-list-view.png`, `02-board-view.png`, `03-calendar-view.png`

### 3.1 Page Header
- User avatar + "My tasks" title + dropdown arrow (▾)
- View tabs: **List** | **Board** | **Calendar** | **Files** | **+** (add view)
- Right actions: [🔒 Share] [⚙ Customize]

### 3.2 List View (Default)
- Spreadsheet-like layout
- Each row: `[☐ checkbox] [task name] [custom field columns...] [due date] [avatar]`
- Sections group tasks (Recently Assigned, Today, Upcoming, Later)
- Inline task creation at bottom of each section
- Column headers are sortable

### 3.3 Board View
- Kanban-style columns
- Columns based on sections (e.g., Recently Assigned, Do Today, Do Later)
- Cards show: task name, due date, assignee avatar
- Drag-and-drop between columns
- "+ Add task" at bottom of each column

### 3.4 Calendar View
- Monthly calendar grid
- Tasks displayed on their due dates
- Navigation: < > arrows for month
- Click on date to create task

### 3.5 Files Tab
- Grid of all attachments
- Empty state: Illustration + "All attachments to tasks & messages in this project will appear here"

---

## 4. Inbox

**URL path**: `/inbox`
**Screenshot**: `04-inbox/01-inbox-full.png`

### 4.1 Page Header
- Title: "Inbox"
- Right action: "Manage notifications" link
- Tabs: **Activity** | **Bookmarks** | **Archive** | **+**

### 4.2 Toolbar
- Filter button with filter icon
- Density toggle: "Density: Detailed"
- "..." overflow menu

### 4.3 Empty State
- Centered illustration (disco ball graphic)
- "Hooray, you're up to date!"
- "Check back later for updates on your team's work"

### 4.4 Notification Types (when populated)
- Task assigned to you
- Comment on your task
- Task completed
- @mention
- Status update
- Approval request

---

## 5. Projects

**Screenshots**: `05-project-views/01-list-view.png` through `08-dashboard.png`

### 5.1 Team Page (Landing)
- Large team avatar (circle with initial)
- Team name: "Animesh's first team"
- "Click to add team description..." placeholder
- "Create work ▾" button
- Tabs: **Overview** | **All work** | **Messages** | **Calendar** | **+**
- "Finish setting up your team" onboarding card (0 of 3 steps):
  1. "Add team description" - Describe your team's purpose
  2. "Add work" - Link existing projects, portfolios
  3. "Add teammates" - Start collaborating

### 5.2 Team Sections
- **Curated work**: "View all work" link, shows project cards
- **Members**: "View all 1" link, shows member avatars with + button
- "Add work" button at bottom

### 5.3 Project Views (Inside a Project)

View tabs appear in project header: **List** | **Board** | **Timeline** | **Calendar** | **Overview** | **Files** | **Messages** | **Dashboard** | **+**

**List View**:
- Spreadsheet layout with columns
- Sections act as row groups
- Inline editing of all cells
- Custom field columns appear after default columns
- Row actions on hover (more menu, subtask indicator)

**Board View** (Kanban):
- Columns = sections
- Cards = tasks with assignee avatar, due date, priority
- Drag and drop cards between columns
- "+ Add task" button per column

**Timeline View** (Gantt):
- Horizontal bars represent tasks
- X-axis = time (days/weeks/months)
- Dependency arrows connect related tasks
- Unscheduled tasks in a side panel
- Zoom controls for time scale

**Calendar View**:
- Standard monthly grid
- Tasks appear on due date cells
- Color-coded by project or status
- Click to create task on specific date

**Overview Tab**:
- Project brief section (rich text)
- Key resources section
- Milestone list
- Recent status updates

**Files Tab**:
- Grid of all task attachments
- Thumbnail previews for images
- Icon + filename for other file types

**Messages Tab**:
- Threaded conversations about the project
- Create new message button
- @mention support

**Dashboard Tab**:
- Chart widgets (bar, pie, line, burnup)
- Configurable data sources
- Add widget button

---

## 6. Task Detail & Creation

### 6.1 Quick Add Task Modal
**Screenshot**: `14-modals-forms/01-quick-add-task.png`

**Triggered by**: Tab+Q shortcut or "Create" button
**Position**: Bottom-right corner floating panel
**Dimensions**: ~350px wide, ~350px tall

**Layout**:
```
┌─ New task ──────────────────── [—] [✕] ─┐
│                                          │
│  Task name                    (large)    │
│                                          │
│  For [AM Animesh Mahato ✕]  in [Project] │
│                                          │
│  Description                             │
│                                          │
│                                          │
│                                          │
│                                          │
├──────────────────────────────────────────┤
│ [+] [📎] [😀] [@] [🔗] [✨] [📅]  [AM][+] Create task │
└──────────────────────────────────────────┘
```

**Fields**:
- **Task name**: Large text input (placeholder: "Task name")
- **For**: Assignee selector with user chip (auto-filled with current user)
- **in**: Project selector dropdown
- **Description**: Rich text area
- **Bottom toolbar icons** (left to right):
  - ➕ Add to project
  - 📎 Attach file
  - 😀 Emoji
  - @ Mention
  - 🔗 Link
  - ✨ AI (sparkle icon)
  - 📅 Due date
- **Right side**: Assignee avatar + "+" to add more + "Create task" button

### 6.2 Create Menu
**Screenshot**: `14-modals-forms/02-create-menu.png`

The "Create" button opens a menu with quick-create options for various entity types.

### 6.3 Task Detail Pane (Slide-out)
**Triggered by**: Clicking on any task
**Position**: Slides in from right side
**Width**: ~450-500px

**Layout**:
```
┌─────────────────────────────────────┐
│ [Complete ☐] [Task Name]   [⋯] [✕] │
│                                      │
│ Assignee:    [Avatar + Name]         │
│ Due date:    [Date picker]           │
│ Projects:    [Project name]          │
│ Dependencies:[+ Add]                 │
│ Tags:        [+ Add tag]            │
│ Custom fields...                     │
│                                      │
│ ─────────────────────────────────── │
│ Description                          │
│ [Rich text editor area]             │
│                                      │
│ ─────────────────────────────────── │
│ Subtasks                             │
│ [☐] Subtask 1                       │
│ [☐] Subtask 2                       │
│ [+ Add subtask]                     │
│                                      │
│ ─────────────────────────────────── │
│ Comments / Activity                  │
│ [Avatar] User commented...          │
│ [Avatar] User changed status...     │
│                                      │
│ [💬 Comment input]                   │
└─────────────────────────────────────┘
```

---

## 7. Portfolios

**URL path**: `/portfolios`
**Screenshot**: `07-portfolios/01-portfolios-page.png`

### 7.1 Page Structure
- Title: "Portfolios" (under Insights section)
- Premium/Advanced feature gate - shows upgrade prompt on free plans
- Portfolio list with project status columns
- Each portfolio row: Name, Owner, Status (On track/At risk/Off track), Progress bar

### 7.2 Portfolio Detail View
- Project list within portfolio
- Status dashboard
- Custom fields per project
- Workload view (Advanced plan)

---

## 8. Goals

**URL path**: `/goals`
**Screenshot**: `08-goals/01-goals-page.png`

### 8.1 Page Header
- Goal icon + "Goals" title
- Tabs: **Strategy map** | **Company goals** | **Team goals** | **My goals**

### 8.2 Strategy Map View (Default)
- Visual hierarchy of goals as connected cards
- Toolbar: [+] [grid icon] [list icon] [link icon] [columns icon] [-] [+] [⛶ fullscreen]
- Goal cards arranged in a node-graph layout with connecting lines
- Each card: avatar + "Goal" title + progress bar(s) + assignee

### 8.3 Upgrade Prompt
- Modal overlay: "Track progress on key initiatives"
- Description: "Set goals for your company, your team, or yourself..."
- "Learn more" link
- "🎁 Try for free" button

### 8.4 Goal Card Layout
```
┌──────────────────────────────┐
│ [A] Goal                     │
│ ─── ━━━━━━━━ ───             │ (progress indicators)
│ ─── ━━━━━━━━━━━━━━━━━── ──── │
│ ━━━━━━━━━━━━━━━ ─────────── │
│                        [👤]  │
└──────────────────────────────┘
```

---

## 9. Reporting

**URL path**: `/reporting`
**Screenshot**: `09-reporting/01-reporting-page.png`

### 9.1 Page Layout
- Title: "Reporting"
- Upgrade/feature gate for free tier

### 9.2 Feature Preview
- "Stop wondering where work stands" heading
- Description: "Now get actionable insights to keep work on track..."
- "Try for free" button
- Illustration showing various chart types:
  - Bar charts (vertical)
  - Line charts
  - Donut/pie charts
  - Data tables with avatars
  - Connected nodes showing portfolio → project → task hierarchy

### 9.3 Report Types (Available with paid plans)
- Task completion over time (burnup)
- Tasks by status (donut chart)
- Tasks by assignee (bar chart)
- Upcoming deadlines
- Overdue tasks
- Custom field aggregations

---

## 10. Search

**Screenshot**: `10-search/01-search-overlay.png`, `02-search-results.png`

### 10.1 Search Trigger
- Click the search bar in top navigation
- Or use ⌘K keyboard shortcut
- Opens a centered search overlay/modal

### 10.2 Search Overlay
- Large centered search input with focus
- Type-ahead suggestions as you type
- Results grouped by type (Tasks, Projects, People, etc.)
- Recent searches history

### 10.3 Advanced Search Filters
- Assignee
- Projects
- Collaborators
- Completion status
- Due date (date range)
- Custom fields
- Tags

---

## 11. Settings & Admin

**Screenshots**: `11-settings/01-profile-menu.png` through `05-admin-full.png`

### 11.1 Profile Menu Dropdown
**Triggered by**: Clicking user avatar in top bar
**Contents**:
- User name and email
- My Settings
- Admin Console
- Log Out

### 11.2 Settings Page
- Sections:
  - **My Profile**: Name, email, title, department, avatar
  - **Notifications**: Email notification preferences per event type
  - **Display**: Theme (light/dark), language, date format, start of week
  - **Apps**: Connected integrations
  - **Account**: Password change, 2FA, deactivation

### 11.3 Admin Console
- **Members**: User list with search, roles, invite
- **Billing**: Plan details, upgrade options
- **Security**: Password policies, SSO, 2FA enforcement
- **Settings**: Workspace name, default permissions

---

## 12. Teams

**Screenshot**: `12-team/01-sidebar-teams.png`

### 12.1 Team Page Structure
- Team avatar (large circle)
- Team name as heading
- Description placeholder
- "Create work ▾" dropdown button
- Tabs: Overview | All work | Messages | Calendar | +

### 12.2 Team Overview
- "Finish setting up your team" onboarding card
- Setup steps: Add description, Add work, Add teammates
- **Curated work** section with project cards
- **Members** section with avatar chips and invite button

---

## 13. Design System & Patterns

### 13.1 Color Palette (Observed)

| Usage | Color | Approximate Hex |
|-------|-------|----------------|
| Primary brand | Coral/Pink | `#F06A6A` |
| Sidebar background | Warm cream | `#FFF8F0` |
| Page background | Light gray | `#F6F8F9` |
| Card background | White | `#FFFFFF` |
| Primary text | Dark charcoal | `#1E1F21` |
| Secondary text | Gray | `#6D6E6F` |
| Muted text | Light gray | `#9CA3AF` |
| Success/On track | Green | `#4ECB71` |
| Warning/At risk | Yellow/Amber | `#F8DF72` |
| Error/Off track | Red | `#E8384F` |
| Link | Blue | `#4573D2` |
| Create button | Coral gradient | `#F06A6A` → `#E8384F` |
| Upgrade button | Amber/Orange | `#FFB84D` |

### 13.2 Typography

| Element | Size | Weight | Color |
|---------|------|--------|-------|
| Page title | 24px | Bold (600) | Dark |
| Section title | 16px | Semibold (600) | Dark |
| Widget title | 16px | Semibold (600) | Dark |
| Task name | 14px | Normal (400) | Dark |
| Body text | 14px | Normal (400) | Dark |
| Secondary text | 13px | Normal (400) | Gray |
| Label text | 12px | Medium (500) | Gray |
| Button text | 14px | Medium (500) | White/Dark |

**Font family**: Custom sans-serif (similar to -apple-system, "Segoe UI")

### 13.3 Spacing System

- Base unit: 4px
- Card padding: 16px
- Section gaps: 24px
- Sidebar item padding: 8px 12px
- Button padding: 8px 16px

### 13.4 Component Patterns

**Cards/Widgets**:
- White background
- Border-radius: 12px
- Box-shadow: `0 1px 3px rgba(0,0,0,0.08)`
- Optional "..." overflow menu (top-right)

**Buttons**:
- Primary: Coral/pink fill, white text, rounded-full (pill shape)
- Secondary: White background, gray border, dark text
- Ghost: No border, text only with hover highlight
- Icon button: Circular, icon only

**Tabs**:
- Horizontal tab bar
- Active tab: Bold text + bottom border indicator (2px coral)
- Inactive: Normal weight, gray text
- Tabs are always left-aligned under the page title

**Inputs**:
- Border: 1px solid light gray
- Border-radius: 6px
- Focus: Blue border highlight
- Placeholder: Light gray text

**Avatars**:
- Circular, 28-32px for inline, 80px for profile
- Show initials when no image
- Color-coded background for different users
- Green dot for online status (optional)

**Checkbox (Task completion)**:
- Circular checkbox (not square)
- Empty: Gray outline circle
- Hover: Checkmark appears inside
- Complete: Green filled circle with white checkmark

**Empty States**:
- Centered illustration (custom artwork)
- Heading text
- Description text
- CTA button (optional)

### 13.5 Interaction Patterns

**Drag and Drop**:
- Used for: task reordering, column moving, calendar rescheduling
- Visual feedback: Shadow/elevation on dragged item, placeholder in target location

**Inline Editing**:
- Click on any text field to edit in place
- Auto-save on blur/enter
- No explicit save button

**Slide-out Detail Pane**:
- Opens from right on task click
- Pushes content left slightly
- Close with X button or Escape key
- Maintains scroll position

**Modals**:
- Centered overlay with backdrop blur
- Close with X, Escape, or clicking backdrop
- Used for: settings, confirmations, feature gates

**Keyboard Shortcuts**:
- Tab+Q: Quick add task
- Tab+I: Go to Inbox
- ⌘K: Search
- Enter: Open selected task
- Escape: Close modal/pane

### 13.6 Responsive Behavior

- Sidebar collapses to icon-only on smaller screens
- Main content area is fluid
- Task detail pane may overlay (instead of push) on narrow viewports
- Minimum supported width: ~1024px

### 13.7 Notification/Banner Patterns

- **Top banner**: Full-width, colored background (yellow for warnings, blue for info)
- **Toast notifications**: Bottom-right, auto-dismiss after 5s
- **Badge counts**: Red dot on inbox icon with unread count
- **Upgrade prompts**: Inline cards within feature areas, modal overlays for premium features

---

## Screenshot Inventory

| Folder | Count | Contents |
|--------|-------|---------|
| 01-login | 3 | Login page, password entry, post-login state |
| 02-home-dashboard | 2 | Full dashboard viewport + full page |
| 03-my-tasks | 3 | List view, Board view, Calendar view |
| 04-inbox | 2 | Inbox viewport + full page |
| 05-project-views | 4 | List, Calendar, Overview, Messages |
| 06-task-detail | 0 | (No tasks existed to open) |
| 07-portfolios | 2 | Portfolios page viewport + full |
| 08-goals | 2 | Goals page viewport + full |
| 09-reporting | 2 | Reporting page viewport + full |
| 10-search | 2 | Search overlay + search results |
| 11-settings | 5 | Profile menu, settings page (2), admin console (2) |
| 12-team | 1 | Team page / sidebar |
| 13-sidebar | 2 | Expanded + collapsed states |
| 14-modals-forms | 2 | Quick add task modal, create menu |
| 15-automation-rules | 0 | (Not accessible on current plan) |
| **Total** | **32** | |
