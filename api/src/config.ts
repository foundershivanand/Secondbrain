export interface Env {
  DB: D1Database;
  GEMINI_API_KEY?: string;
  GEMINI_PROJECT_ID?: string;
  GEMINI_MODEL?: string;
  TELEGRAM_BOT_TOKEN?: string;
  TELEGRAM_SECRET_TOKEN?: string;
  AUTH_TOKEN?: string;
  ENVIRONMENT?: string;
  VAULT_NAME?: string;

  // Cloud-Native GitHub Obsidian Sync (Committed directly from Worker)
  GITHUB_TOKEN?: string;
  GITHUB_OWNER?: string;
  GITHUB_REPO?: string;
  GITHUB_BRANCH?: string;
  GITHUB_PATH_PREFIX?: string;
}

export const DEFAULT_GEMINI_MODEL = 'gemini-2.5-flash';
export const FALLBACK_GEMINI_MODEL = 'gemini-3.5-flash-lite';
