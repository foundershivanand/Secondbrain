import { Env } from '../config';
import { Database } from '../db';
import {
  SourceRecord,
  KnowledgeRecord,
  ExtractionResult,
  SourceType,
  IngestionPriority,
} from '../types';
import { extractKnowledgeWithGemini } from '../ai/gemini';
import { generateObsidianMarkdown } from './markdown';
import { sha256 } from '../utils/hash';
import { sanitizeUntrustedInput } from '../utils/security';

export interface IngestionInput {
  sourceType: SourceType;
  text?: string;
  url?: string;
  rawStorage?: string; // 'terabox', 'google_drive', 'telegram', 'discord', 'web', 'local'
  rawId?: string;      // RAW-XXXXXX pointer
  rawFileId?: string;
  rawMessageId?: string;
  channelId?: string;
  rawUrl?: string;
  mimeType?: string;
  fileSize?: number;
  base64Data?: string;
  title?: string;
  userNote?: string;   // Explicit user thought
  importance?: number;
  priority?: IngestionPriority; // 'P0', 'P1', 'P2', 'P3', 'P4'
}

export interface IngestionResult {
  source: SourceRecord;
  knowledge: KnowledgeRecord;
  extraction: ExtractionResult;
  markdown: { filename: string; content: string; folder: string };
  isDuplicate: boolean;
}

export async function processIngestion(
  env: Env,
  db: Database,
  input: IngestionInput,
  jobId?: string
): Promise<IngestionResult> {
  const now = new Date().toISOString();
  const rawIdNum = Math.floor(100000 + Math.random() * 900000);
  const sourceId = `SRC-${rawIdNum}`;
  const knowledgeId = `KN-${rawIdNum}`;
  const rawId = input.rawId || `RAW-${rawIdNum}`;

  // 1. Content Sanitization & Deduplication Hash
  const cleanText = input.text ? sanitizeUntrustedInput(input.text) : '';
  const hashPayload = `${input.sourceType}:${input.url || input.rawUrl || ''}:${cleanText.slice(0, 500)}`;
  const contentHash = await sha256(hashPayload);

  // Check for duplicate source
  const existingSource = await db.getSourceByHash(contentHash);
  if (existingSource && existingSource.status === 'DONE') {
    const existingKnowledge = await db.listKnowledge(50, 0);
    const matched = existingKnowledge.find((k) => k.source_id === existingSource.id);
    if (matched) {
      const markdown = generateObsidianMarkdown(
        matched.id,
        {
          title: matched.title,
          source_type: matched.knowledge_type,
          core_idea: matched.core_idea,
          key_information: JSON.parse(matched.key_information || '[]'),
          atomic_knowledge: (matched.atomic_items || []).map((a) => ({
            statement: a.statement,
            type: a.concept_type as any,
            confidence: a.confidence,
          })),
          insights: JSON.parse(matched.insights || '[]'),
          my_thought: matched.my_thought || undefined,
          actions: JSON.parse(matched.actionable_items || '[]'),
          topics: JSON.parse(matched.topics || '[]'),
          entities: JSON.parse(matched.entities || '[]'),
          relationships: [],
          candidate_memories: [],
          why_saved: matched.why_saved,
          what_changed: matched.what_changed,
        },
        existingSource
      );

      return {
        source: existingSource,
        knowledge: matched,
        extraction: {
          title: matched.title,
          source_type: matched.knowledge_type,
          core_idea: matched.core_idea,
          key_information: JSON.parse(matched.key_information || '[]'),
          atomic_knowledge: [],
          insights: JSON.parse(matched.insights || '[]'),
          my_thought: matched.my_thought || undefined,
          actions: JSON.parse(matched.actionable_items || '[]'),
          topics: JSON.parse(matched.topics || '[]'),
          entities: JSON.parse(matched.entities || '[]'),
          relationships: [],
          candidate_memories: [],
          why_saved: matched.why_saved,
          what_changed: matched.what_changed,
        },
        markdown,
        isDuplicate: true,
      };
    }
  }

  // 2. Register Source Pointer in D1 (STATUS: RECEIVED)
  const sourceRecord: SourceRecord = {
    id: sourceId,
    raw_id: rawId,
    source_type: input.sourceType,
    title: input.title || (input.url ? `Link: ${input.url}` : cleanText.slice(0, 40)) || 'Unprocessed Input',
    original_url: input.url || null,
    raw_storage: input.rawStorage || (input.url ? 'web' : 'local'),
    raw_file_id: input.rawFileId || null,
    raw_message_id: input.rawMessageId || null,
    channel_id: input.channelId || null,
    raw_url: input.rawUrl || input.url || null,
    mime_type: input.mimeType || 'text/plain',
    file_size: input.fileSize || (input.text ? input.text.length : 0),
    captured_at: now,
    processed_at: null,
    status: 'RECEIVED',
    content_hash: contentHash,
    importance: input.importance || 5,
    priority: input.priority || 'P1',
    created_at: now,
  };

  await db.createSource(sourceRecord);

  try {
    // 3. Update status -> EXTRACTING
    await db.updateSourceStatus(sourceId, 'EXTRACTING');
    if (jobId) await db.updateJobStatus(jobId, 'PROCESSING');

    // 4. Run Gemini Structured Extraction
    const extraction = await extractKnowledgeWithGemini(env, {
      text: cleanText,
      url: input.url || input.rawUrl,
      mimeType: input.mimeType,
      base64Data: input.base64Data,
      sourceType: input.sourceType,
      userNote: input.userNote,
    });

    // Ensure user's explicit thought is preserved
    if (input.userNote && !extraction.my_thought) {
      extraction.my_thought = input.userNote;
    }

    // 5. Update status -> ANALYZING
    await db.updateSourceStatus(sourceId, 'ANALYZING', null, extraction.title);

    // 6. Generate Obsidian Markdown Note (Matching Section 46)
    const markdown = generateObsidianMarkdown(knowledgeId, extraction, sourceRecord);
    const markdownPath = `${markdown.folder}/${markdown.filename}`;

    // 7. Store Knowledge Note in D1
    const knowledgeRecord: KnowledgeRecord = {
      id: knowledgeId,
      source_id: sourceId,
      title: extraction.title || 'Untitled Knowledge',
      knowledge_type: extraction.source_type || input.sourceType,
      core_idea: extraction.core_idea || '',
      key_information: JSON.stringify(extraction.key_information || []),
      insights: JSON.stringify(extraction.insights || []),
      my_thought: extraction.my_thought || input.userNote || null,
      actionable_items: JSON.stringify(extraction.actions || []),
      topics: JSON.stringify(extraction.topics || []),
      entities: JSON.stringify(extraction.entities || []),
      tags: JSON.stringify(extraction.topics || []),
      confidence: extraction.atomic_knowledge?.[0]?.confidence || 0.95,
      importance: input.importance || extraction.candidate_memories?.[0]?.importance || 7,
      why_saved: extraction.why_saved || input.userNote || 'Saved to personal knowledge vault',
      what_changed: extraction.what_changed || 'Enhanced understanding of this domain',
      markdown_path: markdownPath,
      created_at: now,
      updated_at: now,
    };

    await db.createKnowledge(knowledgeRecord);

    // 8. Store Atomic Knowledge (M2 layer)
    if (extraction.atomic_knowledge && extraction.atomic_knowledge.length > 0) {
      for (let i = 0; i < extraction.atomic_knowledge.length; i++) {
        const ak = extraction.atomic_knowledge[i];
        await db.createAtomicKnowledge({
          id: `AK-${rawIdNum}-${i + 1}`,
          knowledge_id: knowledgeId,
          statement: ak.statement,
          concept_type: ak.type || 'CONCEPT',
          confidence: ak.confidence || 0.9,
          created_at: now,
        });
      }
    }

    // 9. Store User Thought as a distinct atomic concept if provided
    if (extraction.my_thought) {
      await db.createAtomicKnowledge({
        id: `AK-${rawIdNum}-UT`,
        knowledge_id: knowledgeId,
        statement: extraction.my_thought,
        concept_type: 'USER_THOUGHT',
        confidence: 1.0,
        created_at: now,
      });
    }

    // 10. Store Relationships
    if (extraction.relationships && extraction.relationships.length > 0) {
      for (let i = 0; i < extraction.relationships.length; i++) {
        const rel = extraction.relationships[i];
        await db.createRelationship({
          id: `REL-${rawIdNum}-${i + 1}`,
          from_id: knowledgeId,
          to_id: rel.target,
          relationship_type: rel.type,
          confidence: 0.9,
          created_at: now,
        });
      }
    }

    // 11. Store Candidate Memories (M4 layer candidates)
    if (extraction.candidate_memories && extraction.candidate_memories.length > 0) {
      for (let i = 0; i < extraction.candidate_memories.length; i++) {
        const cm = extraction.candidate_memories[i];
        await db.createMemory({
          id: `MEM-${rawIdNum}-${i + 1}`,
          memory_type: 'CANDIDATE',
          content: cm.content,
          evidence: `${extraction.title} (${sourceId})`,
          confidence: 0.9,
          importance: cm.importance || 8,
          repetition_count: 1,
          memory_score: (cm.importance || 8) * 0.9,
          status: 'CANDIDATE',
          created_at: now,
          updated_at: now,
        });
      }
    }

    // 12. Complete Source (STATUS: DONE)
    const processedAt = new Date().toISOString();
    await db.updateSourceStatus(sourceId, 'DONE', processedAt, extraction.title);
    if (jobId) await db.updateJobStatus(jobId, 'COMPLETED');

    sourceRecord.status = 'DONE';
    sourceRecord.processed_at = processedAt;
    sourceRecord.title = extraction.title;

    return {
      source: sourceRecord,
      knowledge: knowledgeRecord,
      extraction,
      markdown,
      isDuplicate: false,
    };
  } catch (err: any) {
    console.error('Ingestion failed for source:', sourceId, err);
    await db.updateSourceStatus(sourceId, 'FAILED');
    if (jobId) await db.updateJobStatus(jobId, 'FAILED', err.message);
    throw err;
  }
}
