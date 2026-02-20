# PowerShell script to reset D1 database and apply migrations
# Usage: .\scripts\reset-and-migrate.ps1 [-Remote]

param(
    [switch]$Remote
)

$envName = if ($Remote) { "REMOTE" } else { "LOCAL" }
$remoteFlag = if ($Remote) { "--remote" } else { "--local" }

Write-Host "🗑️  D1 Database Reset & Migration Script" -ForegroundColor Cyan
Write-Host "Target: $envName database`n" -ForegroundColor Yellow

# Step 1: Apply the initial schema migration (which drops and recreates all tables)
Write-Host "Step 1: Applying initial schema migration..." -ForegroundColor Green
wrangler d1 execute openclaw_admin $remoteFlag --file="./migrations/0001_initial_schema.sql"

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Migration failed!" -ForegroundColor Red
    exit 1
}

# Step 2: Verify tables were created
Write-Host "`nStep 2: Verifying tables..." -ForegroundColor Green
wrangler d1 execute openclaw_admin $remoteFlag --command="SELECT name FROM sqlite_master WHERE type='table' ORDER BY name;"

# Step 3: Check agents table has user_id column
Write-Host "`nStep 3: Verifying agents table schema..." -ForegroundColor Green
wrangler d1 execute openclaw_admin $remoteFlag --command="PRAGMA table_info(agents);"

Write-Host "`n✅ Database reset and migration complete!" -ForegroundColor Green
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "  1. Deploy backend: npx wrangler deploy" -ForegroundColor White
Write-Host "  2. Test demo login at https://clawpute.pages.dev" -ForegroundColor White
