---
id: MEM-DECISIONS
type: memory
category: decisions
updated_at: 2026-09-21
---

# 🏛 Architectural Decisions (ADRs)

## ADR-001: Operational Database vs Portable Source of Truth
- **Decision:** Cloudflare D1 acts as the operational database for fast web querying and RAG indexing. Obsidian Markdown files remain the portable, local-first source of truth.
- **Rationale:** Keeps the web app lightning fast on edge without scanning disk files while preserving complete ownership of personal notes.

## ADR-002: Progressive 100 GB Ingestion
- **Decision:** Do NOT migrate or batch-process 100 GB in one go. Register files into a raw manifest with priority ratings (`P0` to `P4`) and ingest progressively.
- **Rationale:** Avoids hitting API rate limits, minimizes token expenditure, and ensures the core brain is operational immediately.
