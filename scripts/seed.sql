-- Seed starter data for Second Brain (D1 SQLite)

-- Sources with full pointer metadata (raw_id, raw_location, raw_file_id, channel_id, message_id)
INSERT OR IGNORE INTO sources (
    id, raw_id, source_type, title, original_url, raw_storage, raw_file_id, raw_message_id, channel_id, raw_url,
    mime_type, file_size, captured_at, processed_at, status, content_hash, importance, priority, created_at
) VALUES 
(
    'SRC-00182',
    'RAW-019823',
    'youtube',
    'AI Agent Memory Architecture',
    'https://www.youtube.com/watch?v=sample-agent-architecture',
    'google_drive',
    '1AbCdEfG_DriveFileId',
    NULL,
    NULL,
    'https://drive.google.com/file/d/1AbCdEfG_DriveFileId/view',
    'video/mp4',
    450000000,
    '2026-09-20T14:30:00Z',
    '2026-09-20T14:35:00Z',
    'DONE',
    'hash-src-00182',
    9,
    'P0',
    '2026-09-20T14:30:00Z'
),
(
    'SRC-00183',
    'RAW-019824',
    'screenshot',
    'Frictionless SaaS Onboarding UX Pattern',
    NULL,
    'telegram',
    'tg-file-98214',
    '81923',
    NULL,
    'telegram://file/tg-file-98214',
    'image/png',
    1240000,
    '2026-09-21T09:15:00Z',
    '2026-09-21T09:16:00Z',
    'DONE',
    'hash-src-00183',
    8,
    'P1',
    '2026-09-21T09:15:00Z'
),
(
    'SRC-00184',
    'RAW-019825',
    'raw_pointer',
    'Decoupled Storage & Reasoning Whitepaper',
    'https://terabox.com/s/sample-paper',
    'terabox',
    'tb-9921',
    NULL,
    NULL,
    'https://terabox.com/s/sample-paper',
    'application/pdf',
    24000000,
    '2026-09-21T11:00:00Z',
    '2026-09-21T11:05:00Z',
    'DONE',
    'hash-src-00184',
    9,
    'P0',
    '2026-09-21T11:00:00Z'
);

-- Knowledge with explicit distinction between my_thought (User Words) and insights (AI Suggestions)
INSERT OR IGNORE INTO knowledge (
    id, source_id, title, knowledge_type, core_idea, key_information, insights,
    my_thought, actionable_items, topics, entities, tags, confidence, importance, why_saved,
    what_changed, markdown_path, created_at, updated_at
) VALUES
(
    'KN-00182',
    'SRC-00182',
    'AI Agent Memory Architecture',
    'youtube',
    'AI agents should retrieve relevant memory rather than loading all historical context into every prompt.',
    '["Memory can be represented as structured knowledge.","Retrieval provides relevant context instead of raw context dumping.","Long-term memory should be selectively consolidated nightly."]',
    '["Decouple storage from reasoning to keep token costs negligible.","Raw context stuffing degrades reasoning precision."]',
    'I should build an autonomous knowledge extraction agent for my own second brain to test this retrieval architecture.',
    '["Implement hierarchical retrieval before generating AI responses.","Schedule nightly memory consolidation agent."]',
    '["AI","Agents","Memory","RAG"]',
    '["Gemini","Cloudflare D1","Obsidian"]',
    '["AI","Agents","Memory","RAG"]',
    0.95,
    9,
    'Relevant to the user''s AI agent and Second Brain architecture.',
    'Strengthens the decision to use hierarchical retrieval instead of full-context storage.',
    '01 Knowledge/KN-00182 - AI Agent Memory Architecture.md',
    '2026-09-20T14:35:00Z',
    '2026-09-20T14:35:00Z'
),
(
    'KN-00183',
    'SRC-00183',
    'Frictionless SaaS Onboarding UX Pattern',
    'screenshot',
    'Instant time-to-value with deferred authentication yields significantly higher activation rates.',
    '["Allow users to immediately test the core feature before signing up.","Save state in localStorage until action requires persistence."]',
    '["Users abandon apps when hit with a login wall before seeing value."]',
    'Our mobile capture PWA should allow immediate capturing without forcing credentials upfront.',
    '["Implement immediate quick capture on Second Brain without blocking for credentials."]',
    '["SaaS","UX","Product","Conversion"]',
    '["Product Factory","PWA"]',
    '["SaaS","UX","Product"]',
    0.92,
    8,
    'Valuable pattern for the Product Factory and mobile capture PWA.',
    'Shifted registration to post-capture confirmation rather than pre-entry.',
    '01 Knowledge/KN-00183 - Frictionless SaaS Onboarding UX Pattern.md',
    '2026-09-21T09:16:00Z',
    '2026-09-21T09:16:00Z'
),
(
    'KN-00184',
    'SRC-00184',
    'Decoupled Storage & Reasoning Architecture',
    'raw_pointer',
    'Separating the 100 GB+ media layer from the knowledge index allows massive scalability on zero-cost tiers.',
    '["Raw files stay in TeraBox, Telegram, Drive, or YouTube.","D1 stores structured knowledge, atomic ideas, and relationships.","Pointers link knowledge back to the original source."]',
    '["Digital hoarding is solved by atomic compression and provenance pointers."]',
    'Never migrate 100 GB into Obsidian or D1. Keep raw pointers intact and store only 2-10 KB knowledge notes.',
    '["Never upload raw 10 GB videos to Cloudflare Workers or D1.","Always maintain raw_storage and raw_url pointers in sources table."]',
    '["Architecture","Cloudflare D1","Cost Optimization","Knowledge Management"]',
    '["TeraBox","Telegram","Google Drive","Cloudflare Workers"]',
    '["Architecture","Knowledge Management"]',
    0.96,
    9,
    'Foundational principle for keeping the personal Second Brain free, fast, and durable.',
    'Confirmed that raw media stays external while compressed notes live in D1 and Obsidian.',
    '01 Knowledge/KN-00184 - Decoupled Storage & Reasoning Architecture.md',
    '2026-09-21T11:05:00Z',
    '2026-09-21T11:05:00Z'
);

-- Atomic Knowledge (M2 Layer) with distinct concept types
INSERT OR IGNORE INTO atomic_knowledge (id, knowledge_id, statement, concept_type, confidence, created_at) VALUES
('AK-182-1', 'KN-00182', 'Retrieval reduces the amount of historical context that must be supplied to an AI model.', 'CONCEPT', 0.94, '2026-09-20T14:35:00Z'),
('AK-182-2', 'KN-00182', 'Decoupling storage from reasoning prevents prompt bloating and reduces token costs.', 'FACT', 0.96, '2026-09-20T14:35:00Z'),
('AK-182-3', 'KN-00182', 'I should build an autonomous knowledge extraction agent for my own second brain.', 'USER_THOUGHT', 0.98, '2026-09-20T14:35:00Z'),
('AK-183-1', 'KN-00183', 'Immediate interaction before signup dramatically increases user retention.', 'INSIGHT', 0.92, '2026-09-21T09:16:00Z'),
('AK-184-1', 'KN-00184', 'Cloudflare D1 free limits of 500 MB are more than sufficient for thousands of compressed atomic notes.', 'FACT', 0.98, '2026-09-21T11:05:00Z');

-- Relationships
INSERT OR IGNORE INTO relationships (id, from_id, to_id, relationship_type, confidence, created_at) VALUES
('REL-1', 'KN-00182', 'RAG', 'USES', 0.95, '2026-09-20T14:35:00Z'),
('REL-2', 'KN-00182', 'Memory Systems', 'RELATED_TO', 0.92, '2026-09-20T14:35:00Z'),
('REL-3', 'KN-00182', 'Product Factory', 'INSPIRED_BY', 0.88, '2026-09-20T14:35:00Z'),
('REL-4', 'KN-00184', 'Second Brain Architecture', 'APPLIES_TO', 0.99, '2026-09-21T11:05:00Z');

-- Memories (M4 Layer) with calculated memory_score (importance * confidence * repetition)
INSERT OR IGNORE INTO memories (id, memory_type, content, evidence, confidence, importance, repetition_count, memory_score, status, created_at, updated_at) VALUES
(
    'MEM-001',
    'FACT',
    'The user''s Second Brain should use hierarchical retrieval rather than injecting the entire knowledge base into prompts.',
    'AI Agent Memory Architecture (SRC-00182)',
    0.98,
    9,
    3,
    26.46,
    'DURABLE',
    '2026-09-20T14:35:00Z',
    '2026-09-20T14:35:00Z'
),
(
    'MEM-002',
    'PREFERENCE',
    'Raw media (100 GB+) must remain in external storage (TeraBox, Drive, Telegram); D1 stores only compressed knowledge and provenance pointers.',
    'Decoupled Storage & Reasoning Whitepaper (SRC-00184)',
    0.99,
    10,
    4,
    39.6,
    'DURABLE',
    '2026-09-21T11:05:00Z',
    '2026-09-21T11:05:00Z'
),
(
    'MEM-003',
    'CANDIDATE',
    'Integrate Telegram bot webhooks directly with Cloudflare Workers to enable instant voice, screenshot, and text captures on mobile.',
    'System Architecture Discussion',
    0.90,
    8,
    1,
    7.2,
    'CANDIDATE',
    '2026-09-21T12:00:00Z',
    '2026-09-21T12:00:00Z'
);

-- Brain State: Compact Current Context (5–20 KB global understanding loaded for fast reasoning)
INSERT OR REPLACE INTO brain_state (key, data, updated_at) VALUES
(
    'current',
    '{
      "current_goals": [
        "Deploy personal Second Brain on Cloudflare Workers and D1 before Friday",
        "Maintain raw 100 GB+ library in external storage with zero Obsidian vault bloat"
      ],
      "active_projects": [
        "Personal Intelligence OS (Worker + D1 + Gemini + PWA)",
        "Telegram Capture Bot with Webhook Secret Verification",
        "Product Factory and Content Factory Integrations"
      ],
      "important_preferences": [
        "I want to ship products quickly and use AI to handle most repetitive work",
        "Never migrate 100 GB raw media into Obsidian; store only compressed atomic knowledge notes (2-10 KB)",
        "Strictly distinguish user thoughts from AI-generated suggestions"
      ],
      "recent_learning": [
        "Hierarchical compression (M0 to M5) allows unlimited perceived memory within free Cloudflare D1 limits",
        "Nightly memory consolidation prevents transient debugging chatter from entering permanent memory"
      ],
      "current_interests": [
        { "topic": "AI agents", "interest_score": 0.95, "trend": "increasing" },
        { "topic": "Memory Systems & RAG", "interest_score": 0.92, "trend": "increasing" },
        { "topic": "SaaS Product Validation", "interest_score": 0.88, "trend": "stable" }
      ],
      "open_questions": [
        "What is the best batch ingestion cadence for importing large Google Takeout YouTube watch histories?"
      ],
      "recent_decisions": [
        "Decided to use D1 as operational index database and Obsidian Markdown files as portable source of truth"
      ],
      "knowledge_gaps": [
        "Long-term benchmark of YouTube chapter extraction vs full Whisper transcript analysis"
      ]
    }',
    '2026-09-21T12:00:00Z'
);

-- Maps of Content (MOCs)
INSERT OR REPLACE INTO mocs (id, topic, title, summary, linked_knowledge, markdown_path, created_at, updated_at) VALUES
(
    'MOC-001',
    'AI Agents',
    'Map of Content: AI Agents & Memory Architecture',
    'Core hub for autonomous agent architectures, persistent retrieval memory, and tool use patterns.',
    '["KN-00182","KN-00184"]',
    '02 Topics/MOC - AI Agents & Memory.md',
    '2026-09-21T12:00:00Z',
    '2026-09-21T12:00:00Z'
);
