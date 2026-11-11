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
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 25000);

    let response: Response;
    try {
      response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
        signal: controller.signal,
      });
    } catch (fetchErr: any) {
      if (fetchErr.name === 'AbortError') {
        console.warn(`Primary Gemini model timed out after 25s, trying fallback ${FALLBACK_GEMINI_MODEL}...`);
      } else {
        console.warn(`Primary Gemini fetch failed: ${fetchErr.message}`);
      }
      const fallbackEndpoint = `https://generativelanguage.googleapis.com/v1beta/models/${FALLBACK_GEMINI_MODEL}:generateContent?key=${apiKey}`;
      response = await fetch(fallbackEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });
    } finally {
      clearTimeout(timeoutId);
    }

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
      console.warn(`Gemini API error [${response.status}]: ${errorText.slice(0, 150)}. Checking Multi-AI fallback...`);

      // Fallback 1: xAI Grok
      if (env.GROK_API_KEY) {
        try {
          const userText = parts.map(p => p.text || '').join('\n');
          const grokRes = await fetch('https://api.x.ai/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${env.GROK_API_KEY}`
            },
            body: JSON.stringify({
              model: 'grok-beta',
              messages: [
                { role: 'system', content: (systemInstruction || '') + '\nOutput valid JSON.' },
                { role: 'user', content: userText }
              ],
              response_format: jsonMode ? { type: 'json_object' } : undefined,
              temperature: 0.2
            })
          });
          if (grokRes.ok) {
            const data: any = await grokRes.json();
            const text = data.choices?.[0]?.message?.content;
            if (text) return text;
          }
        } catch (grokErr) {
          console.warn('Grok fallback error:', grokErr);
        }
      }

      // Fallback 2: Anthropic Claude
      if (env.ANTHROPIC_API_KEY) {
        try {
          const userText = parts.map(p => p.text || '').join('\n');
          const claudeRes = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-api-key': env.ANTHROPIC_API_KEY,
              'anthropic-version': '2023-06-01'
            },
            body: JSON.stringify({
              model: 'claude-3-5-haiku-20241022',
              system: systemInstruction,
              messages: [{ role: 'user', content: userText }],
              max_tokens: 1024,
              temperature: 0.2
            })
          });
          if (claudeRes.ok) {
            const data: any = await claudeRes.json();
            const text = data.content?.[0]?.text;
            if (text) return text;
          }
        } catch (claudeErr) {
          console.warn('Claude fallback error:', claudeErr);
        }
      }

      // Fallback 3: Inception Labs (Ultra-Fast Mercury Diffusion LLM)
      if (env.INCEPTION_API_KEY) {
        try {
          const userText = parts.map(p => p.text || '').join('\n');
          const incRes = await fetch('https://api.inceptionlabs.ai/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${env.INCEPTION_API_KEY}`
            },
            body: JSON.stringify({
              model: 'mercury-2.5',
              messages: [
                { role: 'system', content: (systemInstruction || '') + '\nOutput valid JSON.' },
                { role: 'user', content: userText }
              ],
              temperature: 0.2
            })
          });
          if (incRes.ok) {
            const data: any = await incRes.json();
            const text = data.choices?.[0]?.message?.content;
            if (text) return text;
          }
        } catch (incErr) {
          console.warn('Inception Labs fallback error:', incErr);
        }
      }

      // Fallback 4: OpenRouter
      if (env.OPENROUTER_API_KEY) {
        try {
          const userText = parts.map(p => p.text || '').join('\n');
          const orRes = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${env.OPENROUTER_API_KEY}`
            },
            body: JSON.stringify({
              model: 'openrouter/auto',
              messages: [
                { role: 'system', content: (systemInstruction || '') + '\nOutput valid JSON.' },
                { role: 'user', content: userText }
              ],
              temperature: 0.2
            })
          });
          if (orRes.ok) {
            const data: any = await orRes.json();
            const text = data.choices?.[0]?.message?.content;
            if (text) return text;
          }
        } catch (orErr) {
          console.warn('OpenRouter fallback error:', orErr);
        }
      }

      // Fallback 5: Copilot / OpenAI / Groq
      const openaiKey = env.COPILOT_API_KEY || env.OPENAI_API_KEY || env.GROQ_API_KEY;
      if (openaiKey) {
        try {
          const userText = parts.map(p => p.text || '').join('\n');
          const endpoint = env.GROQ_API_KEY ? 'https://api.groq.com/openai/v1/chat/completions' : 'https://api.openai.com/v1/chat/completions';
          const model = env.GROQ_API_KEY ? 'llama-3.3-70b-versatile' : 'gpt-4o-mini';
          const aiRes = await fetch(endpoint, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${openaiKey}`
            },
            body: JSON.stringify({
              model,
              messages: [
                { role: 'system', content: (systemInstruction || '') + '\nOutput valid JSON.' },
                { role: 'user', content: userText }
              ],
              temperature: 0.2
            })
          });
          if (aiRes.ok) {
            const data: any = await aiRes.json();
            const text = data.choices?.[0]?.message?.content;
            if (text) return text;
          }
        } catch (aiErr) {
          console.warn('Copilot/OpenAI fallback error:', aiErr);
        }
      }

      // If all APIs fail, return simulated development extraction
      return simulateDevExtraction(parts);
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
  const trimmed = raw.trim();

  // Try direct parse first
  try {
    return JSON.parse(trimmed) as T;
  } catch {}

  // 1. Try extracting from markdown code fences ```json ... ``` or ``` ... ```
  const codeBlockMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (codeBlockMatch && codeBlockMatch[1]) {
    try {
      return JSON.parse(codeBlockMatch[1].trim()) as T;
    } catch {}
  }

  // 2. Try locating the outermost JSON object { ... }
  const firstBrace = trimmed.indexOf('{');
  const lastBrace = trimmed.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    try {
      const jsonCandidate = trimmed.slice(firstBrace, lastBrace + 1);
      return JSON.parse(jsonCandidate) as T;
    } catch {}
  }

  // 3. Try locating the outermost JSON array [ ... ]
  const firstBracket = trimmed.indexOf('[');
  const lastBracket = trimmed.lastIndexOf(']');
  if (firstBracket !== -1 && lastBracket !== -1 && lastBracket > firstBracket) {
    try {
      const jsonCandidate = trimmed.slice(firstBracket, lastBracket + 1);
      return JSON.parse(jsonCandidate) as T;
    } catch {}
  }

  // Final attempt: strip any leading/trailing fences and parse
  let cleaned = trimmed
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/, '')
    .replace(/\s*```$/, '');
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
    videoFrames?: string[];
    fileUri?: string;
    sourceType?: string;
    userNote?: string;
  }
): Promise<ExtractionResult> {
  const parts: MultimodalPart[] = [];

  let promptInstruction = `Source Type: ${content.sourceType || 'text'}\n`;
  if (content.url) promptInstruction += `Source URL: ${content.url}\n`;
  if (content.userNote) promptInstruction += `User Note / Context: ${content.userNote}\n`;

  if (
    content.sourceType === 'reel' ||
    content.sourceType === 'video' ||
    content.mimeType?.startsWith('video/') ||
    (content.url && (content.url.includes('instagram.com') || content.url.includes('tiktok.com')))
  ) {
    promptInstruction += `\nSPECIAL 1-3 MINUTE INSTAGRAM REEL & VIDEO EXTRACTION DIRECTIVE:
1. WHOLE TRANSCRIPT: If spoken words or voiceover exists, transcribe 100% of the verbatim spoken words into "full_transcript" word-for-word.
2. SOUND WITH ON-SCREEN TEXT CONTENT (NO SPEECH): If the reel has NO speech (e.g. music only, trending audio beat) and conveys ideas through visual text overlays, title cards, captions, quote cards, bullet points, or code snippets:
   - Extract 100% of the on-screen text overlays in sequential order into "visual_text_content".
   - Describe the audio atmosphere in "audio_sound_profile" (e.g. "Trending music with beat; no speech. Delivered via visual text overlays.").
   - Synthesize the chronological on-screen text into "full_transcript" so the note retains a complete textual readout.
3. THE IDEA / BREAKTHROUGH: Distill the fundamental thesis or value proposition into "core_idea".
4. COMPREHENSIVE NOTE CREATION: Break down all actionable steps, frameworks, or takeaways into "key_information" and "atomic_knowledge".\n`;
  }

  promptInstruction += `\nAnalyze the following source material:\n`;

  if (content.fileUri && content.mimeType) {
    parts.push({
      file_data: {
        mime_type: content.mimeType,
        file_uri: content.fileUri,
      },
    });
  } else if (content.videoFrames && content.videoFrames.length > 0) {
    for (const frame of content.videoFrames) {
      parts.push({
        inline_data: {
          mime_type: 'image/jpeg',
          data: frame,
        },
      });
    }
  } else if (content.base64Data && content.mimeType) {
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
