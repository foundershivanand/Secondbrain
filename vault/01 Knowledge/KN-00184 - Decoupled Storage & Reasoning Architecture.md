---
id: KN-00184
type: knowledge
source_type: raw_pointer
importance: 9
confidence: 0.96
topics:
  - Architecture
  - Cloudflare D1
  - Cost Optimization
  - Knowledge Management
source_id: SRC-00184
created_at: 2026-09-21T11:05:00.000Z
---

# Decoupled Storage & Reasoning Architecture

## Core Idea

Separating the 100 GB+ media layer from the knowledge index allows massive scalability on zero-cost tiers.

## Key Information

- Raw files stay in TeraBox, Telegram, Drive, or YouTube.
- D1 stores structured knowledge, atomic ideas, and relationships.
- Pointers link knowledge back to the original source.

## Atomic Knowledge

### Free tier scalability

Cloudflare D1 free limits of 500 MB are more than sufficient for thousands of compressed atomic notes.

**Type:** `FACT` | **Confidence:** 98%

## Insights

- Digital hoarding is solved by atomic compression and provenance pointers.

## Actions

- [ ] Never upload raw 10 GB videos to Cloudflare Workers or D1.
- [ ] Always maintain raw_storage and raw_url pointers in sources table.

## Related Topics

- [[Architecture]]
- [[Cloudflare D1]]
- [[Cost Optimization]]
- [[Knowledge Management]]

## My Thoughts

Never migrate 100 GB into Obsidian or D1. Keep raw pointers intact and store only 2-10 KB knowledge notes.

## Why I Saved This

Foundational principle for keeping the personal Second Brain free, fast, and durable.

## What Changed

Confirmed that raw media stays external while compressed notes live in D1 and Obsidian.

## Original Source

[Open original source](https://terabox.com/s/sample-paper)
