import { Env } from '../config';
import { Database } from '../db';
import { jsonResponse, errorResponse } from '../utils/response';
import { generateObsidianMarkdown, formatBrainStateMarkdown, formatDurableMemoriesMarkdown, formatMOCMarkdown } from '../pipeline/markdown';
import { syncBatchToGitHub } from '../services/github-sync';

export async function handleSync(
  request: Request,
  env: Env,
  db: Database,
  pathParts: string[]
): Promise<Response> {
  const subAction = pathParts[0]; // 'status' or 'all'

  // GET /api/sync/status
  if (request.method === 'GET' && (subAction === 'status' || !subAction)) {
    return jsonResponse({
      configured: Boolean(env.GITHUB_TOKEN && env.GITHUB_OWNER),
      owner: env.GITHUB_OWNER || null,
      repo: env.GITHUB_REPO || 'second-brain-vault',
      branch: env.GITHUB_BRANCH || 'main',
    });
  }

  // POST /api/sync/all - Trigger full cloud sync of all knowledge, memories, and MOCs
  if (request.method === 'POST' && subAction === 'all') {
    if (!env.GITHUB_TOKEN || !env.GITHUB_OWNER) {
      return errorResponse('GitHub credentials (GITHUB_TOKEN, GITHUB_OWNER) not configured in Cloudflare environment.', 400);
    }

    try {
      const files: { path: string; content: string }[] = [];

      // 1. All Knowledge Notes
      const notes = await db.listKnowledge(500, 0);
      for (const k of notes) {
        const src = k.source_id ? await db.getSourceById(k.source_id) : null;
        const md = generateObsidianMarkdown(
          k.id,
          {
            title: k.title,
            source_type: k.knowledge_type,
            core_idea: k.core_idea,
            key_information: JSON.parse(k.key_information || '[]'),
            atomic_knowledge: [],
            insights: JSON.parse(k.insights || '[]'),
            actions: JSON.parse(k.actionable_items || '[]'),
            topics: JSON.parse(k.topics || '[]'),
            entities: JSON.parse(k.entities || '[]'),
            relationships: [],
            candidate_memories: [],
            why_saved: k.why_saved,
            what_changed: k.what_changed,
          },
          src
        );

        files.push({
          path: `${md.folder}/${md.filename}`,
          content: md.content,
        });
      }

      // 2. Current Context (Brain State)
      const brainState = await db.getBrainState();
      if (brainState) {
        files.push({
          path: '06 Memories/Current Context.md',
          content: formatBrainStateMarkdown(brainState),
        });
      }

      // 3. Durable Memories
      const durableMemories = await db.getDurableMemories(100);
      if (durableMemories.length > 0) {
        files.push({
          path: '06 Memories/Durable Memories.md',
          content: formatDurableMemoriesMarkdown(durableMemories),
        });
      }

      // 4. MOCs
      const mocs = await db.listMOCs();
      for (const moc of mocs) {
        const mocNotes = await db.listKnowledge(50, 0, moc.topic);
        const mocMd = formatMOCMarkdown(
          moc.topic,
          moc.id,
          mocNotes.map((n) => ({ title: n.title, core_idea: n.core_idea }))
        );
        files.push({
          path: moc.markdown_path,
          content: mocMd,
        });
      }

      // Batch sync to GitHub in the cloud
      const syncResult = await syncBatchToGitHub(
        env,
        files,
        `vault: cloud sync all (${files.length} notes)`
      );

      return jsonResponse({
        success: true,
        total: syncResult.total,
        successful: syncResult.successful,
        message: `Synced ${syncResult.successful} of ${syncResult.total} files directly to GitHub repo ${env.GITHUB_OWNER}/${env.GITHUB_REPO || 'second-brain-vault'}.`,
      });
    } catch (err: any) {
      console.error('Full cloud sync error:', err);
      return errorResponse(`Failed to sync vault to GitHub: ${err.message}`, 500);
    }
  }

  return errorResponse('Method not allowed', 405);
}
