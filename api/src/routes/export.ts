import { Database } from '../db';
import { generateObsidianMarkdown } from '../pipeline/markdown';
import { jsonResponse, errorResponse } from '../utils/response';

export async function handleExport(request: Request, db: Database, pathParts: string[]): Promise<Response> {
  const exportType = pathParts[0]; // 'vault' or 'markdown'
  const id = pathParts[1];

  // Raw Markdown note download
  if (exportType === 'markdown' && id) {
    const k = await db.getKnowledgeById(id);
    if (!k) return errorResponse('Knowledge note not found', 404);

    const src = k.source_id ? await db.getSourceById(k.source_id) : null;
    const md = generateObsidianMarkdown(
      k.id,
      {
        title: k.title,
        source_type: k.knowledge_type,
        core_idea: k.core_idea,
        key_information: JSON.parse(k.key_information || '[]'),
        atomic_knowledge: (k.atomic_items || []).map((a) => ({
          statement: a.statement,
          type: a.concept_type as any,
          confidence: a.confidence,
        })),
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

    return new Response(md.content, {
      status: 200,
      headers: {
        'Content-Type': 'text/markdown; charset=utf-8',
        'Content-Disposition': `attachment; filename="${encodeURIComponent(md.filename)}"`,
        'Access-Control-Allow-Origin': '*',
      },
    });
  }

  // Entire vault sync/export manifest
  if (exportType === 'vault' || !exportType) {
    const knowledgeNotes = await db.listKnowledge(500, 0);
    const files: { path: string; content: string; filename: string }[] = [];

    for (const k of knowledgeNotes) {
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
        filename: md.filename,
        content: md.content,
      });
    }

    return jsonResponse({
      vaultName: 'second-brain-vault',
      totalNotes: files.length,
      files,
    });
  }

  return errorResponse('Invalid export route', 404);
}
