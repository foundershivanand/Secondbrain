import { Env } from '../config';
import { Database } from '../db';
import { callGemini, cleanAndParseJson } from './gemini';
import { MEMORY_CONSOLIDATION_PROMPT } from './prompts';
import { syncFileToGitHub } from '../services/github-sync';
import { formatBrainStateMarkdown, formatDurableMemoriesMarkdown } from '../pipeline/markdown';

export interface ConsolidationDecision {

  candidate_id: string;
  decision: 'PROMOTE' | 'REJECT' | 'UPDATE_EXISTING' | 'MERGE';
  updated_content?: string;
  target_memory_id?: string;
  reasoning: string;
  importance?: number;
  confidence?: number;
}

export interface ConsolidationReport {
  totalEvaluated: number;
  promotedCount: number;
  rejectedCount: number;
  mergedCount: number;
  decisions: ConsolidationDecision[];
  timestamp: string;
}

export async function runMemoryConsolidationAgent(
  env: Env,
  db: Database
): Promise<ConsolidationReport> {
  const candidates = await db.listMemories('CANDIDATE');

  if (candidates.length === 0) {
    return {
      totalEvaluated: 0,
      promotedCount: 0,
      rejectedCount: 0,
      mergedCount: 0,
      decisions: [],
      timestamp: new Date().toISOString(),
    };
  }

  const existingDurable = await db.getDurableMemories(50);

  const promptInput = `CANDIDATE MEMORIES TO EVALUATE:
${JSON.stringify(
  candidates.map((c) => ({
    id: c.id,
    content: c.content,
    evidence: c.evidence,
    importance: c.importance,
    confidence: c.confidence,
  })),
  null,
  2
)}

CURRENT ACTIVE DURABLE MEMORIES (FOR CONFLICT/DUPLICATE CHECKING):
${JSON.stringify(
  existingDurable.map((d) => ({
    id: d.id,
    content: d.content,
    importance: d.importance,
  })),
  null,
  2
)}`;

  try {
    const rawResult = await callGemini(
      env,
      [{ text: promptInput }],
      MEMORY_CONSOLIDATION_PROMPT,
      true
    );

    const decisions = cleanAndParseJson<ConsolidationDecision[]>(rawResult);

    let promotedCount = 0;
    let rejectedCount = 0;
    let mergedCount = 0;

    for (const d of decisions) {
      if (d.decision === 'PROMOTE') {
        await db.updateMemoryStatus(d.candidate_id, 'DURABLE', d.updated_content);
        promotedCount++;
      } else if (d.decision === 'REJECT') {
        await db.updateMemoryStatus(d.candidate_id, 'REJECTED');
        rejectedCount++;
      } else if (d.decision === 'MERGE' || d.decision === 'UPDATE_EXISTING') {
        if (d.target_memory_id && d.updated_content) {
          await db.updateMemoryStatus(d.target_memory_id, 'DURABLE', d.updated_content);
        }
        await db.updateMemoryStatus(d.candidate_id, 'SUPERSEDED');
        mergedCount++;
      }
    }

    // Refresh Brain State with newly consolidated insights (Section 56)
    try {
      const brainState = await db.getBrainState();
      if (brainState && promotedCount > 0) {
        const newlyPromoted = decisions
          .filter((d) => d.decision === 'PROMOTE')
          .map((d) => d.updated_content || d.reasoning);
        
        brainState.recent_learning = Array.from(
          new Set([...newlyPromoted.slice(0, 3), ...(brainState.recent_learning || [])])
        ).slice(0, 8);

        await db.updateBrainState(brainState);

        // Direct Cloud GitHub Sync (Zero-laptop dependency)
        const contextMd = formatBrainStateMarkdown(brainState);
        await syncFileToGitHub(
          env,
          '06 Memories/Current Context.md',
          contextMd,
          `vault: update current context (${promotedCount} memories consolidated)`
        );

        const durableMemories = await db.getDurableMemories(100);
        const durableMd = formatDurableMemoriesMarkdown(durableMemories);
        await syncFileToGitHub(
          env,
          '06 Memories/Durable Memories.md',
          durableMd,
          `vault: sync consolidated durable memories`
        );
      }
    } catch (e) {
      console.error('Failed to sync brain state after consolidation:', e);
    }

    return {
      totalEvaluated: candidates.length,
      promotedCount,
      rejectedCount,
      mergedCount,
      decisions,
      timestamp: new Date().toISOString(),
    };
  } catch (err) {
    console.error('Memory consolidation agent failed:', err);
    // Fallback heuristic if AI call fails: promote items with importance >= 8
    let fallbackPromoted = 0;
    for (const c of candidates) {
      if (c.importance >= 8) {
        await db.updateMemoryStatus(c.id, 'DURABLE');
        fallbackPromoted++;
      }
    }
    return {
      totalEvaluated: candidates.length,
      promotedCount: fallbackPromoted,
      rejectedCount: 0,
      mergedCount: 0,
      decisions: [],
      timestamp: new Date().toISOString(),
    };
  }
}
