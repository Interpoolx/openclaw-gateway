@echo off
REM Batch script to reset D1 database and apply migrations
REM Usage: .\scripts\reset-and-migrate.bat [remote]

echo 🗑️  D1 Database Reset ^& Migration Script
echo Target: LOCAL database (add 'remote' arg for production)
echo.

set REMOTE_FLAG=--local
if "%1"=="remote" set REMOTE_FLAG=--remote

echo Step 1: Applying initial schema migration...
wrangler d1 execute openclaw_admin %REMOTE_FLAG% --file="./migrations/0001_initial_schema.sql"
if %ERRORLEVEL% neq 0 (
    echo ❌ Migration failed!
    exit /b 1
)

echo.
echo Step 2: Verifying tables...
wrangler d1 execute openclaw_admin %REMOTE_FLAG% --command="SELECT name FROM sqlite_master WHERE type='table' ORDER BY name;"

echo.
echo Step 3: Verifying agents table schema...
wrangler d1 execute openclaw_admin %REMOTE_FLAG% --command="PRAGMA table_info(agents);"

echo.
echo ✅ Database reset and migration complete!
echo Next steps:
echo   1. Deploy backend: npx wrangler deploy
echo   2. Test demo login at https://clawpute.pages.dev
