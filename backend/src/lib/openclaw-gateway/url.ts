export function convertHttpToWs(url: string): string {
  if (url.startsWith('ws://') || url.startsWith('wss://')) {
    return url.replace(/\/$/, '');
  }
  if (url.startsWith('http://')) {
    return url.replace('http://', 'ws://').replace(/\/$/, '');
  }
  if (url.startsWith('https://')) {
    return url.replace('https://', 'wss://').replace(/\/$/, '');
  }
  return `ws://${url.replace(/\/$/, '')}`;
}

export function convertWsToHttp(url: string): string {
  if (url.startsWith('ws://')) return url.replace('ws://', 'http://').replace(/\/$/, '');
  if (url.startsWith('wss://')) return url.replace('wss://', 'https://').replace(/\/$/, '');
  if (url.startsWith('http://') || url.startsWith('https://')) return url.replace(/\/$/, '');
  return `https://${url.replace(/\/$/, '')}`;
}

export function normalizeHttpUrl(url: string): string {
  let normalized = url.replace(/\/$/, '');
  if (normalized.startsWith('wss://')) {
    normalized = normalized.replace('wss://', 'https://');
  } else if (normalized.startsWith('ws://')) {
    normalized = normalized.replace('ws://', 'http://');
  } else if (!normalized.startsWith('http://') && !normalized.startsWith('https://')) {
    normalized = `https://${normalized}`;
  }
  return normalized;
}

export function cleanToken(token: string): string {
  if (!token) return '';
  return token.replace(/^Bearer\s+/i, '').trim();
}
