const WebSocket = require('ws');

const WS_URL = 'wss://openclaw.clawpute.com';
const TOKEN = '728a7307166292b0d62b2a8232f55e4cfa3daacb2991e4f2';

console.log('=== Token in URL Only ===');
const ws = new WebSocket(`${WS_URL}?token=${encodeURIComponent(TOKEN)}`);

ws.on('open', () => {
  console.log('Connected');
});

ws.on('message', (data) => {
  const msg = JSON.parse(data);
  console.log('Received:', msg);
});

ws.on('close', (code, reason) => {
  console.log('Closed:', code, reason);
  process.exit(0);
});

setTimeout(() => {
  console.log('Timeout');
  ws.close();
}, 5000);
