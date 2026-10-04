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
import { syncFileToGitHub } from '../services/github-sync';

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
  fileUri?: string;
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

  // 1. YouTube detection & oEmbed metadata enrichment
  const isYouTube =
    input.sourceType === 'youtube' ||
    Boolean(input.url && (input.url.includes('youtube.com') || input.url.includes('youtu.be'))) ||
    Boolean(input.userNote && /\[Category:\s*youtube\]/i.test(input.userNote)) ||
    Boolean(input.userNote && /\byoutube\b/i.test(input.userNote) && input.rawStorage !== 'terabox');

  const effectiveSourceType: SourceType = isYouTube ? 'youtube' : input.sourceType;

  let enrichedTitle = input.title;
  let videoChannel: string | undefined;
  if ((isYouTube || input.url?.includes('youtube.com') || input.url?.includes('youtu.be')) && input.url) {
    try {
      const oembedRes = await fetch(`https://www.youtube.com/oembed?url=${encodeURIComponent(input.url)}&format=json`);
      if (oembedRes.ok) {
        const oembedData: any = await oembedRes.json();
        if (oembedData.title) enrichedTitle = oembedData.title;
        if (oembedData.author_name) videoChannel = oembedData.author_name;
      }
    } catch {}
  }

  // Content Sanitization & Deduplication Hash
  const cleanText = input.text ? sanitizeUntrustedInput(input.text) : '';
  const hashPayload = `${effectiveSourceType}:${input.url || input.rawUrl || ''}:${cleanText.slice(0, 500)}`;
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
    source_type: effectiveSourceType,
    title: enrichedTitle || input.title || (input.url ? `Link: ${input.url}` : cleanText.slice(0, 40)) || 'Unprocessed Input',
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
    const extractionText = cleanText 
      ? (videoChannel ? `${cleanText}\nTitle: ${enrichedTitle}\nChannel: ${videoChannel}` : cleanText)
      : (videoChannel ? `Video Title: ${enrichedTitle}\nChannel / Creator: ${videoChannel}` : (enrichedTitle ? `Video Title: ${enrichedTitle}` : undefined));

    const extraction = await extractKnowledgeWithGemini(env, {
      text: extractionText,
      url: input.url || input.rawUrl,
      mimeType: input.mimeType,
      base64Data: input.base64Data,
      fileUri: input.fileUri,
      sourceType: effectiveSourceType,
      userNote: input.userNote,
    });

    // Ensure user's explicit thought is preserved
    if (input.userNote && !extraction.my_thought) {
      extraction.my_thought = input.userNote;
    }

    // Skip personal photos / casual media to prevent Obsidian vault clutter
    if (extraction.should_skip_note || extraction.is_personal_media) {
      const skippedAt = new Date().toISOString();
      await db.updateSourceStatus(sourceId, 'IGNORED_PERSONAL_MEDIA', skippedAt, extraction.title || 'Personal Media (Skipped)');
      if (jobId) await db.updateJobStatus(jobId, 'COMPLETED');
      sourceRecord.status = 'IGNORED_PERSONAL_MEDIA';
      sourceRecord.title = extraction.title || 'Personal Media (Skipped)';
      return {
        source: sourceRecord,
        knowledge: {
          id: knowledgeId,
          source_id: sourceId,
          title: extraction.title || 'Personal Media (Skipped)',
          knowledge_type: 'personal_media_skipped',
          core_idea: extraction.core_idea || 'Personal media - skipped from knowledge vault',
          key_information: '[]',
          insights: '[]',
          my_thought: null,
          actionable_items: '[]',
          topics: '[]',
          entities: '[]',
          tags: '[]',
          confidence: 1.0,
          importance: 1,
          why_saved: 'Casual personal media',
          what_changed: 'Skipped to keep vault clean',
          markdown_path: '',
          created_at: now,
          updated_at: now,
        },
        extraction,
        markdown: { filename: '', content: '', folder: '' },
        isDuplicate: false,
      };
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
      knowledge_type: isYouTube ? 'youtube' : (extraction.source_type || effectiveSourceType),
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

    // 13. Cloud-Native Obsidian Vault Sync (Committed directly from Worker to GitHub 24/7)
    try {
      await syncFileToGitHub(
        env,
        `${markdown.folder}/${markdown.filename}`,
        markdown.content,
        `vault: add ${extraction.title} (${knowledgeId})`
      );
    } catch (gitErr) {
      console.error('Cloud GitHub sync warning (non-blocking):', gitErr);
    }

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
