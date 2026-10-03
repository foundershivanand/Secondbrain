export type SourceType =
  | 'text'
  | 'screenshot'
  | 'image'
  | 'pdf'
  | 'url'
  | 'youtube'
  | 'video'
  | 'voice'
  | 'chat_export'
  | 'raw_pointer';

export type SourceStatus =
  | 'RECEIVED'
  | 'QUEUED'
  | 'EXTRACTING'
  | 'ANALYZING'
  | 'CONNECTING'
  | 'INDEXING'
  | 'DONE'
  | 'FAILED'
  | 'NEEDS_REVIEW';

export type IngestionPriority = 'P0' | 'P1' | 'P2' | 'P3' | 'P4';

export interface SourceRecord {
  id: string;
  raw_id?: string | null;
  source_type: SourceType;
  title: string | null;
  original_url: string | null;
  raw_storage: string | null; // 'terabox', 'gdrive', 'telegram', 'discord', 'web', 'local'
  raw_file_id: string | null;
  raw_message_id?: string | null;
  channel_id?: string | null;
  raw_url: string | null;
  mime_type: string | null;
  file_size: number | null;
  captured_at: string;
  processed_at: string | null;
  status: SourceStatus;
  content_hash: string | null;
  importance: number;
  priority?: IngestionPriority;
  created_at: string;
}

export interface AtomicKnowledgeItem {
  id?: string;
  knowledge_id?: string;
  statement: string;
  concept_type: 'CONCEPT' | 'FACT' | 'CLAIM' | 'ACTION' | 'INSIGHT' | 'USER_THOUGHT' | 'AI_SUGGESTION';
  confidence: number;
  created_at?: string;
}

export interface KnowledgeRecord {
  id: string;
  source_id: string | null;
  title: string;
  knowledge_type: string;
  core_idea: string;
  key_information: string; // JSON string
  insights: string;        // JSON string (AI suggestions)
  my_thought: string | null;// Explicit user thoughts
  actionable_items: string;// JSON string
  topics: string;          // JSON string
  entities: string;        // JSON string
  tags: string;            // JSON string
  confidence: number;
  importance: number;
  why_saved: string;
  what_changed: string;
  markdown_path: string | null;
  created_at: string;
  updated_at: string;
  atomic_items?: AtomicKnowledgeItem[];
}

export interface MemoryRecord {
  id: string;
  memory_type: string;
  content: string;
  evidence: string | null;
  confidence: number | null;
  importance: number;
  repetition_count: number;
  memory_score: number | null;
  status: 'CANDIDATE' | 'DURABLE' | 'REJECTED' | 'SUPERSEDED';
  created_at: string;
  updated_at: string;
}

export interface RelationshipRecord {
  id: string;
  from_id: string;
  to_id: string;
  relationship_type: string;
  confidence: number;
  created_at: string;
}

export interface BrainState {
  current_goals: string[];
  active_projects: string[];
  important_preferences: string[];
  recent_learning: string[];
  current_interests: { topic: string; interest_score: number; trend: string }[];
  open_questions: string[];
  recent_decisions: string[];
  knowledge_gaps: string[];
}

export interface MapOfContentRecord {
  id: string;
  topic: string;
  title: string;
  summary: string;
  linked_knowledge: string; // JSON array of IDs
  markdown_path: string;
  created_at: string;
  updated_at: string;
}

export interface CitationSource {
  id: string;
  title: string;
  source_type: string;
  raw_id?: string | null;
  original_url?: string | null;
  raw_storage?: string | null;
  raw_url?: string | null;
  snippet?: string;
  timestamp?: string;
}

export interface ChatResponse {
  answer: string;
  sources: CitationSource[];
  related_topics: string[];
  memories_used: string[];
  suggested_questions: string[];
  conflict_detected?: {
    prior_belief: string;
    new_evidence: string;
    suggested_action: string;
  };
}

export interface BrainStats {
  sourcesCount: number;
  knowledgeCount: number;
  atomicCount: number;
  memoriesCount: number;
  durableMemoriesCount: number;
  relationshipsCount: number;
  mocsCount?: number;
}

export interface YouTubePlaylistItem {
  id: string;
  title: string;
  description: string;
  item_count: number;
  privacy_status: string;
  thumbnail_url?: string;
  playlist_url: string;
  synced_at?: string;
  created_at?: string;
}
