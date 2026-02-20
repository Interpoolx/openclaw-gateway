# OpenClaw Mission Control Backend

Cloudflare Workers + D1 Database backend for the Mission Control admin panel.

## Quick Start

### 1. Create D1 Database

```bash
cd backend

# Create a new D1 database
npx wrangler d1 create openclaw_admin

# This will output something like:
# ✅ Database created: openclaw_admin (abc123-def456-ghi789)
# Take note of the database_id and update wrangler.toml
```

### 2. Update Configuration

Edit `wrangler.toml` and replace the placeholder database_id:

```toml
[[d1_databases]]
binding = "DB"
database_name = "openclaw_admin"
database_id = "abc123-def456-ghi789"  # <-- Replace with your actual ID
```

### 3. Push Database Schema

```bash
# Push schema to local D1 (for testing)
npx wrangler d1 execute openclaw_admin --local --file=./drizzle/schema.sql

# Push schema to remote D1 (production)
npx wrangler d1 execute openclaw_admin --remote --file=./drizzle/schema.sql
```

### 4. Seed the Database

```bash
# Seed local database
npm run db:seed

# Seed remote database
npm run db:seed:remote
```

This will create the default agents and tasks:
- 5 default agents (Saul Goodman, Coding Wizard, Research Analyst, Project Manager, Creative Writer)
- 5 default tasks
- Sample activity log

### 5. Start Development Server

```bash
npm run dev
```

The server will be available at `http://localhost:8787`

## Available Commands

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Type-check the code |
| `npm run deploy` | Deploy to Cloudflare Workers |
| `npm run db:generate` | Generate Drizzle migrations |
| `npm run db:push` | Push schema to D1 |
| `npm run db:studio` | Open Drizzle Studio |
| `npm run db:seed` | Seed local database with default data |
| `npm run db:seed:remote` | Seed remote database with default data |
| `npm run db:backup` | Export database backup |

## API Endpoints

### Health & Stats
- `GET /api/health` - Server health check
- `GET /api/stats` - Dashboard statistics

### Agents
- `GET /api/agents` - List all agents
- `GET /api/agents/:id` - Get single agent
- `POST /api/agents` - Create agent
- `PATCH /api/agents/:id` - Update agent
- `DELETE /api/agents/:id` - Delete agent

### Tools
- `GET /api/tools` - List all tools
- `POST /api/agents/:id/tools/enable` - Enable tool
- `POST /api/agents/:id/tools/disable` - Disable tool
- `POST /api/agents/:id/tools/preset` - Apply tool preset

### Tasks
- `GET /api/tasks` - List all tasks
- `GET /api/tasks/:id` - Get task detail
- `POST /api/tasks` - Create task
- `PATCH /api/tasks/:id` - Update task
- `POST /api/tasks/:id/move` - Move task to different status
- `DELETE /api/tasks/:id` - Delete task

### Sessions
- `GET /api/sessions` - List sessions
- `POST /api/sessions` - Create session
- `GET /api/sessions/:id/status` - Session status

### Activities
- `GET /api/activities` - Get activity feed

### OpenClaw Integration
- `GET /api/openclaw/config` - Get OpenClaw configuration
- `POST /api/openclaw/test-connection` - Test connection
- `POST /api/openclaw/sync-agents` - Sync agents

## Environment Variables

Set these via `wrangler secret` or in production environment:

| Variable | Description | Default |
|----------|-------------|---------|
| `OPENCLAW_URL` | OpenClaw Core URL | `""` |
| `OPENCLAW_API_KEY` | OpenClaw API Key | `""` |
| `OPENCLAW_MODE` | Connection mode | `"external"` |

## Database Schema

### Tables

- **agents** - Agent configurations
- **tasks** - Task definitions
- **task_assignees** - Many-to-many task-agent relationships
- **comments** - Task comments
- **activities** - Activity log
- **sessions** - Agent sessions
- **openclaw_connections** - External OpenClaw connections
- **settings** - Application settings

See [`src/db/schema.ts`](src/db/schema.ts) for full schema details.

## Project Structure

```
backend/
├── src/
│   ├── index.ts          # Main API server (Hono)
│   ├── db/
│   │   ├── index.ts      # Database connection
│   │   ├── schema.ts     # Drizzle ORM schema
│   │   ├── seed.ts       # TypeScript seed script
│   │   └── seed.sql      # SQL seed script
│   └── services/
│       ├── openclaw.ts   # OpenClaw integration
│       └── moltworker.ts # MoltWorker integration
├── drizzle.config.ts     # Drizzle configuration
├── wrangler.toml         # Cloudflare Workers config
└── package.json
```

## Troubleshooting

### 500 Internal Server Error

If you see 500 errors when accessing `/api/agents` or `/api/tasks`:

1. Check that D1 database is created and configured in `wrangler.toml`
2. Run schema push: `npm run db:push`
3. Run database seed: `npm run db:seed`
4. Check Wrangler logs: `npx wrangler d1 execute openclaw_admin --local --command="SELECT * FROM agents"`

### D1 Database Not Found

```bash
# List all D1 databases
npx wrangler d1 list

# If empty, create a new one
npx wrangler d1 create openclaw_admin
```

### Schema Mismatch

If the schema doesn't match:

```bash
# Drop and recreate tables (WARNING: loses all data)
npx wrangler d1 execute openclaw_admin --local --command="DROP TABLE IF EXISTS agents; DROP TABLE IF EXISTS tasks;"

# Push fresh schema
npm run db:push
```

## Deployment

### Deploy to Cloudflare Workers

```bash
# Build and deploy
npm run deploy

# Or with specific environment
npx wrangler deploy --minify src/index.ts --env production
```

### Set Secrets

```bash
npx wrangler secret put OPENCLAW_API_KEY
npx wrangler secret put OPENCLAW_URL
```

## See Also

- [Mission Control PRD](../MISSION_CONTROL_PRD.md)
- [Mission Control Design](../MISSION_CONTROL_DESIGN.md)
- [Mission Control Features](../MISSION_CONTROL_FEATURES.md)
- [Frontend README](../frontend/README.md)
