import { describe, it, expect } from 'vitest';
import { cleanAndParseJson } from '../src/ai/gemini';

describe('cleanAndParseJson', () => {
  it('parses valid raw JSON directly', () => {
    const raw = '{"title": "Note Title", "importance": 8}';
    const parsed = cleanAndParseJson<{ title: string; importance: number }>(raw);
    expect(parsed.title).toBe('Note Title');
    expect(parsed.importance).toBe(8);
  });

  it('strips ```json code fences cleanly', () => {
    const raw = '```json\n{"status": "success", "count": 42}\n```';
    const parsed = cleanAndParseJson<{ status: string; count: number }>(raw);
    expect(parsed.status).toBe('success');
    expect(parsed.count).toBe(42);
  });

  it('handles conversational preamble before markdown code fences', () => {
    const raw = `Here is the structured extraction for your second brain:
\`\`\`json
{
  "title": "Decoupled Storage Architecture",
  "source_type": "text",
  "tags": ["architecture", "storage"]
}
\`\`\`
Let me know if you need any adjustments!`;
    const parsed = cleanAndParseJson<{ title: string; source_type: string; tags: string[] }>(raw);
    expect(parsed.title).toBe('Decoupled Storage Architecture');
    expect(parsed.tags).toEqual(['architecture', 'storage']);
  });

  it('handles raw JSON arrays with conversational text', () => {
    const raw = `Sure! Here are the decisions:
[
  {"candidate_id": "MEM-123", "decision": "PROMOTE", "reasoning": "Recurring preference"},
  {"candidate_id": "MEM-124", "decision": "REJECT", "reasoning": "Casual comment"}
]`;
    const parsed = cleanAndParseJson<Array<{ candidate_id: string; decision: string }>>(raw);
    expect(parsed).toHaveLength(2);
    expect(parsed[0].decision).toBe('PROMOTE');
    expect(parsed[1].decision).toBe('REJECT');
  });

  it('handles JSON with no code fences but surrounding text', () => {
    const raw = 'The result is: {"key": "value"} - end of message';
    const parsed = cleanAndParseJson<{ key: string }>(raw);
    expect(parsed.key).toBe('value');
  });
});
