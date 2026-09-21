export interface Env {
  DB: D1Database;
  GEMINI_API_KEY?: string;
  GEMINI_MODEL?: string;
  TELEGRAM_BOT_TOKEN?: string;
  TELEGRAM_SECRET_TOKEN?: string;
  AUTH_TOKEN?: string;
  ENVIRONMENT?: string;
  VAULT_NAME?: string;
}

export const DEFAULT_GEMINI_MODEL = 'gemini-2.0-flash';
export const FALLBACK_GEMINI_MODEL = 'gemini-1.5-flash';
