# Kronos — Product Requirements Document

**The Modern Task Scheduler**

| | |
|---|---|
| **Version** | 1.0 |
| **Date** | January 31, 2026 |
| **Author** | Jason A. |
| **Status** | Draft |

---

## 1. Executive Summary

Kronos is a modern, self-hosted task scheduler with a beautiful web interface that replaces the fragmented experience of managing cron jobs via SSH terminals. It targets developers, DevOps engineers, and small-to-medium teams who run scheduled tasks on their own infrastructure and want visibility, reliability, and a great user experience without the complexity of enterprise orchestration platforms.

The existing market is split between bare-metal cron (powerful but invisible), outdated self-hosted tools like Cronicle (functional but aesthetically stuck in 2015), and massively over-engineered enterprise solutions like Airflow and Rundeck. Kronos fills the gap: a clean, opinionated, Docker-native scheduler that feels like a modern SaaS product but runs entirely on your own hardware.

---

## 2. Problem Statement

### 2.1 Current Pain Points

- **Cron is invisible.** Jobs run silently in the background. You only discover failures when something downstream breaks. There's no dashboard, no history, no alerting.
- **Crontab syntax is hostile.** The five-field format is unintuitive and error-prone. One misplaced asterisk can fire a job 1,440 times a day instead of once.
- **No centralized view.** If you manage multiple servers, cron jobs are scattered across machines with no single pane of glass.
- **Existing tools are stale or bloated.** Cronicle hasn't had a meaningful UI refresh in years. Dkron requires distributed consensus setup. Rundeck and Airflow are designed for large organizations, not a solo developer or small team.
- **No modern deployment story.** Most alternatives predate the Docker-first world. Installation is often multi-step, fragile, and poorly documented.

### 2.2 Target Users

- **Solo developers and indie hackers** running side projects on VPS/dedicated servers who want their cron jobs visible and reliable.
- **Small DevOps teams (2–10)** managing internal infrastructure who need a lightweight scheduler without enterprise overhead.
- **SaaS operators** running scheduled maintenance tasks, report generation, API polling, and webhook triggers across their infrastructure.
- **Homelab enthusiasts** who want a polished way to manage scheduled tasks on their self-hosted setups.

---

## 3. Product Vision

Kronos should feel like what cron would be if it were invented today. It should be deployable with a single Docker command, present a beautiful and intuitive dashboard within 60 seconds, and make creating, monitoring, and debugging scheduled tasks genuinely enjoyable.

**Design principles:**

- **Beautiful by default.** No configuration needed to get a polished, dark/light mode interface with real-time updates.
- **Single binary, zero dependencies.** Ship as a single Docker image with embedded database. No external Postgres, Redis, or message broker required.
- **Cron-native, not cron-hostile.** Support standard cron syntax but also offer a visual schedule builder for those who prefer it. Don't abstract away cron—enhance it.
- **Observable by default.** Every execution is logged, timed, and queryable. Success/failure status is front and center.
- **API-first.** Everything the UI does, the API can do. Enable programmatic job management from CI/CD pipelines, scripts, and other tools.

---

## 4. Feature Requirements

### 4.1 MVP (Phase 1)

The minimum viable product focuses on replacing cron with a superior experience for a single server.

#### Dashboard

- Real-time overview of all scheduled jobs with status indicators (healthy, failing, paused, overdue)
- Next-run countdown timers for each job
- Execution timeline showing recent runs across all jobs (Gantt-style horizontal bars)
- System health summary: total jobs, success rate (24h), currently running, next execution
- Quick-action buttons: pause all, resume all, trigger manually

#### Job Management

- Create/edit/delete jobs via UI or API
- Schedule via cron expression (with human-readable preview) or visual builder (dropdowns for minute, hour, day, etc.)
- Job types: shell command, HTTP request (GET/POST/PUT with headers and body), or Docker exec (run command inside a named container)
- Environment variables per job (with secret masking in UI and logs)
- Timeout configuration with automatic kill on exceed
- Retry policy: number of retries, backoff strategy (fixed, exponential), retry delay
- Job tagging/grouping for organizational clarity
- Manual trigger button (run now) for any job

#### Execution History & Logs

- Full stdout/stderr capture for every execution, stored and queryable
- Execution metadata: start time, duration, exit code, trigger source (scheduled vs. manual)
- Log viewer with syntax highlighting and search
- Configurable retention policy (e.g., keep last 100 runs or last 30 days per job)

#### Notifications

- Alert on: job failure, job timeout, job recovered (succeeded after previous failure)
- Notification channels: webhook (Slack, Discord, Teams via incoming webhook URL), email (SMTP configuration)
- Per-job notification preferences (override global defaults)

#### Authentication & Security

- Single-user authentication with username/password (suitable for self-hosted single-operator use)
- API key authentication for programmatic access
- All secrets (env vars, webhook URLs, SMTP passwords) encrypted at rest

### 4.2 Phase 2 — Multi-Server & Collaboration

- **Remote agents.** Lightweight agent binary that registers with the Kronos hub. Jobs can target specific servers or groups. Agent communicates over HTTPS with mutual TLS.
- **Multi-user with RBAC.** Invite team members. Roles: Admin (full control), Operator (run/pause jobs, view logs), Viewer (read-only). SSO via OIDC.
- **Job dependencies.** Define DAG-style relationships: Job B runs only after Job A succeeds. Visual dependency graph in UI.
- **Approval gates.** Require manual approval before certain jobs execute (e.g., production deployments).
- **Audit log.** Immutable record of who did what and when.

### 4.3 Phase 3 — Platform & Ecosystem

- **Plugin system.** Community-contributed job types (e.g., database backup, S3 sync, DNS healthcheck) installable via UI.
- **Terraform/Pulumi provider.** Manage jobs as infrastructure-as-code.
- **Import from crontab.** Paste or upload an existing crontab file; Kronos parses and creates corresponding jobs automatically.
- **Mobile companion.** PWA or native app for monitoring and manual triggers on the go.
- **Marketplace/SaaS option.** Hosted version for teams that don't want to self-host, with per-seat pricing.

---

## 5. Technical Architecture

### 5.1 Stack

| Component | Technology |
|---|---|
| **Frontend** | Next.js 15 + React, Tailwind CSS, shadcn/ui components |
| **Backend API** | Next.js API routes (or standalone Node/Fastify if decoupled) |
| **Scheduler Engine** | Node.js with node-cron or custom tick-based engine |
| **Database** | SQLite (embedded, zero-config) via better-sqlite3 or Drizzle ORM |
| **Real-time** | Server-Sent Events (SSE) for dashboard live updates |
| **Job Execution** | Child process spawn (shell), HTTP client (requests), Docker SDK (container exec) |
| **Packaging** | Single Docker image, multi-arch (amd64/arm64) |

### 5.2 Deployment Model

Primary deployment is a single Docker container with a mounted volume for persistent data. The entire application—frontend, API, scheduler engine, and database—runs in one process group. This keeps the operational footprint minimal and eliminates inter-service coordination complexity.

```
docker run -d --name cronpilot -p 8080:8080 -v cronpilot-data:/data cronpilot/cronpilot:latest
```

For Coolify users, Kronos should be deployable as a standard Docker resource with FQDN configuration for automatic SSL. A one-click Coolify service template will be provided.

### 5.3 Data Model (Simplified)

| Entity | Key Fields | Notes |
|---|---|---|
| **Job** | id, name, schedule, type, config, status, tags | Core job definition. Config is JSON blob specific to job type (shell command, HTTP params, Docker target). |
| **Execution** | id, job_id, started_at, finished_at, exit_code, trigger | One row per job run. Trigger indicates scheduled, manual, or retry. |
| **Log** | id, execution_id, stream, content | Stdout and stderr captured separately. Content stored as text, optionally compressed for old entries. |
| **Notification** | id, type, config, job_ids | Webhook URL, SMTP settings, and which jobs trigger it. |
| **User** | id, username, password_hash, api_key | Single user in MVP. Multi-user with roles in Phase 2. |

---

## 6. Competitive Landscape

| | Kronos | Cronicle | Rundeck | Airflow | Plain Cron |
|---|---|---|---|---|---|
| **Modern UI** | ✅ Yes | ❌ Dated | ⚠️ Enterprise | ❌ Complex | ❌ None |
| **Setup Time** | < 1 min | 5–10 min | 30+ min | 1+ hour | Built-in |
| **Docker-native** | ✅ Single image | ⚠️ Community | ⚠️ Multi-container | ⚠️ Complex | ❌ N/A |
| **Dependencies** | None | Node.js | Java + DB | Python + DB + broker | None |
| **Log Capture** | ✅ Built-in | ✅ Built-in | ✅ Built-in | ✅ Built-in | ❌ Manual |
| **REST API** | ✅ Full | ✅ Full | ✅ Full | ✅ Full | ❌ None |
| **Target Audience** | Indie to SMB | Indie to SMB | Enterprise | Data teams | Everyone |
| **Active Dev** | ✅ Greenfield | ⚠️ Slow | ✅ Yes | ✅ Yes | ✅ Stable |

The primary competitive advantage is the intersection of modern design, zero-dependency deployment, and developer-focused UX. No existing tool occupies this exact position. Cronicle is the closest but suffers from an aging interface and slow development cadence. Kronos should feel like the Coolify of cron—opinionated, beautiful, and effortless to deploy.

---

## 7. Success Metrics

### 7.1 Adoption

1. 1,000 Docker pulls within first month of public release
2. 500 GitHub stars within first 3 months
3. 10+ community-contributed issues or PRs within first 3 months

### 7.2 Product Quality

1. Dashboard loads in under 500ms on a $5/mo VPS
2. Job execution overhead < 100ms compared to bare cron
3. Zero data loss on container restart (SQLite WAL mode + mounted volume)
4. 99.99% scheduler accuracy (jobs fire within 1 second of scheduled time)

### 7.3 Engagement

1. Average user manages 10+ jobs within first week
2. 60% of users configure at least one notification channel
3. 40% of users interact via API (not just UI)

---

## 8. Open Questions

- **Naming:** Kronos is the working title. Alternatives considered: Tickr, CronUI, Schedulo, Lancet. Final name TBD pending trademark check.
- **Licensing:** MIT vs. BSL (Business Source License) for the core? MIT maximizes adoption; BSL protects against cloud providers reselling a hosted version.
- **Monetization:** If this becomes a product, the likely model is open-core: free self-hosted forever, paid hosted/SaaS tier, and paid enterprise features (SSO, audit log, multi-tenant). Phase 3 decision.
- **Agent protocol:** gRPC vs. HTTPS+JSON for server-to-agent communication in Phase 2. HTTPS is simpler; gRPC is more efficient for streaming logs.
- **Crontab import:** Should the import tool also set up a reverse sync (changes in Kronos write back to the system crontab)? Or is Kronos a full replacement with its own scheduler?

---

## 9. Indicative Timeline

| Phase | Target | Deliverables |
|---|---|---|
| **MVP** | 8–12 weeks | Dashboard, job CRUD, shell + HTTP job types, execution history, log viewer, webhook notifications, Docker image, docs |
| **Phase 2** | MVP + 3–6 months | Remote agents, multi-user RBAC, job dependencies, approval gates, audit log |
| **Phase 3** | Phase 2 + 6 months | Plugin system, IaC provider, crontab import, mobile PWA, hosted SaaS option |

Timeline assumes a solo developer or small team working part-time alongside other commitments. Scope can be tightened by cutting Docker exec job type and approval gates from early phases.
