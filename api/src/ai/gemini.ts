import { Env, DEFAULT_GEMINI_MODEL, FALLBACK_GEMINI_MODEL } from '../config';
import { ExtractionResult } from '../types';
import { EXTRACTION_SYSTEM_PROMPT } from './prompts';

export interface MultimodalPart {
  text?: string;
  inline_data?: {
    mime_type: string;
    data: string; // base64
  };
  file_data?: {
    mime_type: string;
    file_uri: string;
  };
}

export async function callGemini(
  env: Env,
  parts: MultimodalPart[],
  systemInstruction?: string,
  jsonMode: boolean = true,
  modelName: string = DEFAULT_GEMINI_MODEL
): Promise<string> {
  const apiKey = env.GEMINI_API_KEY;

  if (!apiKey) {
    // If API key is not configured, generate a high-quality simulated response for development/testing
    return simulateDevExtraction(parts);
  }

  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;

  const requestBody: any = {
    contents: [
      {
        role: 'user',
        parts: parts.map((p) => {
          if (p.inline_data) {
            return {
              inlineData: {
                mimeType: p.inline_data.mime_type,
                data: p.inline_data.data,
              },
            };
          }
          if (p.file_data) {
            return {
              fileData: {
                mimeType: p.file_data.mime_type,
                fileUri: p.file_data.file_uri,
              },
            };
          }
          return { text: p.text || '' };
        }),
      },
    ],
    generationConfig: {
      temperature: 0.2,
      topP: 0.8,
    },
  };

  if (systemInstruction) {
    requestBody.systemInstruction = {
      parts: [{ text: systemInstruction }],
    };
  }

  if (jsonMode) {
    requestBody.generationConfig.responseMimeType = 'application/json';
  }

  try {
    let response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody),
    });

    // Fallback model if primary model (e.g. gemini-2.0-flash) is overloaded or unavailable
    if (!response.ok && modelName !== FALLBACK_GEMINI_MODEL) {
      const fallbackEndpoint = `https://generativelanguage.googleapis.com/v1beta/models/${FALLBACK_GEMINI_MODEL}:generateContent?key=${apiKey}`;
      response = await fetch(fallbackEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });
    }

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Gemini API error [${response.status}]: ${errorText}`);
    }

    const data: any = await response.json();
    const candidate = data.candidates?.[0];
    const textPart = candidate?.content?.parts?.[0]?.text;

    if (!textPart) {
      throw new Error('Gemini returned an empty candidate or no text');
    }

    return textPart;
  } catch (err: any) {
    console.error('Gemini API call failed:', err);
    throw err;
  }
}

/**
 * Parses Gemini response, removing any accidental markdown code fences
 */
export function cleanAndParseJson<T>(raw: string): T {
  let cleaned = raw.trim();
  if (cleaned.startsWith('```json')) {
    cleaned = cleaned.replace(/^```json\s*/, '').replace(/\s*```$/, '');
  } else if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```\s*/, '').replace(/\s*```$/, '');
  }
  return JSON.parse(cleaned) as T;
}

/**
 * Universal extractor taking raw text, URL, base64 data, etc. and returning structured ExtractionResult
 */
export async function extractKnowledgeWithGemini(
  env: Env,
  content: {
    text?: string;
    url?: string;
    mimeType?: string;
    base64Data?: string;
    sourceType?: string;
    userNote?: string;
  }
): Promise<ExtractionResult> {
  const parts: MultimodalPart[] = [];

  let promptInstruction = `Source Type: ${content.sourceType || 'text'}\n`;
  if (content.url) promptInstruction += `Source URL: ${content.url}\n`;
  if (content.userNote) promptInstruction += `User Note / Context: ${content.userNote}\n`;
  promptInstruction += `\nAnalyze the following source material:\n`;

  if (content.base64Data && content.mimeType) {
    parts.push({
      inline_data: {
        mime_type: content.mimeType,
        data: content.base64Data,
      },
    });
  }

  if (content.text) {
    parts.push({
      text: `${promptInstruction}\n--- RAW CONTENT ---\n${content.text}`,
    });
  } else {
    parts.push({ text: promptInstruction });
  }

  const rawJson = await callGemini(env, parts, EXTRACTION_SYSTEM_PROMPT, true);
  return cleanAndParseJson<ExtractionResult>(rawJson);
}

/**
 * Fallback dev simulator when running without API key
 */
function simulateDevExtraction(parts: MultimodalPart[]): string {
  const inputStr = parts.map((p) => p.text || '').join(' ');
  const title = inputStr.slice(0, 50).trim() || 'Extracted Knowledge Note';

  const mock: ExtractionResult = {
    title: title.length > 5 ? title : 'Second Brain Knowledge Item',
    source_type: 'text',
    core_idea:
      'Information should be converted into durable, modular atomic units rather than stored as bulky unindexed documents.',
    key_information: [
      'Raw content is decoupled from compressed knowledge notes.',
      'D1 stores metadata, atomic ideas, and relationships.',
      'Markdown files are generated for Obsidian sync.',
    ],
    atomic_knowledge: [
      {
        statement:
          'Decoupling raw storage from knowledge indices enables massive scalability on free/low-cost tiers.',
        type: 'CONCEPT',
        confidence: 0.95,
      },
      {
        statement:
          'Atomic knowledge items can be retrieved independently without bloating LLM context windows.',
        type: 'FACT',
        confidence: 0.92,
      },
    ],
    insights: [
      'A second brain functions best as a reasoning engine, not a digital landfill.',
    ],
    actions: [
      'Implement hierarchical context retrieval before calling AI models.',
    ],
    topics: ['AI', 'Second Brain', 'Architecture', 'Knowledge Management'],
    entities: ['Cloudflare D1', 'Gemini', 'Obsidian'],
    relationships: [
      {
        target: 'Memory Systems',
        type: 'USES',
      },
      {
        target: 'Obsidian Vault',
        type: 'EXPORTS_TO',
      },
    ],
    candidate_memories: [
      {
        content:
          'User prioritizes zero-cost infrastructure and local Markdown ownership.',
        importance: 9,
      },
    ],
    timestamps: [],
    product_ideas: ['Autonomous personal knowledge curation bot for Telegram'],
    content_ideas: ['Why massive context windows do not replace a structured second brain'],
    why_saved: 'Relevant to personal AI knowledge infrastructure and autonomous productivity.',
    what_changed: 'Transitioned from hoarding raw files to atomic knowledge extraction with provenance pointers.',
  };

  return JSON.stringify(mock, null, 2);
}
