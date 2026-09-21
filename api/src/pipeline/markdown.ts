import { ExtractionResult, SourceRecord } from '../types';

export function generateObsidianMarkdown(
  knowledgeId: string,
  extraction: ExtractionResult,
  source?: SourceRecord | null
): { filename: string; content: string; folder: string } {
  const sanitizedTitle = (extraction.title || 'Untitled')
    .replace(/[\\/:*?"<>|]/g, '-')
    .trim();
  const filename = `${knowledgeId} - ${sanitizedTitle}.md`;

  const yamlTopics = (extraction.topics || [])
    .map((t) => `  - ${t}`)
    .join('\n');

  let rawSourceLink = source?.raw_url || source?.original_url || 'No external URL';
  if (rawSourceLink.startsWith('http')) {
    rawSourceLink = `[Open original source](${rawSourceLink})`;
  }

  const keyInfoBullets = (extraction.key_information || [])
    .map((item) => `- ${item}`)
    .join('\n');

  const atomicKnowledgeBlocks = (extraction.atomic_knowledge || [])
    .map((ak, idx) => {
      const heading = ak.statement.split('.')[0] || `Atomic Idea #${idx + 1}`;
      return `### ${heading}\n\n${ak.statement}\n\n**Type:** \`${ak.type}\` | **Confidence:** ${Math.round(
        (ak.confidence || 0.9) * 100
      )}%`;
    })
    .join('\n\n');

  const insightsBullets = (extraction.insights || [])
    .map((item) => `- ${item}`)
    .join('\n');

  const actionsBullets = (extraction.actions || [])
    .map((item) => `- [ ] ${item}`)
    .join('\n');

  const relatedTopicWikiLinks = (extraction.topics || [])
    .map((t) => `- [[${t}]]`)
    .join('\n');

  let timestampsSection = '';
  if (extraction.timestamps && extraction.timestamps.length > 0) {
    const tsLines = extraction.timestamps
      .map((t) => `- \`${t.timestamp}\` — ${t.description}`)
      .join('\n');
    timestampsSection = `\n## Important Timestamps\n\n${tsLines}\n`;
  }

  let productIdeasSection = '';
  if (extraction.product_ideas && extraction.product_ideas.length > 0) {
    const ideas = extraction.product_ideas.map((p) => `- 💡 ${p}`).join('\n');
    productIdeasSection = `\n## Product & SaaS Opportunities\n\n${ideas}\n`;
  }

  const markdown = `---
id: ${knowledgeId}
type: knowledge
source_type: ${extraction.source_type || 'text'}
importance: ${extraction.candidate_memories?.[0]?.importance || 8}
confidence: ${extraction.atomic_knowledge?.[0]?.confidence || 0.95}
topics:
${yamlTopics}
source_id: ${source?.id || 'SRC-MANUAL'}
created_at: ${new Date().toISOString()}
---

# ${extraction.title}

## Core Idea

${extraction.core_idea}

## Key Information

${keyInfoBullets || '- No specific bullet points recorded.'}

## Atomic Knowledge

${atomicKnowledgeBlocks || 'No atomic knowledge blocks extracted.'}

## Insights

${insightsBullets || '- Direct knowledge capture.'}

## Actions

${actionsBullets || '- No immediate action required.'}
${timestampsSection}${productIdeasSection}
## Related Topics

${relatedTopicWikiLinks || '- [[General]]'}

## Why I Saved This

${extraction.why_saved || 'Valuable insight for personal reference and knowledge graph.'}

## What Changed

${extraction.what_changed || 'Refined understanding of this domain.'}

## Original Source

${rawSourceLink}
`;

  return {
    filename,
    content: markdown,
    folder: '01 Knowledge',
  };
}
