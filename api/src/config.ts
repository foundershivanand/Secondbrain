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

  // YouTube Liked Videos & Playlist Sync
  YOUTUBE_CLIENT_ID?: string;
  YOUTUBE_CLIENT_SECRET?: string;
  YOUTUBE_REFRESH_TOKEN?: string;
  YOUTUBE_PLAYLIST_ID?: string;
  YOUTUBE_API_KEY?: string;

  // Multi-AI Collaboration & Quota Failover
  GROK_API_KEY?: string;
  ANTHROPIC_API_KEY?: string;
  COPILOT_API_KEY?: string;
  OPENAI_API_KEY?: string;
  GROQ_API_KEY?: string;
  OPENROUTER_API_KEY?: string;
  INCEPTION_API_KEY?: string;
}

export const DEFAULT_GEMINI_MODEL = 'gemini-2.0-flash';
export const FALLBACK_GEMINI_MODEL = 'gemini-1.5-flash';
