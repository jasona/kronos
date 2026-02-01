# Kronos MVP - Task List

**Feature:** MVP Implementation (Phase 1)
**Source:** `prd-kronos.md`
**Standards:** No standards manifest available; standards should be established for team consistency.

---

## Relevant Files

- `package.json` - Project dependencies and scripts
- `svelte.config.js` - SvelteKit configuration
- `tailwind.config.js` - Tailwind CSS configuration
- `vite.config.ts` - Vite bundler configuration
- `prisma/schema.prisma` - Database schema definition
- `src/app.html` - HTML template
- `src/app.css` - Global styles and Tailwind imports
- `src/hooks.server.ts` - Server hooks for auth and request handling
- `src/lib/server/db.ts` - Database client initialization
- `src/lib/server/auth.ts` - Authentication utilities
- `src/lib/server/scheduler.ts` - Cron scheduler engine
- `src/lib/server/executor.ts` - Job execution logic (shell, HTTP, Docker)
- `src/lib/server/notifications.ts` - Notification dispatch (webhook, email)
- `src/lib/utils/index.ts` - Shared utilities (cn helper, etc.)
- `src/lib/utils/cron.ts` - Cron expression parsing and validation
- `src/lib/components/ui/` - shadcn-svelte base components
- `src/routes/(app)/+layout.svelte` - Authenticated app layout
- `src/routes/(app)/+layout.server.ts` - Auth guard for app routes
- `src/routes/(app)/dashboard/+page.svelte` - Dashboard UI
- `src/routes/(app)/dashboard/+page.server.ts` - Dashboard data loading
- `src/routes/(app)/jobs/+page.svelte` - Job list page
- `src/routes/(app)/jobs/+page.server.ts` - Job list data and actions
- `src/routes/(app)/jobs/[id]/+page.svelte` - Job detail/edit page
- `src/routes/(app)/jobs/[id]/+page.server.ts` - Job detail data and actions
- `src/routes/(app)/jobs/[id]/executions/+page.svelte` - Execution history page
- `src/routes/(app)/jobs/[id]/executions/+page.server.ts` - Execution history data
- `src/routes/auth/login/+page.svelte` - Login page
- `src/routes/auth/login/+page.server.ts` - Login form action
- `src/routes/api/jobs/+server.ts` - Jobs REST API
- `src/routes/api/jobs/[id]/+server.ts` - Single job REST API
- `src/routes/api/jobs/[id]/trigger/+server.ts` - Manual job trigger endpoint
- `src/routes/api/executions/+server.ts` - Executions REST API
- `src/routes/api/events/+server.ts` - SSE endpoint for real-time updates
- `Dockerfile` - Multi-stage Docker build
- `docker-compose.yml` - Local development compose file

### Notes

- Unit tests should be placed alongside source files (e.g., `scheduler.ts` and `scheduler.test.ts`)
- Use `npx vitest [path]` to run specific tests
- Use `npx playwright test` for E2E tests

---

## Instructions for Completing Tasks

**IMPORTANT:** As you complete each task, you must check it off in this markdown file by changing `- [ ]` to `- [x]`. This helps track progress and ensures you don't skip any steps.

Example:
- `- [ ] 1.1 Initialize SvelteKit project` → `- [x] 1.1 Initialize SvelteKit project` (after completing)

Update the file after completing each sub-task, not just after completing an entire parent task.

---

## Tasks

- [x] 0.0 Create feature branch
  - [x] 0.1 Create and checkout a new branch: `git checkout -b feature/kronos-mvp`

- [x] 1.0 Project scaffolding and configuration
  - [x] 1.1 Initialize SvelteKit project with TypeScript (`npm create svelte@latest`)
  - [x] 1.2 Install and configure Tailwind CSS
  - [x] 1.3 Install and configure shadcn-svelte (`npx shadcn-svelte@latest init`)
  - [x] 1.4 Add essential shadcn components (Button, Card, Dialog, Input, Label, Table, Badge, Dropdown Menu, Tabs, Toast)
  - [x] 1.5 Install Prisma and initialize with SQLite provider
  - [x] 1.6 Install additional dependencies: zod, node-cron, nodemailer, dockerode
  - [x] 1.7 Configure ESLint and Prettier with project rules
  - [x] 1.8 Create `$lib/utils/index.ts` with `cn()` helper function
  - [x] 1.9 Set up environment variables structure (`.env.example` with DATABASE_URL, AUTH_SECRET, SMTP settings)

- [x] 2.0 Database schema and data layer
  - [x] 2.1 Define Job model in Prisma schema (id, name, description, schedule, type, config JSON, status, tags, timeout, retryPolicy, createdAt, updatedAt)
  - [x] 2.2 Define Execution model (id, jobId, startedAt, finishedAt, exitCode, trigger, status)
  - [x] 2.3 Define Log model (id, executionId, stream enum stdout/stderr, content, createdAt)
  - [x] 2.4 Define Notification model (id, type enum webhook/email, config JSON, jobIds, createdAt)
  - [x] 2.5 Define User model (id, username, passwordHash, apiKey, createdAt)
  - [x] 2.6 Define Settings model for global app settings (id, key, value JSON)
  - [x] 2.7 Run initial migration: `npx prisma migrate dev --name init`
  - [x] 2.8 Create `$lib/server/db.ts` with Prisma client singleton
  - [x] 2.9 Create seed script for default admin user

- [ ] 3.0 Authentication system
  - [ ] 3.1 Create password hashing utilities in `$lib/server/auth.ts` (using bcrypt or argon2)
  - [ ] 3.2 Create session management utilities (cookie-based sessions)
  - [ ] 3.3 Create API key validation utility
  - [ ] 3.4 Implement `hooks.server.ts` to parse session/API key and populate `locals.user`
  - [ ] 3.5 Create login page UI (`/auth/login/+page.svelte`) with form
  - [ ] 3.6 Implement login form action with Zod validation (`/auth/login/+page.server.ts`)
  - [ ] 3.7 Create logout action
  - [ ] 3.8 Create `(app)/+layout.server.ts` auth guard that redirects unauthenticated users to login
  - [ ] 3.9 Create API key management page for generating/revoking keys

- [ ] 4.0 Job management (CRUD)
  - [ ] 4.1 Create Zod schemas for job validation (`$lib/utils/schemas.ts`)
  - [ ] 4.2 Create job list page UI with table, status badges, and action buttons (`/jobs/+page.svelte`)
  - [ ] 4.3 Implement job list server load function with filtering/sorting (`/jobs/+page.server.ts`)
  - [ ] 4.4 Create job create/edit form component with cron expression input and human-readable preview
  - [ ] 4.5 Create visual cron builder component (dropdowns for minute, hour, day, month, weekday)
  - [ ] 4.6 Implement job create form action with validation
  - [ ] 4.7 Create job detail page UI (`/jobs/[id]/+page.svelte`)
  - [ ] 4.8 Implement job update form action
  - [ ] 4.9 Implement job delete action with confirmation dialog
  - [ ] 4.10 Add job pause/resume toggle functionality
  - [ ] 4.11 Create environment variables editor component with secret masking
  - [ ] 4.12 Add job tagging UI (multi-select or tag input)
  - [ ] 4.13 Implement REST API endpoints for jobs (`/api/jobs/+server.ts`, `/api/jobs/[id]/+server.ts`)

- [ ] 5.0 Scheduler engine
  - [ ] 5.1 Create scheduler service in `$lib/server/scheduler.ts`
  - [ ] 5.2 Implement job loading from database on startup
  - [ ] 5.3 Implement cron expression parsing and next-run calculation
  - [ ] 5.4 Create tick-based scheduler loop that checks for due jobs
  - [ ] 5.5 Implement job queue to prevent overlapping executions of the same job
  - [ ] 5.6 Add scheduler start/stop lifecycle hooks for graceful shutdown
  - [ ] 5.7 Implement dynamic job registration (add/update/remove jobs without restart)
  - [ ] 5.8 Create scheduler status endpoint for health checks

- [ ] 6.0 Job execution system
  - [ ] 6.1 Create executor interface/type definitions in `$lib/server/executor.ts`
  - [ ] 6.2 Implement shell command executor using child_process.spawn
  - [ ] 6.3 Implement HTTP request executor with configurable method, headers, body
  - [ ] 6.4 Implement Docker exec executor using dockerode SDK
  - [ ] 6.5 Add timeout handling with automatic process kill
  - [ ] 6.6 Implement retry logic with configurable backoff (fixed, exponential)
  - [ ] 6.7 Create execution context with environment variable injection
  - [ ] 6.8 Implement stdout/stderr streaming and capture
  - [ ] 6.9 Create manual trigger endpoint (`/api/jobs/[id]/trigger/+server.ts`)
  - [ ] 6.10 Add execution result recording (exit code, duration, status)

- [ ] 7.0 Execution history and log storage
  - [ ] 7.1 Create execution recording service that persists execution metadata
  - [ ] 7.2 Implement log capture service that stores stdout/stderr per execution
  - [ ] 7.3 Create execution history page UI (`/jobs/[id]/executions/+page.svelte`)
  - [ ] 7.4 Implement execution list with pagination and filtering by status
  - [ ] 7.5 Create log viewer component with syntax highlighting (using highlight.js or similar)
  - [ ] 7.6 Add log search functionality
  - [ ] 7.7 Implement log retention policy (configurable: last N runs or last N days)
  - [ ] 7.8 Create background job for log cleanup based on retention policy
  - [ ] 7.9 Implement REST API for executions (`/api/executions/+server.ts`)

- [ ] 8.0 Dashboard UI
  - [ ] 8.1 Create dashboard layout with summary cards (`/dashboard/+page.svelte`)
  - [ ] 8.2 Implement system health summary (total jobs, success rate 24h, currently running, next execution)
  - [ ] 8.3 Create job status overview component (healthy, failing, paused, overdue counts)
  - [ ] 8.4 Build execution timeline component (Gantt-style horizontal bars for recent runs)
  - [ ] 8.5 Add next-run countdown timers for each job
  - [ ] 8.6 Implement SSE endpoint for real-time updates (`/api/events/+server.ts`)
  - [ ] 8.7 Create SSE client hook/store for dashboard reactivity
  - [ ] 8.8 Add quick-action buttons: pause all, resume all, trigger job
  - [ ] 8.9 Implement job status indicators with color coding (green=healthy, red=failing, yellow=paused, orange=overdue)
  - [ ] 8.10 Create responsive layout for mobile/tablet views

- [ ] 9.0 Notification system
  - [ ] 9.1 Create notification service in `$lib/server/notifications.ts`
  - [ ] 9.2 Implement webhook sender (POST to configured URL with JSON payload)
  - [ ] 9.3 Implement email sender using nodemailer with SMTP configuration
  - [ ] 9.4 Define notification trigger events (job_failed, job_timeout, job_recovered)
  - [ ] 9.5 Create notification settings page UI
  - [ ] 9.6 Implement webhook channel configuration (URL, optional headers)
  - [ ] 9.7 Implement email channel configuration (SMTP host, port, auth, from address)
  - [ ] 9.8 Create per-job notification preferences override UI
  - [ ] 9.9 Add notification testing (send test webhook/email)
  - [ ] 9.10 Implement notification history/log for debugging delivery issues

- [ ] 10.0 Docker packaging and deployment
  - [ ] 10.1 Create multi-stage Dockerfile (build stage + runtime stage)
  - [ ] 10.2 Configure SQLite database path to use mounted volume (`/data/kronos.db`)
  - [ ] 10.3 Add health check endpoint (`/api/health`)
  - [ ] 10.4 Create docker-compose.yml for local development
  - [ ] 10.5 Set up multi-arch build (amd64/arm64) using docker buildx
  - [ ] 10.6 Configure environment variable pass-through for runtime settings
  - [ ] 10.7 Add graceful shutdown handling (SIGTERM/SIGINT)
  - [ ] 10.8 Create startup script that runs migrations and seeds default user if needed
  - [ ] 10.9 Document deployment instructions in README
  - [ ] 10.10 Test deployment on clean Docker environment
