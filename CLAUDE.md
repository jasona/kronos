# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Kronos is a modern, self-hosted task scheduler with a web interface that replaces cron. It targets developers and small teams who want visibility into scheduled tasks without enterprise complexity. Deployable with a single Docker command, with a polished dashboard ready in 60 seconds.

## Tech Stack

- **Frontend**: SvelteKit, Tailwind CSS, shadcn-svelte, bits-ui (Radix primitives)
- **Backend**: SvelteKit API routes (+server.ts files)
- **Database**: SQLite via Prisma or better-sqlite3
- **Scheduler**: Node.js with node-cron or custom tick-based engine
- **Validation**: Zod for forms and API inputs
- **Testing**: Vitest (unit), Playwright (E2E)
- **Deployment**: Single Docker image (multi-arch: amd64/arm64)

## Commands

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run test         # Run all tests
npx vitest [path]    # Run specific test file
npx playwright test  # Run E2E tests
```

## Architecture

Single Docker container deployment: frontend, API, scheduler engine, and embedded SQLite database. No external dependencies.

### Project Structure
```
src/
├── routes/                    # SvelteKit routes
│   ├── (app)/                 # Authenticated pages (dashboard, jobs, etc.)
│   ├── auth/                  # Auth routes
│   └── api/                   # API endpoints (+server.ts)
├── lib/
│   ├── components/ui/         # shadcn-svelte base components
│   ├── components/[feature]/  # Feature-specific components
│   ├── server/                # Server-only code (DB, auth)
│   └── utils/                 # Shared utilities (cn() helper, etc.)
└── hooks.server.ts            # Server hooks
```

### Data Model
- **Job**: Schedule, type (shell/HTTP/Docker), config, status, tags
- **Execution**: Per-run record with timing, exit code, trigger source
- **Log**: Stdout/stderr per execution
- **Notification**: Webhook/email config
- **User**: Single-user auth MVP, multi-user RBAC Phase 2

## Code Standards

**TypeScript**: Strict mode, avoid `any`. All code must pass ESLint and Prettier.

**SvelteKit Patterns**:
- Use `+page.server.ts` for data fetching (not client-side fetch in onMount)
- Use form actions for mutations with Zod validation
- Keep sensitive logic in `$lib/server/`

**Components**:
- Use shadcn-svelte components for common UI patterns
- Use `cn()` helper for conditional Tailwind classes
- Prefer explicit props over Svelte context

**Testing**:
- Test files alongside source: `Component.svelte` → `Component.test.ts`
- Test naming: "should [expected behavior] when [condition]"

## Task Workflow

This project uses a structured task workflow defined in `generate-tasks.md` and `execute-tasks.md`:

1. Task lists are stored in `/tasks/tasks-[feature-name].md`
2. Tasks start with `0.0 Create feature branch`
3. Complete one sub-task at a time, marking `[x]` as you go
4. Commit and push when parent task is complete

## Reference Docs

- `prd-kronos.md` - Product requirements
- `code-internal-architecture.md` - Detailed coding standards and patterns
