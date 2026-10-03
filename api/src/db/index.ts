import {
  SourceRecord,
  KnowledgeRecord,
  AtomicKnowledgeItem,
  KnowledgeRelationship,
  MemoryRecord,
  ProcessingJobRecord,
  BrainState,
  MapOfContentRecord,
} from '../types';

export class Database {
  constructor(private db: D1Database) {}

  // --- SOURCES ---
  async createSource(source: SourceRecord): Promise<void> {
    await this.db
      .prepare(
        `INSERT INTO sources (
          id, raw_id, source_type, title, original_url, raw_storage, raw_file_id, raw_message_id, channel_id, raw_url,
          mime_type, file_size, captured_at, processed_at, status, content_hash,
          importance, priority, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .bind(
        source.id,
        source.raw_id || null,
        source.source_type,
        source.title,
        source.original_url,
        source.raw_storage,
        source.raw_file_id,
        source.raw_message_id || null,
        source.channel_id || null,
        source.raw_url,
        source.mime_type,
        source.file_size,
        source.captured_at,
        source.processed_at,
        source.status,
        source.content_hash,
        source.importance,
        source.priority || 'P1',
        source.created_at
      )
      .run();
  }

  async updateSourceStatus(
    id: string,
    status: string,
    processedAt?: string | null,
    title?: string | null
  ): Promise<void> {
    if (title) {
      await this.db
        .prepare(
          `UPDATE sources SET status = ?, processed_at = COALESCE(?, processed_at), title = ? WHERE id = ?`
        )
        .bind(status, processedAt || null, title, id)
        .run();
    } else {
      await this.db
        .prepare(
          `UPDATE sources SET status = ?, processed_at = COALESCE(?, processed_at) WHERE id = ?`
        )
        .bind(status, processedAt || null, id)
        .run();
    }
  }

  async getSourceById(id: string): Promise<SourceRecord | null> {
    return await this.db
      .prepare(`SELECT * FROM sources WHERE id = ?`)
      .bind(id)
      .first<SourceRecord>();
  }

  async getSourceByHash(hash: string): Promise<SourceRecord | null> {
    return await this.db
      .prepare(`SELECT * FROM sources WHERE content_hash = ? LIMIT 1`)
      .bind(hash)
      .first<SourceRecord>();
  }

  async getSourceByUrl(url: string): Promise<SourceRecord | null> {
    return await this.db
      .prepare(`SELECT * FROM sources WHERE original_url = ? OR raw_url = ? LIMIT 1`)
      .bind(url, url)
      .first<SourceRecord>();
  }

  async listSources(limit: number = 50, offset: number = 0): Promise<SourceRecord[]> {
    const res = await this.db
      .prepare(`SELECT * FROM sources ORDER BY created_at DESC LIMIT ? OFFSET ?`)
      .bind(limit, offset)
      .all<SourceRecord>();
    return res.results || [];
  }

  async getRecentSourcesByType(sourceTypes: string[], limit: number = 5): Promise<SourceRecord[]> {
    if (sourceTypes.length === 0) return [];
    const placeholders = sourceTypes.map(() => '?').join(',');
    const res = await this.db
      .prepare(`SELECT * FROM sources WHERE source_type IN (${placeholders}) ORDER BY captured_at DESC LIMIT ?`)
      .bind(...sourceTypes, limit)
      .all<SourceRecord>();
    return res.results || [];
  }

  // --- KNOWLEDGE ---
  async createKnowledge(k: KnowledgeRecord): Promise<void> {
    await this.db
      .prepare(
        `INSERT INTO knowledge (
          id, source_id, title, knowledge_type, core_idea, key_information,
          insights, my_thought, actionable_items, topics, entities, tags, confidence,
          importance, why_saved, what_changed, markdown_path, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .bind(
        k.id,
        k.source_id,
        k.title,
        k.knowledge_type,
        k.core_idea,
        k.key_information,
        k.insights,
        k.my_thought || null,
        k.actionable_items,
        k.topics,
        k.entities,
        k.tags,
        k.confidence,
        k.importance,
        k.why_saved,
        k.what_changed,
        k.markdown_path,
        k.created_at,
        k.updated_at
      )
      .run();
  }

  async getKnowledgeById(id: string): Promise<KnowledgeRecord | null> {
    const record = await this.db
      .prepare(`SELECT * FROM knowledge WHERE id = ?`)
      .bind(id)
      .first<KnowledgeRecord>();

    if (!record) return null;

    const atomic = await this.db
      .prepare(`SELECT * FROM atomic_knowledge WHERE knowledge_id = ?`)
      .bind(id)
      .all<AtomicKnowledgeItem>();

    return {
      ...record,
      atomic_items: atomic.results || [],
    };
  }

  async getKnowledgeBySourceId(sourceId: string): Promise<KnowledgeRecord | null> {
    const record = await this.db
      .prepare(`SELECT * FROM knowledge WHERE source_id = ? LIMIT 1`)
      .bind(sourceId)
      .first<KnowledgeRecord>();
    if (!record) return null;

    const atomic = await this.db
      .prepare(`SELECT * FROM atomic_knowledge WHERE knowledge_id = ?`)
      .bind(record.id)
      .all<AtomicKnowledgeItem>();

    return {
      ...record,
      atomic_items: atomic.results || [],
    };
  }

  async getRecentKnowledge(limit: number = 5): Promise<KnowledgeRecord[]> {
    const res = await this.db
      .prepare(`SELECT * FROM knowledge ORDER BY created_at DESC LIMIT ?`)
      .bind(limit)
      .all<KnowledgeRecord>();
    return res.results || [];
  }

  async listKnowledge(limit: number = 50, offset: number = 0, topic?: string): Promise<KnowledgeRecord[]> {
    let query = `SELECT * FROM knowledge`;
    const params: any[] = [];

    if (topic) {
      query += ` WHERE topics LIKE ?`;
      params.push(`%${topic}%`);
    }

    query += ` ORDER BY created_at DESC LIMIT ? OFFSET ?`;
    params.push(limit, offset);

    const res = await this.db.prepare(query).bind(...params).all<KnowledgeRecord>();
    return res.results || [];
  }

  async searchKnowledge(searchTerm: string, limit: number = 20): Promise<KnowledgeRecord[]> {
    const pattern = `%${searchTerm}%`;
    const res = await this.db
      .prepare(
        `SELECT * FROM knowledge 
         WHERE title LIKE ? OR core_idea LIKE ? OR topics LIKE ? OR key_information LIKE ? OR my_thought LIKE ?
         ORDER BY importance DESC, created_at DESC LIMIT ?`
      )
      .bind(pattern, pattern, pattern, pattern, pattern, limit)
      .all<KnowledgeRecord>();
    return res.results || [];
  }

  async deleteKnowledge(id: string): Promise<void> {
    await this.db.prepare(`DELETE FROM atomic_knowledge WHERE knowledge_id = ?`).bind(id).run();
    await this.db.prepare(`DELETE FROM relationships WHERE from_id = ? OR to_id = ?`).bind(id, id).run();
    await this.db.prepare(`DELETE FROM knowledge WHERE id = ?`).bind(id).run();
  }

  // --- ATOMIC KNOWLEDGE ---
  async createAtomicKnowledge(item: AtomicKnowledgeItem): Promise<void> {
    await this.db
      .prepare(
        `INSERT INTO atomic_knowledge (id, knowledge_id, statement, concept_type, confidence, created_at)
         VALUES (?, ?, ?, ?, ?, ?)`
      )
      .bind(
        item.id,
        item.knowledge_id,
        item.statement,
        item.concept_type,
        item.confidence,
        item.created_at
      )
      .run();
  }

  async searchAtomicKnowledge(searchTerm: string, limit: number = 30): Promise<AtomicKnowledgeItem[]> {
    const pattern = `%${searchTerm}%`;
    const res = await this.db
      .prepare(
        `SELECT * FROM atomic_knowledge 
         WHERE statement LIKE ?
         ORDER BY confidence DESC, created_at DESC LIMIT ?`
      )
      .bind(pattern, limit)
      .all<AtomicKnowledgeItem>();
    return res.results || [];
  }

  // --- RELATIONSHIPS ---
  async createRelationship(rel: KnowledgeRelationship): Promise<void> {
    await this.db
      .prepare(
        `INSERT INTO relationships (id, from_id, to_id, relationship_type, confidence, created_at)
         VALUES (?, ?, ?, ?, ?, ?)`
      )
      .bind(
        rel.id,
        rel.from_id,
        rel.to_id,
        rel.relationship_type,
        rel.confidence || 0.9,
        rel.created_at
      )
      .run();
  }

  async listRelationships(): Promise<KnowledgeRelationship[]> {
    const res = await this.db
      .prepare(`SELECT * FROM relationships ORDER BY created_at DESC LIMIT 200`)
      .all<KnowledgeRelationship>();
    return res.results || [];
  }

  // --- MEMORIES ---
  async createMemory(m: MemoryRecord): Promise<void> {
    const repetition = m.repetition_count || 1;
    const score = m.importance * (m.confidence || 0.9) * repetition;

    await this.db
      .prepare(
        `INSERT INTO memories (id, memory_type, content, evidence, confidence, importance, repetition_count, memory_score, status, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .bind(
        m.id,
        m.memory_type,
        m.content,
        m.evidence,
        m.confidence,
        m.importance,
        repetition,
        score,
        m.status,
        m.created_at,
        m.updated_at
      )
      .run();
  }

  async listMemories(status?: string): Promise<MemoryRecord[]> {
    let query = `SELECT * FROM memories`;
    const params: any[] = [];
    if (status) {
      query += ` WHERE status = ?`;
      params.push(status);
    }
    query += ` ORDER BY memory_score DESC, importance DESC, created_at DESC`;
    const res = await this.db.prepare(query).bind(...params).all<MemoryRecord>();
    return res.results || [];
  }

  async updateMemoryStatus(
    id: string,
    status: 'CANDIDATE' | 'DURABLE' | 'REJECTED' | 'SUPERSEDED',
    updatedContent?: string
  ): Promise<void> {
    const now = new Date().toISOString();
    if (updatedContent) {
      await this.db
        .prepare(`UPDATE memories SET status = ?, content = ?, updated_at = ? WHERE id = ?`)
        .bind(status, updatedContent, now, id)
        .run();
    } else {
      await this.db
        .prepare(`UPDATE memories SET status = ?, updated_at = ? WHERE id = ?`)
        .bind(status, now, id)
        .run();
    }
  }

  async getDurableMemories(limit: number = 50): Promise<MemoryRecord[]> {
    const res = await this.db
      .prepare(`SELECT * FROM memories WHERE status = 'DURABLE' ORDER BY memory_score DESC, importance DESC LIMIT ?`)
      .bind(limit)
      .all<MemoryRecord>();
    return res.results || [];
  }

  // --- BRAIN STATE ---
  async getBrainState(): Promise<BrainState | null> {
    const record = await this.db
      .prepare(`SELECT data FROM brain_state WHERE key = 'current'`)
      .first<{ data: string }>();

    if (!record) return null;
    try {
      return JSON.parse(record.data) as BrainState;
    } catch {
      return null;
    }
  }

  async updateBrainState(state: BrainState): Promise<void> {
    const now = new Date().toISOString();
    await this.db
      .prepare(`INSERT OR REPLACE INTO brain_state (key, data, updated_at) VALUES ('current', ?, ?)`)
      .bind(JSON.stringify(state), now)
      .run();
  }

  async getKV(key: string): Promise<string | null> {
    const record = await this.db
      .prepare(`SELECT data FROM brain_state WHERE key = ?`)
      .bind(key)
      .first<{ data: string }>();
    return record?.data || null;
  }

  async setKV(key: string, data: string): Promise<void> {
    const now = new Date().toISOString();
    await this.db
      .prepare(`INSERT OR REPLACE INTO brain_state (key, data, updated_at) VALUES (?, ?, ?)`)
      .bind(key, data, now)
      .run();
  }

  // --- MAPS OF CONTENT (MOCs) ---
  async listMOCs(): Promise<MapOfContentRecord[]> {
    const res = await this.db.prepare(`SELECT * FROM mocs ORDER BY updated_at DESC`).all<MapOfContentRecord>();
    return res.results || [];
  }

  async createOrUpdateMOC(moc: MapOfContentRecord): Promise<void> {
    await this.db
      .prepare(
        `INSERT OR REPLACE INTO mocs (id, topic, title, summary, linked_knowledge, markdown_path, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .bind(
        moc.id,
        moc.topic,
        moc.title,
        moc.summary,
        moc.linked_knowledge,
        moc.markdown_path,
        moc.created_at,
        moc.updated_at
      )
      .run();
  }

  // --- PROCESSING JOBS ---
  async createJob(job: ProcessingJobRecord): Promise<void> {
    await this.db
      .prepare(
        `INSERT INTO processing_jobs (id, source_id, job_type, status, attempts, error, created_at, started_at, completed_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .bind(
        job.id,
        job.source_id,
        job.job_type,
        job.status,
        job.attempts,
        job.error,
        job.created_at,
        job.started_at,
        job.completed_at
      )
      .run();
  }

  async updateJobStatus(
    id: string,
    status: 'QUEUED' | 'PROCESSING' | 'COMPLETED' | 'FAILED',
    error?: string | null
  ): Promise<void> {
    const now = new Date().toISOString();
    await this.db
      .prepare(
        `UPDATE processing_jobs 
         SET status = ?, error = ?, 
             started_at = CASE WHEN started_at IS NULL THEN ? ELSE started_at END,
             completed_at = CASE WHEN ? IN ('COMPLETED', 'FAILED') THEN ? ELSE completed_at END
         WHERE id = ?`
      )
      .bind(status, error || null, now, status, now, id)
      .run();
  }

  async listJobs(limit: number = 30): Promise<ProcessingJobRecord[]> {
    const res = await this.db
      .prepare(`SELECT * FROM processing_jobs ORDER BY created_at DESC LIMIT ?`)
      .bind(limit)
      .all<ProcessingJobRecord>();
    return res.results || [];
  }

  // --- BRAIN STATS ---
  async getBrainStats(): Promise<{
    sourcesCount: number;
    knowledgeCount: number;
    atomicCount: number;
    memoriesCount: number;
    durableMemoriesCount: number;
    relationshipsCount: number;
    mocsCount: number;
  }> {
    const s = await this.db.prepare(`SELECT COUNT(*) as count FROM sources`).first<{ count: number }>();
    const k = await this.db.prepare(`SELECT COUNT(*) as count FROM knowledge`).first<{ count: number }>();
    const a = await this.db.prepare(`SELECT COUNT(*) as count FROM atomic_knowledge`).first<{ count: number }>();
    const m = await this.db.prepare(`SELECT COUNT(*) as count FROM memories`).first<{ count: number }>();
    const dm = await this.db.prepare(`SELECT COUNT(*) as count FROM memories WHERE status = 'DURABLE'`).first<{ count: number }>();
    const r = await this.db.prepare(`SELECT COUNT(*) as count FROM relationships`).first<{ count: number }>();
    const mocs = await this.db.prepare(`SELECT COUNT(*) as count FROM mocs`).first<{ count: number }>();

    return {
      sourcesCount: s?.count || 0,
      knowledgeCount: k?.count || 0,
      atomicCount: a?.count || 0,
      memoriesCount: m?.count || 0,
      durableMemoriesCount: dm?.count || 0,
      relationshipsCount: r?.count || 0,
      mocsCount: mocs?.count || 0,
    };
  }
}
