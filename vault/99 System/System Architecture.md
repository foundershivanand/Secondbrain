---
id: SYS-001
type: system
title: Second Brain Architecture Overview
updated_at: 2026-09-21
---

# Second Brain Architecture & Operating Manual

## 1. Core Rule

> **Your Second Brain will NOT store your 100 GB+ raw media inside Obsidian or the database.**
> Raw files stay wherever they already live (TeraBox, Telegram, Drive, YouTube).
> Your system stores the compressed knowledge, metadata, relationships, provenance, and a pointer back to the original.

## 2. Memory Hierarchy

- **M0 — RAW**: Screenshots, videos, PDFs, chats stored externally.
- **M1 — SOURCE SUMMARY**: What the source contains.
- **M2 — ATOMIC KNOWLEDGE**: Modular, reusable ideas with independent confidence scores.
- **M3 — TOPIC KNOWLEDGE**: Interconnected conceptual clusters ([[AI Agents]], [[SaaS]], [[Memory]]).
- **M4 — PERSONAL MEMORY**: Consolidated facts, preferences, decisions, and mental models.
- **M5 — CURRENT CONTEXT**: Dynamically retrieved knowledge synthesized for the current task.

## 3. Vault Structure

- `00 Inbox/`: Raw incoming markdown drafts awaiting review.
- `01 Knowledge/`: Compressed, structured knowledge notes with atomic blocks and frontmatter.
- `02 Topics/`: Broad subject index notes linking [[WikiLinks]].
- `03 Projects/`: Active goals, roadmaps, and execution tracking.
- `04 People/`: Collaborators, authors, researchers, and network context.
- `05 Resources/`: Curated tools, libraries, and frameworks.
- `06 Memories/`: Consolidated durable facts and mental models.
- `07 Ideas/`: Product opportunities, SaaS concepts, content scripts.
- `08 Decisions/`: Architectural decision records (ADRs) and life milestones.
- `09 Sources/`: Catalog of external pointers (Drive, TeraBox, YouTube).
- `99 System/`: Configuration, prompts, schemas, and operating manuals.
