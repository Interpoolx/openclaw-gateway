/**
 * OpenClaw Connection Diagnostic Script
 * 
 * Run this to test WebSocket connection directly
 */

interface TestResult {
  success: boolean;
  stage: string;
  message: string;
  details?: any;
}

export async function diagnoseOpenClawConnection(
  wsUrl: string,
  token: string
): Promise<TestResult[]> {
  const results: TestResult[] = [];
  
  // Test 1: Basic WebSocket connection
  results.push({
    success: true,
    stage: 'init',
    message: `Starting diagnosis for ${wsUrl}`,
  });
  
  return new Promise((resolve) => {
    let ws: WebSocket;
    const timeout = setTimeout(() => {
      results.push({
        success: false,
        stage: 'timeout',
        message: 'Connection timeout after 10 seconds',
      });
      if (ws) ws.close();
      resolve(results);
    }, 10000);
    
    try {
      ws = new WebSocket(wsUrl);
      
      ws.addEventListener('open', () => {
        results.push({
          success: true,
          stage: 'websocket-open',
          message: 'WebSocket connection established',
        });
        
        // Send connect handshake
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
            auth: { token },
          },
        };
        
        results.push({
          success: true,
          stage: 'sending-handshake',
          message: 'Sending connect handshake',
          details: connectReq,
        });
        
        ws.send(JSON.stringify(connectReq));
      });
      
      ws.addEventListener('message', (event: MessageEvent) => {
        try {
          const data = JSON.parse(event.data);
          results.push({
            success: true,
            stage: 'message-received',
            message: `Received: ${data.type}`,
            details: data,
          });
          
          if (data.type === 'res' && data.ok && data.payload?.type === 'hello-ok') {
            results.push({
              success: true,
              stage: 'handshake-success',
              message: 'Handshake successful!',
              details: data.payload,
            });
            clearTimeout(timeout);
            ws.close();
            resolve(results);
          }
          
          if (data.type === 'res' && !data.ok) {
            results.push({
              success: false,
              stage: 'handshake-failed',
              message: `Handshake failed: ${data.error?.message || 'Unknown error'}`,
              details: data.error,
            });
          }
          
          if (data.type === 'event' && data.event === 'connect.challenge') {
            results.push({
              success: true,
              stage: 'challenge-received',
              message: 'Server sent connection challenge',
              details: data.payload,
            });
          }
        } catch (e) {
          results.push({
            success: false,
            stage: 'parse-error',
            message: `Failed to parse message: ${e instanceof Error ? e.message : 'Unknown'}`,
          });
        }
      });
      
      ws.addEventListener('error', (_error: Event) => {
        results.push({
          success: false,
          stage: 'websocket-error',
          message: 'WebSocket error occurred',
        });
      });
      
      ws.addEventListener('close', (event: CloseEvent) => {
        results.push({
          success: event.code === 1000,
          stage: 'websocket-close',
          message: `Connection closed (code: ${event.code}, reason: ${event.reason || 'none'})`,
          details: { code: event.code, reason: event.reason },
        });
        clearTimeout(timeout);
        resolve(results);
      });
      
    } catch (error) {
      results.push({
        success: false,
        stage: 'websocket-create-error',
        message: `Failed to create WebSocket: ${error instanceof Error ? error.message : 'Unknown'}`,
      });
      clearTimeout(timeout);
      resolve(results);
    }
  });
}

// HTTP fallback test
export async function testHttpEndpoints(
  httpUrl: string,
  token: string
): Promise<TestResult[]> {
  const results: TestResult[] = [];
  
  // Convert ws:// to http://
  let url = httpUrl;
  if (url.startsWith('ws://')) {
    url = url.replace('ws://', 'http://');
  } else if (url.startsWith('wss://')) {
    url = url.replace('wss://', 'https://');
  }
  
  results.push({
    success: true,
    stage: 'http-init',
    message: `Testing HTTP endpoints at ${url}`,
  });
  
  // Test root endpoint
  try {
    const response = await fetch(url, {
      headers: { 'Authorization': `Bearer ${token}` },
    });
    
    results.push({
      success: response.ok,
      stage: 'http-root',
      message: `Root endpoint: ${response.status} ${response.statusText}`,
      details: { status: response.status },
    });
    
    if (response.ok) {
      const contentType = response.headers.get('content-type');
      results.push({
        success: true,
        stage: 'http-content-type',
        message: `Content-Type: ${contentType}`,
      });
      
      if (contentType?.includes('application/json')) {
        const data = await response.json();
        results.push({
          success: true,
          stage: 'http-json',
          message: 'Received JSON response',
          details: data,
        });
      } else {
        const text = await response.text();
        results.push({
          success: true,
          stage: 'http-html',
          message: `Received HTML (${text.length} bytes)`,
          details: { preview: text.substring(0, 500) },
        });
      }
    }
  } catch (error) {
    results.push({
      success: false,
      stage: 'http-root-error',
      message: `HTTP request failed: ${error instanceof Error ? error.message : 'Unknown'}`,
    });
  }
  
  return results;
}

// Full diagnostic
export async function runFullDiagnostic(
  wsUrl: string,
  token: string
): Promise<{ websocket: TestResult[]; http: TestResult[] }> {
  const [websocket, http] = await Promise.all([
    diagnoseOpenClawConnection(wsUrl, token),
    testHttpEndpoints(wsUrl, token),
  ]);
  
  return { websocket, http };
}
