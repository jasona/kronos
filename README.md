# Kronos

A modern, self-hosted task scheduler with a web interface that replaces cron. Deployable with a single Docker command, with a polished dashboard ready in 60 seconds.

## Features

- Visual cron job management with human-readable schedule descriptions
- Multiple job types: Shell commands, HTTP requests, Docker containers
- Real-time execution monitoring and log viewing
- Notification system (webhooks, email)
- REST API for programmatic access
- Single Docker container deployment

## Quick Start

### Using Docker

```bash
docker run -d \
  --name kronos \
  -p 3000:3000 \
  -v kronos-data:/data \
  -e AUTH_SECRET="your-secret-key-min-32-chars" \
  kronos:latest
```

Access the dashboard at http://localhost:3000

Default credentials:
- Username: `admin`
- Password: `admin`

### Using Docker Compose

```bash
# Clone the repository
git clone https://github.com/your-repo/kronos.git
cd kronos

# Start the service
docker compose up -d
```

## Development

### Prerequisites

- Node.js 22+
- npm 10+

### Setup

```bash
# Install dependencies
npm install

# Set up environment variables
cp .env.example .env

# Run database migrations
npm run db:migrate

# Seed the database
npm run db:seed

# Start development server
npm run dev
```

### Commands

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm run preview` | Preview production build |
| `npm run test` | Run tests |
| `npm run lint` | Run ESLint |
| `npm run format` | Format code with Prettier |
| `npm run db:migrate` | Run database migrations |
| `npm run db:seed` | Seed the database |
| `npm run db:reset` | Reset the database |

## Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `DATABASE_URL` | SQLite database path | `file:./dev.db` |
| `AUTH_SECRET` | Session encryption secret (min 32 chars) | Required |
| `SMTP_HOST` | SMTP server host | - |
| `SMTP_PORT` | SMTP server port | `587` |
| `SMTP_USER` | SMTP username | - |
| `SMTP_PASS` | SMTP password | - |
| `SMTP_FROM` | Email from address | - |
| `ADMIN_PASSWORD` | Initial admin password | `admin` |

## API

### Authentication

All API endpoints require authentication via:
- Session cookie (for browser clients)
- Bearer token (API key) in the `Authorization` header

### Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/jobs` | List all jobs |
| POST | `/api/jobs` | Create a job |
| GET | `/api/jobs/:id` | Get a job |
| PUT | `/api/jobs/:id` | Update a job |
| DELETE | `/api/jobs/:id` | Delete a job |
| POST | `/api/jobs/:id/trigger` | Manually trigger a job |
| GET | `/api/executions` | List executions |
| GET | `/api/executions/:id` | Get execution with logs |
| GET | `/api/health` | Health check |

## Architecture

Kronos runs as a single Docker container containing:
- SvelteKit frontend and API
- SQLite database
- Node.js scheduler engine

## License

MIT
