import { Database } from '../db';
import { jsonResponse, errorResponse } from '../utils/response';
import { MapOfContentRecord } from '../types';

export async function handleMOCs(request: Request, db: Database): Promise<Response> {
  if (request.method === 'GET') {
    const mocs = await db.listMOCs();
    return jsonResponse({ mocs });
  }

  if (request.method === 'POST') {
    try {
      const body: any = await request.json();
      const topic = body.topic?.trim();
      if (!topic) return errorResponse('Topic is required to generate MOC', 400);

      // Find all notes associated with this topic
      const notes = await db.listKnowledge(50, 0, topic);
      const linkedIds = notes.map((n) => n.id);

      const title = `Map of Content: ${topic}`;
      const summary = `Comprehensive Map of Content aggregating ${notes.length} knowledge notes, atomic breakthroughs, and lineage for [[${topic}]].`;
      const markdownPath = `02 Topics/MOC - ${topic.replace(/[\\/:*?"<>|]/g, '-')}.md`;

      const moc: MapOfContentRecord = {
        id: `MOC-${Math.floor(1000 + Math.random() * 9000)}`,
        topic,
        title,
        summary,
        linked_knowledge: JSON.stringify(linkedIds),
        markdown_path: markdownPath,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      await db.createOrUpdateMOC(moc);
      return jsonResponse({ success: true, moc, notesCount: notes.length });
    } catch (err: any) {
      return errorResponse(`Failed to generate MOC: ${err.message}`, 500);
    }
  }

  return errorResponse('Method not allowed', 405);
}
