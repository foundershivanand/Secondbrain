# 🔒 Second Brain - Complete Security & Threat Model Audit

This security audit inspects the authentication, authorization, data protection, prompt injection resistance, and input validation systems across the Second Brain edge architecture.

---

## 1. Executive Security Assessment

The application is architected around a serverless Cloudflare Worker edge backend, Cloudflare D1 SQLite database, and a client-side React PWA.
- **Authentication Model:** Bearer token authentication via `Authorization: Bearer <AUTH_TOKEN>` or query parameter `?token=<AUTH_TOKEN>`.
- **Telegram Webhook Security:** Protected via `X-Telegram-Bot-Api-Secret-Token` header.
- **OAuth Architecture:** Google OAuth 2.0 PKCE / Authorization Code grant for YouTube Liked Videos and Playlist read access.
- **Data Protection:** SQLite parametrized queries protect against SQL injection. No raw file binaries are stored in D1.

---

## 2. Threat Classification Matrix

| Finding ID | Severity | Threat Category | Description | Status |
| :--- | :--- | :--- | :--- | :--- |
| **SEC-01** | **HIGH** | Authorization Bypass | Unprotected API Routes if `AUTH_TOKEN` Unconfigured | **CONFIRMED** |
| **SEC-02** | **MEDIUM** | Credential Exposure | Hardcoded Dev Token in Frontend Client (`api.ts`) | **CONFIRMED** |
| **SEC-03** | **MEDIUM** | Insecure Secrets Storage | Plaintext OAuth Tokens in D1 `brain_state` Table | **CONFIRMED** |
| **SEC-04** | **MEDIUM** | Access Control (CORS) | Overly Permissive `Access-Control-Allow-Origin: *` | **CONFIRMED** |
| **SEC-05** | **LOW** | Prompt Injection | Delimiter Hijacking in Multi-Modal Extraction | **MITIGATED** |
| **SEC-06** | **LOW** | Denial of Service | Unbounded Memory Scan in Search Route | **CONFIRMED** |
| **SEC-07** | **INFORMATIONAL** | SQL Injection | Evaluation of SQLite Parameterized Bindings | **SECURE** |

---

## 3. Detailed Security Findings

### SEC-01: Unprotected API Routes if `AUTH_TOKEN` is Unconfigured
- **Classification:** **HIGH**
- **Location:** `api/src/utils/security.ts`, lines 12–16:
  ```ts
  export function verifyAuth(request: Request, env: Env): boolean {
    if (!env.AUTH_TOKEN) {
      // If no AUTH_TOKEN is set in environment, allow local/dev requests
      return true;
    }
  ```
- **Analysis:**
  If an administrator deploys the Worker to Cloudflare without running `wrangler secret put AUTH_TOKEN`, the worker fails open. Every single endpoint—including `/api/knowledge`, `/api/memories`, `/api/brain-state`, and `/api/capture`—becomes globally accessible without authentication.
- **Remediation:**
  Enforce authentication in production environments. Only bypass auth when `env.ENVIRONMENT === 'development'`.

---

### SEC-02: Hardcoded Dev Token in Frontend Client (`api.ts`)
- **Classification:** **MEDIUM**
- **Location:** `web/src/services/api.ts`, lines 13–14:
  ```ts
  export const DEFAULT_WORKER_API = 'https://second-brain-api.foundershivanand.workers.dev';
  export const DEFAULT_AUTH_TOKEN = 'secondbrain_dev_secret';
  ```
- **Analysis:**
  The default auth token is statically bundled into the client JavaScript bundle. If the production worker also uses this token, any user who views the web app bundle source code can extract the administrative token and modify or delete the second brain vault.
- **Remediation:**
  Guard default token usage: only apply `DEFAULT_AUTH_TOKEN` when `import.meta.env.DEV` is true. In production builds, default to `localStorage.getItem('sb_auth_token') || ''`.

---

### SEC-03: Plaintext OAuth Tokens in D1 `brain_state` Table
- **Classification:** **MEDIUM**
- **Location:** `api/src/routes/youtube-sync.ts`:
  ```ts
  await db.setKV('youtube_client_secret', clientSecret);
  await db.setKV('youtube_oauth_token', JSON.stringify(tokens));
  ```
- **Analysis:**
  YouTube OAuth Client Secret and Refresh Tokens can be uploaded via the web interface and stored directly in the `brain_state` key-value table. If an unauthenticated user or an attacker queries `brain-state` or accesses D1 backups, Google OAuth credentials could be compromised.
- **Remediation:**
  Prefer Cloudflare Worker Secrets (`wrangler secret put YOUTUBE_CLIENT_SECRET`) over database storage. If stored in D1 KV, restrict `GET /api/youtube/status` to only return boolean flags (`hasClientSecret: true`), never returning the secret itself.

---

### SEC-04: Overly Permissive `Access-Control-Allow-Origin: *`
- **Classification:** **MEDIUM**
- **Location:** `api/src/utils/response.ts`, lines 1–5:
  ```ts
  export const CORS_HEADERS: Record<string, string> = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Telegram-Bot-Api-Secret-Token',
  };
  ```
- **Analysis:**
  The API allows requests from any origin (`*`). While convenient for web PWAs and userscripts, malicious websites open in a user's browser could theoretically send requests to the Second Brain if the user has cached bearer tokens in query parameters or headers.
- **Remediation:**
  Restrict CORS origins to the user's specific domain (or `localhost`) in production, or validate origin dynamically.

---

### SEC-05: Prompt Injection & Multi-Modal Delimiter Hijacking
- **Classification:** **LOW (MITIGATED)**
- **Location:** `api/src/utils/security.ts`, lines 3–10:
  ```ts
  export function sanitizeUntrustedInput(input: string): string {
    if (!input) return '';
    let text = input.slice(0, 100000);
    text = text.replace(/(\n|^)(System:|Developer:|Human:|Assistant:)/gi, '$1[User Content: $2]');
    return text;
  }
  ```
- **Analysis:**
  The system includes an input sanitizer that neutralizes standard prompt delimiter hijacking attempts and caps input at 100,000 characters. In addition, the extraction prompt instructs Gemini to output strict JSON schemas, ignoring adversarial instructions within captured text.
- **Remediation:**
  Keep the character truncation and delimiter neutralization intact.

---

### SEC-06: SQL Injection Assessment
- **Classification:** **INFORMATIONAL (SECURE)**
- **Analysis:**
  All SQL interactions inside `api/src/db/index.ts` use SQLite parameterized queries (`.prepare(...).bind(...)`). No raw string interpolation is used for SQL command construction. The database is well protected against standard SQL injection vectors.
