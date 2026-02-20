const WebSocket = require('ws');

const WS_URL = 'wss://openclaw.clawpute.com';
const TOKEN = '728a7307166292b0d62b2a8232f55e4cfa3daacb2991e4f2';

console.log('=== WebSocket Auth Test ===');
console.log('URL:', WS_URL);
console.log('Token:', TOKEN.substring(0, 15) + '...');
console.log('');

const ws = new WebSocket(`${WS_URL}?token=${encodeURIComponent(TOKEN)}`);

let authenticated = false;

ws.on('open', () => {
  console.log('✓ WebSocket connected');
});

ws.on('message', (data) => {
  const msg = JSON.parse(data);
  console.log('← Received:', msg.type, msg.event || '');
  
  if (msg.type === 'event' && msg.event === 'connect.challenge') {
    console.log('Sending auth message...');
    ws.send(JSON.stringify({
      type: 'auth',
      session: 'agent:main:main',
      token: TOKEN
    }));
  }
  
  if (msg.type === 'event' && msg.event === 'connect.ready') {
    console.log('✓✓ AUTHENTICATED!');
    authenticated = true;
    
    // Try to get version by sending a message
    console.log('Trying to get version info...');
    ws.send(JSON.stringify({
      type: 'req',
      id: 'version-check',
      method: 'version',
      params: {}
    }));
    
    // Alternative: try status
    setTimeout(() => {
      if (!result.version) {
        ws.send(JSON.stringify({
          type: 'req', 
          id: 'status-check',
          method: 'status',
          params: {}
        }));
      }
    }, 1000);
    
    setTimeout(() => {
      ws.close();
    }, 3000);
  }
  
  if (msg.type === 'res' && msg.id) {
    console.log('Response:', msg.ok ? 'OK' : 'FAIL', msg.payload || msg.error);
    if (msg.payload?.version) {
      console.log('VERSION:', msg.payload.version);
    }
  }
});

ws.on('error', (err) => {
  console.log('✗ Error:', err.message);
});

ws.on('close', (code) => {
  console.log('Closed:', code);
  process.exit(0);
});
