# 🐛 Second Brain - Complete Bugs & Issues Log

This document cataloges all discovered bugs, defects, logical flaws, security hazards, and architectural inconsistencies across the codebase.

---

## Issue Summary Matrix

| ID | Severity | Category | Title | File Reference |
| :--- | :--- | :--- | :--- | :--- |
| **BUG-01** | **CRITICAL** | Data Loss | Accidental Total Database Inbox Wipe on Missing ID | [sources.ts:26-30](file:///home/shiva/secondbrain/api/src/routes/sources.ts#L26-L30) | **RESOLVED** |
| **BUG-02** | **CRITICAL** | AI Failure | Non-Existent Gemini Model ID (`gemini-3.8-flash`) | [config.ts:36](file:///home/shiva/secondbrain/api/src/config.ts#L36) | **RESOLVED** |
| **BUG-03** | **HIGH** | LLM Parsing | Fragile Code-Fence Stripping in `cleanAndParseJson` | [gemini.ts:287-295](file:///home/shiva/secondbrain/api/src/ai/gemini.ts#L287-L295) | **RESOLVED** |
| **BUG-04** | **HIGH** | Scalability | Full Table In-Memory Scan on Search | [search.ts:15-18](file:///home/shiva/secondbrain/api/src/routes/search.ts#L15-L18) | **RESOLVED** |
| **BUG-05** | **HIGH** | Query Bug | Excessive Search Sanitization & Query Truncation | [db/index.ts:283-294](file:///home/shiva/secondbrain/api/src/db/index.ts#L283-L294) | **RESOLVED** |
| **BUG-06** | **HIGH** | Data Integrity | Dangling Source References on Knowledge Deletion | [db/index.ts:302-306](file:///home/shiva/secondbrain/api/src/db/index.ts#L302-L306) | **RESOLVED** |
| **BUG-07** | **HIGH** | Code Quality | Hardcoded Anti-Screenshot & TeraBox SQL Filters | [db/index.ts:95,148,176](file:///home/shiva/secondbrain/api/src/db/index.ts#L95) | **RESOLVED** |
| **BUG-08** | **MEDIUM** | Resource Waste | Daily Brief Re-runs Evolution Agent on Every GET | [daily-brief.ts:11-16](file:///home/shiva/secondbrain/api/src/routes/daily-brief.ts#L11-L16) | **RESOLVED** |
| **BUG-09** | **MEDIUM** | Performance | Inefficient String Concatenation Base64 Loops | [github-sync.ts:54-60](file:///home/shiva/secondbrain/api/src/services/github-sync.ts#L54-L60) | **RESOLVED** |
| **BUG-10** | **MEDIUM** | Configuration | Outdated Worker Proxy Subdomain in Vite Config | [vite.config.ts:10](file:///home/shiva/secondbrain/web/vite.config.ts#L10) | **RESOLVED** |
| **BUG-11** | **MEDIUM** | Vault Structure| Inconsistent Category Directory Naming | [categories.ts:13-100](file:///home/shiva/secondbrain/api/src/utils/categories.ts#L13-L100) | **RESOLVED** |
| **BUG-12** | **MEDIUM** | Security | Fallback Auth Token Exposed in Client Code | [api.ts:14](file:///home/shiva/secondbrain/web/src/services/api.ts#L14) | **RESOLVED** |
| **BUG-13** | **MEDIUM** | Security | Unrestricted Public Access when AUTH_TOKEN Unset | [security.ts:12-16](file:///home/shiva/secondbrain/api/src/utils/security.ts#L12-L16) | **RESOLVED** |
| **BUG-14** | **LOW** | Repository Clutter| Orphan Duplicate Directory `api/api/` | [api/api/](file:///home/shiva/secondbrain/api/api/) | **RESOLVED** |
| **BUG-15** | **CRITICAL** | Testing | Complete Absence of Automated Test Suites | Repository-wide | **RESOLVED** |

---

## Detailed Bug Reports

### BUG-01: Accidental Total Database Inbox Wipe on Missing ID
- **Severity:** **CRITICAL**
- **Location:** `api/src/routes/sources.ts`, lines 26–33:
  ```ts
  if (request.method === 'DELETE') {
    if (!id || id === 'all') {
      await db.deleteAllSources();
      return jsonResponse({ success: true, message: 'All sources cleared from inbox' });
    }
    await db.deleteSource(id);
    return jsonResponse({ success: true, deletedId: id });
  }
  ```
- **Why It's an Issue:**
  When a client sends a `DELETE /api/sources` request without a trailing path parameter, `pathParts[0]` is `undefined` (`!id` evaluates to `true`). This immediately calls `db.deleteAllSources()`, which deletes ALL sources and processing jobs across the entire database! A client or frontend bug sending a malformed request will catastrophically delete all user captured records without warning or confirmation.
- **Affected Functionality:** Inbox source management, data retention.
- **Remediation:**
  Require an explicit subpath `id === 'all'` AND a confirmation body or query parameter (`?confirm=true`). Reject root `DELETE /api/sources` with `400 Bad Request`.

---

### BUG-02: Non-Existent Gemini Model ID (`gemini-3.8-flash`)
- **Severity:** **CRITICAL**
- **Location:** `api/src/config.ts`, line 36:
  ```ts
  export const DEFAULT_GEMINI_MODEL = 'gemini-3.8-flash';
  export const FALLBACK_GEMINI_MODEL = 'gemini-2.0-flash';
  ```
- **Why It's an Issue:**
  `gemini-3.8-flash` is not a valid Google Gemini model identifier in the Google Generative Language REST API (`generativelanguage.googleapis.com/v1beta/models/...`). When calling Google's API, the endpoint immediately responds with `404 Not Found` or `400 Bad Request`. This forces every single Gemini extraction request into the fallback handler, causing unnecessary latency and potential failures.
- **Affected Functionality:** All AI extraction, Chat RAG synthesis, and memory consolidation.
- **Remediation:**
  Change `DEFAULT_GEMINI_MODEL` to `gemini-2.0-flash` (or `gemini-1.5-flash`), and `FALLBACK_GEMINI_MODEL` to `gemini-1.5-flash`.

---

### BUG-03: Fragile Code-Fence Stripping in `cleanAndParseJson`
- **Severity:** **HIGH**
- **Location:** `api/src/ai/gemini.ts`, lines 287–295:
  ```ts
  export function cleanAndParseJson<T>(raw: string): T {
    let cleaned = raw.trim();
    if (cleaned.startsWith('```json')) {
      cleaned = cleaned.replace(/^```json\s*/, '').replace(/\s*```$/, '');
    } else if (cleaned.startsWith('```')) {
      cleaned = cleaned.replace(/^```\s*/, '').replace(/\s*```$/, '');
    }
    return JSON.parse(cleaned) as T;
  }
  ```
- **Why It's an Issue:**
  LLMs frequently prepend conversational text before JSON blocks (e.g., `Here is the structured extraction:\n```json\n{...}\n```\nHope this helps!`). In such cases, `cleaned.startsWith('```json')` evaluates to `false`, and `JSON.parse` throws a syntax error on the leading words (`Unexpected token 'H'`).
- **Affected Functionality:** Ingestion pipeline, chat synthesis, evolution agent, memory consolidation.
- **Remediation:**
  Implement regex-based extraction to locate the substring between the first `{` or `[` and the last `}` or `]`, and strip internal markdown code fences cleanly.

---

### BUG-04: Full Table In-Memory Scan on Search
- **Severity:** **HIGH**
- **Location:** `api/src/routes/search.ts`, lines 15–18:
  ```ts
  const memories = await db.listMemories();
  const matchedMemories = memories.filter((m) =>
    m.content.toLowerCase().includes(query.toLowerCase())
  );
  ```
- **Why It's an Issue:**
  `db.listMemories()` queries the entire `memories` table without a limit or filter, loading all rows into the Cloudflare Worker RAM. The worker then uses JavaScript `filter()` to perform string matching. As the number of memories grows, this will exhaust Cloudflare Worker memory (128MB limit) and incur severe CPU execution time penalties.
- **Affected Functionality:** Global search endpoint (`/api/search`).
- **Remediation:**
  Add a `searchMemories(query, limit)` method to `Database` utilizing SQLite `WHERE content LIKE ?` with indexed limit.

---

### BUG-05: Excessive Search Sanitization & Query Truncation
- **Severity:** **HIGH**
- **Location:** `api/src/db/index.ts`, line 283:
  ```ts
  const clean = searchTerm.trim().replace(/['"%;_\\]/g, ' ').trim().slice(0, 35);
  ```
- **Why It's an Issue:**
  1. SQLite parameterized bindings (`?`) already protect against SQL injection.
  2. Replacing apostrophes (`'`) breaks queries containing common English contractions (e.g. `don't`, `founder's`, `user's`).
  3. Truncating search terms to 35 characters truncates natural language queries typed by users.
- **Affected Functionality:** Search bar, topic queries, note retrieval.
- **Remediation:**
  Remove unnecessary character replacement; retain safe search length (e.g. 100 characters) and escape only SQL wildcard characters `%` and `_` if doing literal LIKE searches.

---

### BUG-06: Dangling Source References on Knowledge Deletion
- **Severity:** **HIGH**
- **Location:** `api/src/db/index.ts`, lines 302–306:
  ```ts
  async deleteKnowledge(id: string): Promise<void> {
    await this.db.prepare(`DELETE FROM atomic_knowledge WHERE knowledge_id = ?`).bind(id).run();
    await this.db.prepare(`DELETE FROM relationships WHERE from_id = ? OR to_id = ?`).bind(id, id).run();
    await this.db.prepare(`DELETE FROM knowledge WHERE id = ?`).bind(id).run();
  }
  ```
- **Why It's an Issue:**
  When a knowledge note is deleted, the source that produced it still exists with `status = 'DONE'`. There is no link updated, leaving orphaned sources in the inbox. Additionally, foreign keys in SQLite require `PRAGMA foreign_keys = ON;`.
- **Affected Functionality:** Note deletion, inbox synchronization.
- **Remediation:**
  Update the associated source status to `REMOVED` or `RECEIVED` or delete the source if requested.

---

### BUG-07: Hardcoded Anti-Screenshot & TeraBox SQL Filters
- **Severity:** **HIGH**
- **Location:**
  - `api/src/db/index.ts`: lines 95, 148, 176, 556, 633
  - `web/src/services/api.ts`: lines 66–72, lines 211–217
- **Why It's an Issue:**
  Hardcoded filters like `raw_storage != 'terabox' AND id NOT LIKE 'SRC-IMAGES-%'` and `title NOT LIKE 'Screenshot_%.png'` were added to hide accidental batch uploads. If a user captures a legitimate mobile screenshot named `Screenshot_2026.png`, the system silently suppresses it from queries, stats, and search results!
- **Affected Functionality:** All source listing, stats counting, and YouTube queries.
- **Remediation:**
  Replace hardcoded filename checks with a proper `status = 'ARCHIVED'` or `status = 'IGNORED'` status flag. Clean existing bad records via a migration query.

---

### BUG-08: Daily Brief Re-runs Evolution Agent on Every GET
- **Severity:** **MEDIUM**
- **Location:** `api/src/routes/daily-brief.ts`, lines 11–16:
  ```ts
  export async function handleDailyBrief(request: Request, env: Env, db: Database): Promise<Response> {
    try {
      const report = await runEvolutionAgent(env, db);
      return jsonResponse({ success: true, report });
  ```
- **Why It's an Issue:**
  Every time a user visits the chat tab or clicks "Daily Brief", a full multi-prompt LLM agent runs. This causes 5–15 second UI delays and burns AI API quota repeatedly for the same day.
- **Affected Functionality:** Daily Brief modal, API cost and latency.
- **Remediation:**
  Store the generated Daily Brief in `brain_state` keyed by `daily_brief_YYYY-MM-DD`. Serve the cached version on `GET`, and only regenerate on `POST` or `GET ?refresh=true`.

---

### BUG-09: Inefficient String Concatenation Base64 Loops
- **Severity:** **MEDIUM**
- **Location:**
  - `api/src/services/github-sync.ts`, lines 54–60
  - `api/src/routes/telegram.ts`, lines 35–38
  - `api/src/routes/capture.ts`, lines 65–68
- **Why It's an Issue:**
  Iterating over thousands or millions of bytes with `binary += String.fromCharCode(bytes[i])` in a JavaScript loop causes severe string reallocation overhead and can trigger call stack / memory errors on large files.
- **Affected Functionality:** GitHub sync, Telegram media capture, file uploads.
- **Remediation:**
  Use `Buffer.from(arrayBuffer).toString('base64')` (enabled via `nodejs_compat` in Cloudflare Workers) or chunked Uint8Array conversion.

---

### BUG-10: Outdated Worker Proxy Subdomain in Vite Config
- **Severity:** **MEDIUM**
- **Location:** `web/vite.config.ts`, line 10:
  ```ts
  target: process.env.VITE_API_URL || 'https://second-brain-api.fitt.workers.dev',
  ```
  vs `web/src/services/api.ts`, line 13:
  ```ts
  export const DEFAULT_WORKER_API = 'https://second-brain-api.foundershivanand.workers.dev';
  ```
- **Why It's an Issue:**
  `fitt.workers.dev` points to an old, non-functional or dead worker. When developers run `npm run dev:web` without setting `VITE_API_URL`, API calls through Vite's local proxy route to the wrong subdomain.
- **Affected Functionality:** Local frontend development proxy.
- **Remediation:**
  Update `web/vite.config.ts` fallback to `https://second-brain-api.foundershivanand.workers.dev` or `http://127.0.0.1:8787`.

---

### BUG-11: Inconsistent Category Directory Naming
- **Severity:** **MEDIUM**
- **Location:** `api/src/utils/categories.ts` vs `scripts/reset-brain-data.mjs`
- **Why It's an Issue:**
  `reset-brain-data.mjs` initialized folders like `01 - AI & Autonomous Systems`, while `markdown.ts` formats paths as `01 Knowledge/AI Agents & Autonomous Systems`. This creates duplicate directory structures in the Obsidian vault.
- **Affected Functionality:** Obsidian vault organization.
- **Remediation:**
  Standardize canonical category directory names across all scripts and generators.

---

### BUG-12: Fallback Auth Token Exposed in Client Code
- **Severity:** **MEDIUM**
- **Location:** `web/src/services/api.ts`, line 14:
  ```ts
  export const DEFAULT_AUTH_TOKEN = 'secondbrain_dev_secret';
  ```
- **Why It's an Issue:**
  The default development token is bundled into production client JS bundles. If the backend uses this default token in production, anyone inspecting the web bundle has full administrative write access to the Second Brain API.
- **Affected Functionality:** Production API authorization.
- **Remediation:**
  Only use the fallback token in development (`import.meta.env.DEV`). Require user-configured token in settings or environment variable for production builds.

---

### BUG-13: Unrestricted Public Access when AUTH_TOKEN Unset
- **Severity:** **MEDIUM**
- **Location:** `api/src/utils/security.ts`, lines 12–16:
  ```ts
  export function verifyAuth(request: Request, env: Env): boolean {
    if (!env.AUTH_TOKEN) {
      return true;
    }
  ```
- **Why It's an Issue:**
  If a developer forgets to configure `AUTH_TOKEN` in Cloudflare Worker secrets, the API fails open, granting unauthenticated access to all personal notes, thoughts, and memories.
- **Affected Functionality:** API security.
- **Remediation:**
  Emit a loud security warning if in production mode; enforce authentication unless `ENVIRONMENT === 'development'`.

---

### BUG-14: Orphan Duplicate Directory `api/api/`
- **Severity:** **LOW**
- **Location:** `/home/shiva/secondbrain/api/api/`
- **Why It's an Issue:**
  Contains obsolete duplicate files (`schema.sql`, `wrangler.toml`, `wrangler.toml.save`). Creates confusion for developers inspecting the backend.
- **Affected Functionality:** Developer ergonomics.
- **Remediation:**
  Remove the obsolete `api/api/` directory.

---

### BUG-15: Complete Absence of Automated Test Suites
- **Severity:** **CRITICAL**
- **Location:** Repository-wide
- **Why It's an Issue:**
  Zero automated unit, integration, or E2E tests exist in the entire repository. There is no way to verify regression safety when modifying core extraction, Markdown formatting, or database operations.
- **Affected Functionality:** Entire development lifecycle and production readiness.
- **Remediation:**
  Configure Vitest test harness and implement comprehensive unit tests for markdown generation, categories, security sanitization, deduplication hashing, and JSON parsing.
