import { Env } from '../config';

export function sanitizeUntrustedInput(input: string): string {
  if (!input) return '';
  // Truncate to safe limit (100k chars for text)
  let text = input.slice(0, 100000);
  // Neutralize common system prompt delimiter hijacking
  text = text.replace(/(\n|^)(System:|Developer:|Human:|Assistant:)/gi, '$1[User Content: $2]');
  return text;
}

export function verifyAuth(request: Request, env: Env): boolean {
  if (!env.AUTH_TOKEN) {
    if (env.ENVIRONMENT === 'production') {
      console.warn('⚠️ [SECURITY ALERT] Worker running in production without AUTH_TOKEN configured! Requests are unprotected.');
    }
    // If no AUTH_TOKEN is set in environment, allow local/dev requests
    return true;
  }

  const authHeader = request.headers.get('Authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7).trim();
    if (token === env.AUTH_TOKEN) return true;
  }

  const url = new URL(request.url);
  const tokenParam = url.searchParams.get('token');
  if (tokenParam && tokenParam === env.AUTH_TOKEN) return true;

  return false;
}

export function verifyTelegramWebhook(request: Request, env: Env): boolean {
  if (!env.TELEGRAM_SECRET_TOKEN) {
    // In dev mode without secret token set, accept requests
    return true;
  }

  const incomingSecret = request.headers.get('X-Telegram-Bot-Api-Secret-Token');
  return incomingSecret === env.TELEGRAM_SECRET_TOKEN;
}
