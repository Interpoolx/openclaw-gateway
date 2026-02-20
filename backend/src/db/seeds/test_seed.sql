-- Test seed - minimal
INSERT OR REPLACE INTO workspaces (id, name, slug, description, owner_id, gateway_url, gateway_token, settings, tier, is_default, avatar, color, created_at, updated_at) 
VALUES ('ws-demo-001', 'Starfleet Command', 'starfleet-command', 'Main workspace', '0194f484-98c5-703d-8289-4b219f7e813a', 'ws://localhost:18789', 'demo-token', '{}', 'pro', 1, '🚀', '#3b82f6', datetime('now'), datetime('now'));

SELECT 'Workspace created' as result;
