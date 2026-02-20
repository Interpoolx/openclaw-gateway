npx wrangler d1 execute openclaw_admin --remote --command="UPDATE users SET password_hash = 'pbkdf2:100000:0MghRnS4fThIGkYUDfsIsw==:+W2MvLDdbrl5gZ6+n5SdRUtPcP41Ysd8ZRWTdgKKFlY=' WHERE email = 'advrajeshkumar90@gmail.com'"

npx wrangler d1 execute openclaw_admin --remote --command="UPDATE users SET password_hash = 'pbkdf2:100000:Zxk56f0afSB7agjBBP64/w==:+cpOLs7vOOMWDl1dOsBvv96x0d2vyP7aGSjgbZIICpI=' WHERE email = 'responsecenter247@gmail.com'"

npx wrangler d1 execute openclaw_admin --remote --command="UPDATE users SET password_hash = 'pbkdf2:100000:JoGp6CwOanhKTYwYCuu5KQ==:UN4opUUQ/l2KNqEksd7lrbyzEIpKufUSIBjoP+xhphQ=' WHERE email = 'demo@clawpute.com';"

npx tsx -e "import { hashPassword } from './src/lib/crypto'; hashPassword('user123').then(console.log)"

npx wrangler d1 execute openclaw_admin --local --command="SELECT COUNT(*) FROM agents WHERE user_id = 'demo-user-001'; SELECT COUNT(*) FROM tasks WHERE user_id = 'demo-user-001';"

npx wrangler d1 execute openclaw_admin --local --command="SELECT COUNT(*) FROM agents WHERE user_id = 'user-rc-001';"

npx wrangler d1 execute openclaw_admin --local --command="SELECT id FROM agents WHERE user_id = 'user-rc-001' LIMIT 1;"

