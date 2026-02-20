const WebSocket = require('ws');

const WS_URL = 'wss://openclaw.clawpute.com';
const TOKEN = '728a7307166292b0d62b2a8232f55e4cfa3daacb2991e4f2';

console.log('=== WebSocket Test ===');
console.log('Connecting to:', WS_URL);
console.log('Token:', TOKEN.substring(0, 10) + '...');
console.log('');

const ws = new WebSocket(`${WS_URL}?token=${encodeURIComponent(TOKEN)}`);

ws.on('open', () => {
  console.log('1. ✓ WebSocket OPEN');
});

ws.on('message', (data) => {
  const msg = JSON.parse(data);
  console.log('2. ← Received:', JSON.stringify(msg, null, 2).substring(0, 200));
  
  if (msg.type === 'event' && msg.event === 'connect.challenge') {
    console.log('3. Challenge received, sending CONNECT request...');
    
    const connectReq = {
      type: 'req',
      id: `test-${Date.now()}`,
      method: 'connect',
      params: {
        minProtocol: 3,
        maxProtocol: 3,
        client: {
          id: 'test-client',
          version: '1.0.0',
          platform: 'test',
          mode: 'operator',
        },
        role: 'operator',
        scopes: ['operator.read'],
        caps: [],
        commands: [],
        permissions: {},
        auth: { token: TOKEN },
        locale: 'en-US',
        userAgent: 'test/1.0.0',
        challenge: {
          nonce: msg.payload?.nonce,
          ts: msg.payload?.ts,
        }
      },
    };
    
    console.log('4. → Sending:', JSON.stringify(connectReq, null, 2).substring(0, 300));
    ws.send(JSON.stringify(connectReq));
    console.log('5. ✓ CONNECT request sent');
  }
  
  if (msg.type === 'res') {
    console.log('6. ← Response received:', msg.ok ? 'SUCCESS' : 'FAILED');
    console.log('   Payload:', JSON.stringify(msg.payload, null, 2).substring(0, 200));
    
    if (msg.ok && msg.payload?.type === 'hello-ok') {
      console.log('7. ✓✓✓ CONNECTED! Version:', msg.payload.protocol || 'unknown');
      ws.close(1000, 'Test complete');
      process.exit(0);
    }
    
    if (!msg.ok) {
      console.log('7. ✗ ERROR:', msg.error);
      ws.close();
      process.exit(1);
    }
  }
});

ws.on('error', (err) => {
  console.log('✗ WebSocket ERROR:', err.message);
});

ws.on('close', (code, reason) => {
  console.log('Connection CLOSED:', code, reason);
  if (code !== 1000) {
    console.log('Failed - unexpected close');
    process.exit(1);
  }
});

setTimeout(() => {
  console.log('Timeout!');
  ws.close();
  process.exit(1);
}, 15000);
