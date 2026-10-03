-- Second Brain Database Schema (Cloudflare D1 SQLite)

-- 1. Sources: Raw inputs, files, and pointers (Telegram, Drive, TeraBox, Discord, etc.)
CREATE TABLE IF NOT EXISTS sources (
    id TEXT PRIMARY KEY,
    raw_id TEXT,              -- RAW-XXXXXX pointer
    source_type TEXT NOT NULL,
    title TEXT,
    original_url TEXT,
    raw_storage TEXT,         -- 'terabox', 'gdrive', 'telegram', 'discord', 'web', 'local'
    raw_file_id TEXT,
    raw_message_id TEXT,
    channel_id TEXT,
    raw_url TEXT,
    mime_type TEXT,
    file_size INTEGER,
    captured_at TEXT NOT NULL,
    processed_at TEXT,
    status TEXT NOT NULL DEFAULT 'RECEIVED',
    content_hash TEXT,
    importance INTEGER DEFAULT 5,
    priority TEXT DEFAULT 'P1', -- 'P0', 'P1', 'P2', 'P3', 'P4'
    created_at TEXT NOT NULL
);

-- 2. Knowledge: Compressed structured knowledge notes
CREATE TABLE IF NOT EXISTS knowledge (
    id TEXT PRIMARY KEY,
    source_id TEXT,
    title TEXT NOT NULL,
    knowledge_type TEXT NOT NULL,
    core_idea TEXT,
    key_information TEXT,     -- JSON array of strings
    insights TEXT,            -- JSON array of strings (AI insights)
    my_thought TEXT,          -- Explicit User Thoughts (Distinguished from AI)
    actionable_items TEXT,    -- JSON array of strings
    topics TEXT,              -- JSON array of strings
    entities TEXT,            -- JSON array of strings
    tags TEXT,                -- JSON array of strings
    confidence REAL,
    importance INTEGER,
    why_saved TEXT,
    what_changed TEXT,
    markdown_path TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY(source_id) REFERENCES sources(id) ON DELETE SET NULL
);

-- 3. Atomic Knowledge: Individual modular ideas (M2 Layer)
CREATE TABLE IF NOT EXISTS atomic_knowledge (
    id TEXT PRIMARY KEY,
    knowledge_id TEXT NOT NULL,
    statement TEXT NOT NULL,
    concept_type TEXT NOT NULL, -- 'CONCEPT', 'FACT', 'CLAIM', 'ACTION', 'INSIGHT', 'USER_THOUGHT', 'AI_SUGGESTION'
    confidence REAL,
    created_at TEXT NOT NULL,
    FOREIGN KEY(knowledge_id) REFERENCES knowledge(id) ON DELETE CASCADE
);

-- 4. Relationships: Knowledge graph edges and concept connections
CREATE TABLE IF NOT EXISTS relationships (
    id TEXT PRIMARY KEY,
    from_id TEXT NOT NULL,
    to_id TEXT NOT NULL,
    relationship_type TEXT NOT NULL,
    confidence REAL,
    created_at TEXT NOT NULL
);

-- 5. Memories: Long-term memory candidates and durable consolidated facts (M4 Layer)
CREATE TABLE IF NOT EXISTS memories (
    id TEXT PRIMARY KEY,
    memory_type TEXT NOT NULL,
    content TEXT NOT NULL,
    evidence TEXT,
    confidence REAL,
    importance INTEGER,
    repetition_count INTEGER DEFAULT 1,
    memory_score REAL,
    status TEXT DEFAULT 'CANDIDATE', -- 'CANDIDATE', 'DURABLE', 'REJECTED', 'SUPERSEDED'
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

-- 6. Processing Jobs: Asynchronous ingestion queue
CREATE TABLE IF NOT EXISTS processing_jobs (
    id TEXT PRIMARY KEY,
    source_id TEXT NOT NULL,
    job_type TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'QUEUED', -- 'QUEUED', 'PROCESSING', 'COMPLETED', 'FAILED'
    attempts INTEGER DEFAULT 0,
    error TEXT,
    created_at TEXT NOT NULL,
    started_at TEXT,
    completed_at TEXT
);

-- 7. Brain State: Compact current context (5–20 KB global understanding)
CREATE TABLE IF NOT EXISTS brain_state (
    key TEXT PRIMARY KEY,
    data TEXT NOT NULL, -- JSON object
    updated_at TEXT NOT NULL
);

-- 8. Maps of Content (MOCs): Topic-level index summaries (M3 Layer)
CREATE TABLE IF NOT EXISTS mocs (
    id TEXT PRIMARY KEY,
    topic TEXT NOT NULL UNIQUE,
    title TEXT NOT NULL,
    summary TEXT,
    linked_knowledge TEXT, -- JSON array of knowledge IDs
    markdown_path TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

-- 9. YouTube Playlists: User profile playlists & sync metadata
CREATE TABLE IF NOT EXISTS youtube_playlists (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    item_count INTEGER DEFAULT 0,
    privacy_status TEXT,
    thumbnail_url TEXT,
    playlist_url TEXT,
    synced_at TEXT,
    created_at TEXT NOT NULL
);

-- Indexes for lightning fast retrieval and indexing
CREATE INDEX IF NOT EXISTS idx_sources_status ON sources(status);
CREATE INDEX IF NOT EXISTS idx_sources_raw_id ON sources(raw_id);
CREATE INDEX IF NOT EXISTS idx_sources_priority ON sources(priority);
CREATE INDEX IF NOT EXISTS idx_sources_content_hash ON sources(content_hash);
CREATE INDEX IF NOT EXISTS idx_knowledge_source_id ON knowledge(source_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_created_at ON knowledge(created_at);
CREATE INDEX IF NOT EXISTS idx_atomic_knowledge_kid ON atomic_knowledge(knowledge_id);
CREATE INDEX IF NOT EXISTS idx_relationships_from ON relationships(from_id);
CREATE INDEX IF NOT EXISTS idx_relationships_to ON relationships(to_id);
CREATE INDEX IF NOT EXISTS idx_memories_status ON memories(status);
CREATE INDEX IF NOT EXISTS idx_jobs_status ON processing_jobs(status);
