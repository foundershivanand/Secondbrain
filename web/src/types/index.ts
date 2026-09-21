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

export interface SourceRecord {
  id: string;
  source_type: SourceType;
  title: string | null;
  original_url: string | null;
  raw_storage: string | null;
  raw_file_id: string | null;
  raw_url: string | null;
  mime_type: string | null;
  file_size: number | null;
  captured_at: string;
  processed_at: string | null;
  status: SourceStatus;
  content_hash: string | null;
  importance: number;
  created_at: string;
}

export interface AtomicKnowledgeItem {
  id?: string;
  knowledge_id?: string;
  statement: string;
  concept_type: 'CONCEPT' | 'FACT' | 'CLAIM' | 'ACTION' | 'INSIGHT' | 'USER_THOUGHT' | 'AI_GENERATED_IDEA';
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
  insights: string;        // JSON string
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

export interface CitationSource {
  id: string;
  title: string;
  source_type: string;
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
}

export interface BrainStats {
  sourcesCount: number;
  knowledgeCount: number;
  atomicCount: number;
  memoriesCount: number;
  durableMemoriesCount: number;
  relationshipsCount: number;
}
