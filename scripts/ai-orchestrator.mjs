import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');
const VAULT_DIR = path.resolve(ROOT_DIR, 'vault');

// ─────────────────────────────────────────────────────────────────────────────
// SHARED MULTI-AI MEMORY MANAGER (Gemini • Grok • Claude • Copilot)
// ─────────────────────────────────────────────────────────────────────────────
export class SharedMemoryManager {
  constructor() {
    this.memoryPath = path.resolve(ROOT_DIR, 'terabox-shared-memory.json');
    this.vaultMemoryPath = path.resolve(VAULT_DIR, '06 Memories', 'Shared Memory.md');
    this.data = this.loadMemory();
  }

  loadMemory() {
    try {
      if (fs.existsSync(this.memoryPath)) {
        return JSON.parse(fs.readFileSync(this.memoryPath, 'utf8'));
      }
    } catch (e) {
      console.warn('⚠️ Could not parse terabox-shared-memory.json, reinitializing.');
    }
    return {
      counter: 0,
      recent_concepts: [],
      discovered_topics: [
        'AI Agents',
        'Autonomous Systems',
        'Mobile UI Design',
        'Digital Wellness',
        'Cinema & Storytelling',
        'Academics & Research',
        'Business & Startups'
      ],
      model_stats: {
        'gemini-3.8-flash': 0,
        'gemini-2.0-flash': 0,
        'inception-mercury': 0,
        'openrouter': 0,
        'claude-3-5-haiku': 0,
        'grok-beta': 0,
        'copilot-openai': 0,
        'semantic_engine': 0
      },
      last_updated: new Date().toISOString()
    };
  }

  saveMemory() {
    this.data.last_updated = new Date().toISOString();
    fs.writeFileSync(this.memoryPath, JSON.stringify(this.data, null, 2), 'utf8');

    // Sync markdown version in vault/06 Memories/Shared Memory.md
    try {
      const topTopics = this.data.discovered_topics.slice(-15).map(t => `- [[${t}]]`).join('\n');
      const recentBullets = this.data.recent_concepts.slice(-8).map(c => 
        `- **#${String(c.number).padStart(4, '0')} [[${c.title}]]** (${c.category}) — *${c.core_idea.slice(0, 100)}...* [Model: \`${c.model}\`]`
      ).join('\n');

      const statsBullets = Object.entries(this.data.model_stats)
        .map(([m, count]) => `- **${m}:** ${count} notes extracted`)
        .join('\n');

      const mdContent = `---
type: memory
category: multi_ai_shared_memory
last_updated: ${this.data.last_updated}
total_notes: ${this.data.counter}
---

# 🧠 Multi-AI Shared Brain Memory
*(Shared working memory between Gemini Flash, Grok, Claude, and Copilot)*

> [!abstract] Shared Blackboard Context
> All AI models read from and write to this collective blackboard. When extracting knowledge, each model receives this context to prevent duplication, maintain consistent topic taxonomy, and synthesize cross-note relationships.

## 📊 Model Extraction Contributions
${statsBullets}

## 🏷️ Active Knowledge Ontology (Shared Topics)
${topTopics}

## 🔄 Recent Multi-Model Extractions
${recentBullets || '- No extractions recorded yet.'}
`;
      fs.writeFileSync(this.vaultMemoryPath, mdContent, 'utf8');
    } catch (err) {
      // Ignore vault write error
    }
  }

  getSharedContext() {
    const activeTopics = (this.data.discovered_topics || []).slice(-10).join(', ');
    const recentExtractions = (this.data.recent_concepts || []).slice(-5).map(c => 
      `#${c.number}: "${c.title}" (${c.category})`
    ).join(' | ');

    return `SHARED SECOND BRAIN MEMORY:
- Known Topic Ontology: [${activeTopics}]
- Recent Extractions: [${recentExtractions || 'None yet'}]
Instruction: Relate extracted concepts to these known topics and create wikilinks [[Topic]] where applicable.`;
  }

  recordExtraction(modelName, extraction, noteNumber, category) {
    this.data.counter = Math.max(this.data.counter, noteNumber);
    if (!this.data.model_stats[modelName]) this.data.model_stats[modelName] = 0;
    this.data.model_stats[modelName]++;

    if (extraction.topics && Array.isArray(extraction.topics)) {
      for (const t of extraction.topics) {
        if (!this.data.discovered_topics.includes(t)) {
          this.data.discovered_topics.push(t);
        }
      }
    }

    this.data.recent_concepts.push({
      number: noteNumber,
      title: extraction.title || 'Untitled',
      category,
      core_idea: extraction.core_idea || '',
      model: modelName,
      time: new Date().toISOString()
    });

    if (this.data.recent_concepts.length > 25) {
      this.data.recent_concepts = this.data.recent_concepts.slice(-25);
    }

    this.saveMemory();
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// CATEGORY TAXONOMY & CLASSIFICATION (12 Curated Thematic Folders)
// ─────────────────────────────────────────────────────────────────────────────
export const FOLDER_TAXONOMY = [
  {
    folder: '01 - AI & Autonomous Systems',
    keywords: ['ai', 'agent', 'agents', 'autonomous', 'llm', 'llms', 'gemini', 'gpt', 'prompt', 'rag', 'embedding', 'transformer', 'neural', 'openai', 'claude', 'deep learning', 'machine learning', 'vision model', 'langchain', 'crewai']
  },
  {
    folder: '02 - Business, Startups & SaaS',
    keywords: ['startup', 'saas', 'business', 'monetization', 'revenue', 'pricing', 'client', 'agency', 'product', 'market', 'entrepreneur', 'sales', 'growth', 'b2b', 'freelance', 'business model', 'scale', 'service business']
  },
  {
    folder: '03 - Mobile Apps & UI-UX Design',
    keywords: ['ui', 'ux', 'design', 'play store', 'tablet asset', 'interface', 'app idea', 'workout planner', 'trip planner', 'wireframe', 'mobile app', 'dashboard ui', 'figma', 'mockup', 'widget', 'layout', 'icon', 'graphic']
  },
  {
    folder: '04 - Tech, Engineering & DevOps',
    keywords: ['code', 'coding', 'python', 'javascript', 'typescript', 'devops', 'docker', 'linux', 'git', 'database', 'sql', 'sqlite', 'api', 'backend', 'frontend', 'server', 'system architecture', 'microcontroller', 'raspberry pi', 'esp32', 'iot']
  },
  {
    folder: '05 - Digital Wellness & Habit Systems',
    keywords: ['screenzen', 'opal', 'touch grass', 'clearspace', 'focus flight', 'brain rot', 'cat on chair', 'screen time', 'doomscrolling', 'digital detox', 'decluttering', 'hide apps', 'widgets', 'lock screen', 'home screen', 'phone addiction', 'habit', 'friction']
  },
  {
    folder: '06 - Content, Reels & Creative Media',
    keywords: ['reel', 'reels', 'instagram', 'tiktok', 'youtube', 'content creator', 'video editing', 'capcut', 'premiere', 'thumbnail', 'hook', 'viral', 'storytelling', 'creator', 'audio', 'voice memo', 'podcast', 'social media']
  },
  {
    folder: '07 - Cinema, Storytelling & Arts',
    keywords: ['movie', 'film', 'cinema', 'director', '12 angry men', 'odyssey', 'literature', 'screenplay', 'fiction', 'acting', 'kannada', 'hollywood', 'classic film', 'theatre', 'drama', 'script']
  },
  {
    folder: '08 - Psychology, Mindset & Philosophy',
    keywords: ['psychology', 'mindset', 'philosophy', 'stoicism', 'mental model', 'cognitive', 'bias', 'thinking', 'focus', 'motivation', 'rest', 'productivity', 'habits', 'neuroscience', 'meditation']
  },
  {
    folder: '09 - Academics, Education & Research',
    keywords: ['semester', 'academic', 'exam', 'university', 'college', 'coursework', 'syllabus', 'marksheet', 'degree', 'ncert', 'class xii', 'textbook', 'research paper', 'education', 'lecture', 'student']
  },
  {
    folder: '10 - Governance, History & Legal',
    keywords: ['history', 'british rule', 'rss', 'muslim league', 'committees in india', 'constitution', 'political', 'governance', 'parliament', 'legal', 'affidavit', 'format template', 'appointment letter', 'agreement', 'contract']
  },
  {
    folder: '11 - Finance, Wealth & Operations',
    keywords: ['banking', 'bank', 'finance', 'invoice', 'tax', 'investment', 'crypto', 'trading', 'expense', 'money', 'payment', 'udyam', 'registration certificate', 'salary', 'wealth', 'accounting']
  },
  {
    folder: '12 - General Knowledge & Reference',
    keywords: ['general', 'reference', 'document', 'photo', 'scan', 'note', 'misc']
  }
];

export function classifyCategory(item, extraction = {}) {
  const textToScan = [
    item.filename || '',
    item.path || '',
    extraction.title || '',
    extraction.core_idea || '',
    (extraction.topics || []).join(' '),
    (extraction.key_information || []).join(' ')
  ].join(' ').toLowerCase();

  for (const cat of FOLDER_TAXONOMY) {
    if (cat.folder === '12 - General Knowledge & Reference') continue;
    for (const kw of cat.keywords) {
      const regex = new RegExp(`\\b${kw.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')}\\b`, 'i');
      if (regex.test(textToScan)) {
        return cat.folder;
      }
    }
  }

  // Fallback heuristics based on directory path
  const pathLower = (item.path || '').toLowerCase();
  if (pathLower.includes('dcim/movies') || pathLower.includes('from webpage')) return '07 - Cinema, Storytelling & Arts';
  if (pathLower.includes('ideas')) return '02 - Business, Startups & SaaS';
  if (pathLower.includes('screenshots')) return '03 - Mobile Apps & UI-UX Design';
  if (pathLower.includes('useful')) return '04 - Tech, Engineering & DevOps';
  if (pathLower.includes('banking')) return '11 - Finance, Wealth & Operations';

  return '12 - General Knowledge & Reference';
}

// ─────────────────────────────────────────────────────────────────────────────
// PROMPTS & EXTRACTION SCHEMA (Multimodal Vision & Audio Enhanced)
// ─────────────────────────────────────────────────────────────────────────────
export const EXTRACTION_SCHEMA_PROMPT = `You are the Lead Knowledge Architect for a personal Second Brain.
Your role: Transform raw media (screenshots, videos, audio, documents) and contextual metadata into an elegant, high-density structured knowledge note.

MULTIMODAL EXTRACTION PROTOCOL:
- When an image/screenshot is provided:
  * Exhaustive OCR reading: Transcribe and interpret all visible text, headers, statistics, formulas, and labels.
  * Visual & architectural decomposition: Analyze UI wireframes, design systems, diagrams, charts, infographics, code snippets, or tweet threads.
  * Extract the FUNDAMENTAL THESIS/CORE IDEA: Why did the human save this screenshot? What is the non-obvious insight, principle, or mechanism?
  * Do NOT give generic descriptions like "This is a screenshot of an app". Give the EXACT subject, mechanism, or strategy shown.

INSTAGRAM REELS, TIKTOK, SHORTS & SHORT-FORM VIDEO RULES (1-3 MINUTE CLIPS):
- When the source is a video, reel, short, or clip:
  * 100% WHOLE TRANSCRIPT: If spoken speech or voiceover exists, extract 100% of the verbatim spoken words into "full_transcript" word-for-word.
  * SOUND WITH ON-SCREEN TEXT (NO SPEECH): If the reel has NO speech (e.g. trending music, ambient sound, beat) and conveys ideas through visual text overlays, title cards, captions, quotes, bullet points, or code snippets:
    - Extract EVERY on-screen text overlay in sequential order into "visual_text_content".
    - Describe the audio atmosphere in "audio_sound_profile" (e.g. "Trending upbeat music / no speech; content delivered via on-screen text cards").
    - Synthesize the chronological on-screen text into "full_transcript" so the note retains a complete textual readout.
  * THE IDEA: Distill the definitive breakthrough, thesis, or value into "core_idea".
  * KEY INFORMATION: Break down all actionable steps, frameworks, or takeaways into "key_information".

NOISE REDUCTION RULE:
If the source is purely a casual personal family snapshot, selfie, or random personal photo that has NO conceptual knowledge, diagrams, UI wireframes, educational info, or text notes:
Set "is_personal_media": true, "should_skip_note": true, "title": "Personal Media - Ignored", "core_idea": "Personal photograph without knowledge content."

Otherwise, produce strictly valid JSON matching this schema:
{
  "title": "Clean, memorable conceptual title (no file extensions)",
  "source_type": "video | reel | screenshot | pdf | voice | text",
  "core_idea": "2-3 sentence fundamental essence of what this media/note teaches or represents",
  "full_transcript": "100% complete verbatim spoken transcript or chronological readout of on-screen text",
  "visual_text_content": ["Array of all on-screen text cards, overlays, and captions in order"],
  "audio_sound_profile": "Description of audio/sound (e.g. 'Spoken voiceover', 'Trending music with on-screen text cards')",
  "key_information": ["Concrete takeaway 1", "Concrete takeaway 2", "Concrete takeaway 3"],
  "atomic_knowledge": [
    {
      "statement": "Self-contained atomic statement, axiom, or principle",
      "type": "CONCEPT | FACT | CLAIM | ACTION | INSIGHT",
      "confidence": 0.95
    }
  ],
  "insights": ["Strategic implication or mental model shift"],
  "actions": ["Actionable step or practical implementation"],
  "topics": ["Topic1", "Topic2"],
  "entities": ["Tool1", "Framework2"],
  "is_personal_media": false,
  "should_skip_note": false
}`;

// ─────────────────────────────────────────────────────────────────────────────
// MULTI-AI CALL ADAPTERS (Gemini • Grok • Claude • Copilot • Semantic Engine)
// ─────────────────────────────────────────────────────────────────────────────
export class MultiAiOrchestrator {
  constructor(env, sharedMemory) {
    this.env = env;
    this.sharedMemory = sharedMemory;
    this.cooldowns = {};
  }

  isOnCooldown(provider) {
    const until = this.cooldowns[provider];
    return until && Date.now() < until;
  }

  setCooldown(provider, durationMs) {
    this.cooldowns[provider] = Date.now() + durationMs;
    console.warn(`⏳ [${provider}] set on cooldown for ${Math.round(durationMs / 1000)}s.`);
  }

  // 1. Gemini Flash Multimodal Call (Primary & High-Fidelity Vision Extractor)
  async callGemini(metaText, mediaData = null, model = 'gemini-flash-latest') {
    const apiKey = this.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error('GEMINI_API_KEY not configured');

    const sharedContext = this.sharedMemory.getSharedContext();
    const fullSystemInstruction = `${EXTRACTION_SCHEMA_PROMPT}\n\n${sharedContext}`;

    const parts = [];
    if (mediaData && mediaData.base64 && mediaData.mimeType) {
      parts.push({
        inlineData: {
          mimeType: mediaData.mimeType,
          data: mediaData.base64
        }
      });
    }
    parts.push({ text: metaText });

    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts }],
        systemInstruction: { parts: [{ text: fullSystemInstruction }] },
        generationConfig: {
          temperature: 0.2,
          topP: 0.8,
          responseMimeType: 'application/json'
        }
      })
    });

    if (res.status === 429) {
      this.setCooldown('gemini', 60000); // 60s cooldown on 429
      throw new Error(`Gemini 429 Quota Exceeded`);
    }

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Gemini API error [${res.status}]: ${err.slice(0, 150)}`);
    }

    const data = await res.json();
    const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!rawText) throw new Error('Empty response from Gemini');
    return JSON.parse(rawText);
  }

  // 2. xAI Grok Call
  async callGrok(metaText) {
    const apiKey = this.env.GROK_API_KEY || this.env.XAI_API_KEY;
    if (!apiKey) throw new Error('GROK_API_KEY not configured');

    const sharedContext = this.sharedMemory.getSharedContext();
    const res = await fetch('https://api.x.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'grok-beta',
        messages: [
          { role: 'system', content: `${EXTRACTION_SCHEMA_PROMPT}\n\n${sharedContext}\nOutput strictly valid JSON.` },
          { role: 'user', content: metaText }
        ],
        response_format: { type: 'json_object' },
        temperature: 0.2
      })
    });

    if (res.status === 429) {
      this.setCooldown('grok', 60000);
      throw new Error('Grok 429 Rate Limit');
    }

    if (!res.ok) throw new Error(`Grok error: ${res.status}`);
    const data = await res.json();
    const content = data.choices?.[0]?.message?.content;
    return JSON.parse(content);
  }

  // 3. Anthropic Claude Call (Multimodal Vision Supported)
  async callClaude(metaText, mediaData = null) {
    const apiKey = this.env.ANTHROPIC_API_KEY || this.env.CLAUDE_API_KEY;
    if (!apiKey) throw new Error('ANTHROPIC_API_KEY not configured');

    const sharedContext = this.sharedMemory.getSharedContext();
    const userContent = [];
    if (mediaData && mediaData.base64 && mediaData.mimeType) {
      userContent.push({
        type: 'image',
        source: {
          type: 'base64',
          media_type: mediaData.mimeType,
          data: mediaData.base64
        }
      });
    }
    userContent.push({ type: 'text', text: metaText });

    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-3-5-haiku-20241022',
        system: `${EXTRACTION_SCHEMA_PROMPT}\n\n${sharedContext}\nOutput valid JSON only.`,
        messages: [{ role: 'user', content: userContent }],
        max_tokens: 1024,
        temperature: 0.2
      })
    });

    if (res.status === 429) {
      this.setCooldown('claude', 60000);
      throw new Error('Claude 429 Rate Limit');
    }

    if (!res.ok) throw new Error(`Claude error: ${res.status}`);
    const data = await res.json();
    const content = data.content?.[0]?.text;
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    return JSON.parse(jsonMatch ? jsonMatch[0] : content);
  }

  // 4. Copilot / OpenAI / Groq Call (Multimodal Vision Supported)
  async callCopilotOrOpenAi(metaText, mediaData = null) {
    const apiKey = this.env.COPILOT_API_KEY || this.env.OPENAI_API_KEY || this.env.GROQ_API_KEY;
    if (!apiKey) throw new Error('No Copilot/OpenAI/Groq API key configured');

    let endpoint = 'https://api.openai.com/v1/chat/completions';
    let model = 'gpt-4o-mini';

    if (this.env.GROQ_API_KEY) {
      endpoint = 'https://api.groq.com/openai/v1/chat/completions';
      model = mediaData ? 'llama-3.2-11b-vision-preview' : 'llama-3.3-70b-versatile';
    }

    const sharedContext = this.sharedMemory.getSharedContext();
    const userContent = [];
    if (mediaData && mediaData.base64 && mediaData.mimeType) {
      userContent.push({
        type: 'image_url',
        image_url: {
          url: `data:${mediaData.mimeType};base64,${mediaData.base64}`
        }
      });
    }
    userContent.push({ type: 'text', text: metaText });

    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: `${EXTRACTION_SCHEMA_PROMPT}\n\n${sharedContext}\nRespond with JSON.` },
          { role: 'user', content: userContent }
        ],
        temperature: 0.2
      })
    });

    if (res.status === 429) {
      this.setCooldown('copilot', 60000);
      throw new Error('Copilot 429 Rate Limit');
    }

    if (!res.ok) throw new Error(`Copilot/OpenAI API error [${res.status}]`);
    const data = await res.json();
    const content = data.choices?.[0]?.message?.content;
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    return JSON.parse(jsonMatch ? jsonMatch[0] : content);
  }

  // 5. Inception Labs Mercury 2.5 (Diffusion LLM, ultra-fast generation)
  async callInception(metaText) {
    const apiKey = this.env.INCEPTION_API_KEY || this.env.INCEPTION_LABS_API_KEY;
    if (!apiKey) throw new Error('INCEPTION_API_KEY not configured');

    const sharedContext = this.sharedMemory.getSharedContext();
    const res = await fetch('https://api.inceptionlabs.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'mercury-2.5',
        messages: [
          { role: 'system', content: `${EXTRACTION_SCHEMA_PROMPT}\n\n${sharedContext}\nRespond strictly with valid JSON only.` },
          { role: 'user', content: metaText }
        ],
        temperature: 0.2
      })
    });

    if (res.status === 429) {
      this.setCooldown('inception', 60000);
      throw new Error('Inception Labs 429 Rate Limit');
    }

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Inception Labs error [${res.status}]: ${err.slice(0, 150)}`);
    }

    const data = await res.json();
    const content = data.choices?.[0]?.message?.content;
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    return JSON.parse(jsonMatch ? jsonMatch[0] : content);
  }

  // 6. OpenRouter Multi-Model Call
  async callOpenRouter(metaText, mediaData = null) {
    const apiKey = this.env.OPENROUTER_API_KEY;
    if (!apiKey) throw new Error('OPENROUTER_API_KEY not configured');

    const sharedContext = this.sharedMemory.getSharedContext();
    const userContent = [];
    if (mediaData && mediaData.base64 && mediaData.mimeType) {
      userContent.push({
        type: 'image_url',
        image_url: {
          url: `data:${mediaData.mimeType};base64,${mediaData.base64}`
        }
      });
    }
    userContent.push({ type: 'text', text: metaText });

    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'openrouter/auto',
        messages: [
          { role: 'system', content: `${EXTRACTION_SCHEMA_PROMPT}\n\n${sharedContext}\nRespond strictly with valid JSON only.` },
          { role: 'user', content: userContent }
        ],
        temperature: 0.2
      })
    });

    if (res.status === 429) {
      this.setCooldown('openrouter', 60000);
      throw new Error('OpenRouter 429 Rate Limit');
    }

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`OpenRouter error [${res.status}]: ${err.slice(0, 150)}`);
    }

    const data = await res.json();
    const content = data.choices?.[0]?.message?.content;
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    return JSON.parse(jsonMatch ? jsonMatch[0] : content);
  }

  // 7. Intelligent Semantic Fallback Engine (Offline resilient parser)
  generateSemanticKnowledge(item) {
    const filename = (item.filename || item.name || 'Untitled')
      .replace(/\.[^/.]+$/, '')
      .replace(/[-_.]+/g, ' ')
      .trim();

    const ext = ((item.filename || '').split('.').pop() || '').toLowerCase();
    let sourceType = 'screenshot';
    if (['mp4', 'mov', 'mkv', 'webm'].includes(ext)) sourceType = 'video';
    else if (['pdf'].includes(ext)) sourceType = 'pdf';
    else if (['mp3', 'm4a', 'wav'].includes(ext)) sourceType = 'voice';

    const pathParts = (item.path || '').split('/').filter(Boolean);
    const contextFolder = pathParts.length > 1 ? pathParts[pathParts.length - 2] : 'Media';

    return {
      title: filename.charAt(0).toUpperCase() + filename.slice(1),
      source_type: sourceType,
      core_idea: `Visual knowledge capture recorded in ${contextFolder}. Encapsulates structured information and reference assets.`,
      key_information: [
        `Direct media asset indexed from TeraBox path: ${item.path}`,
        `Original file size: ${((item.size || 0) / (1024 * 1024)).toFixed(2)} MB`,
        `Context category: ${contextFolder}`
      ],
      atomic_knowledge: [
        {
          statement: `Knowledge captured under ${contextFolder} represents key reference points for second brain retrieval.`,
          type: 'CONCEPT',
          confidence: 0.90
        }
      ],
      insights: [
        `Systematic preservation of ${sourceType} assets retains visual conceptual continuity without consuming local storage.`
      ],
      actions: [
        `Review source media pointer in TeraBox when executing related project work.`
      ],
      topics: [contextFolder, 'Second Brain Reference'],
      entities: ['TeraBox Cloud'],
      is_personal_media: false,
      should_skip_note: false
    };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // BEST MODEL ROUTER & MULTI-AI COLLABORATION (Multimodal Pipeline)
  // ─────────────────────────────────────────────────────────────────────────
  async extractKnowledge(item, metaText, mediaData = null) {
    // Priority 1: Gemini Flash Latest (Most reliable, hyper-accurate multimodal vision model)
    if (!this.isOnCooldown('gemini') && this.env.GEMINI_API_KEY) {
      try {
        const extraction = await this.callGemini(metaText, mediaData, 'gemini-flash-latest');
        return { extraction, modelUsed: 'gemini-flash-latest' };
      } catch (err) {
        console.warn(`   ⚠️ Gemini Flash Latest error (${err.message}). Trying Gemini Flash Lite fallback...`);
        try {
          const extraction = await this.callGemini(metaText, mediaData, 'gemini-flash-lite-latest');
          return { extraction, modelUsed: 'gemini-flash-lite-latest' };
        } catch (err2) {
          console.warn(`   ⚠️ Gemini Flash Lite error (${err2.message}). Checking multi-AI fallback chain...`);
        }
      }
    }

    // Priority 2: Inception Labs Mercury 2.5 (Diffusion LLM, ultra-fast generation for metadata & context)
    if (!this.isOnCooldown('inception') && (this.env.INCEPTION_API_KEY || this.env.INCEPTION_LABS_API_KEY)) {
      try {
        console.log(`   🔀 Multi-AI Routing: Handing off extraction to Inception Labs (Mercury 2.5)...`);
        const extraction = await this.callInception(metaText);
        return { extraction, modelUsed: 'inception-mercury' };
      } catch (err) {
        console.warn(`   ⚠️ Inception Labs failed: ${err.message}`);
      }
    }

    // Priority 3: OpenRouter Multi-Model Call
    if (!this.isOnCooldown('openrouter') && this.env.OPENROUTER_API_KEY) {
      try {
        console.log(`   🔀 Multi-AI Routing: Handing off extraction to OpenRouter...`);
        const extraction = await this.callOpenRouter(metaText, mediaData);
        return { extraction, modelUsed: 'openrouter' };
      } catch (err) {
        console.warn(`   ⚠️ OpenRouter failed: ${err.message}`);
      }
    }

    // Priority 4: Claude API (Multimodal Vision supported)
    if (!this.isOnCooldown('claude') && (this.env.ANTHROPIC_API_KEY || this.env.CLAUDE_API_KEY)) {
      try {
        console.log(`   🔀 Multi-AI Routing: Handing off extraction to Claude Haiku...`);
        const extraction = await this.callClaude(metaText, mediaData);
        return { extraction, modelUsed: 'claude-3-5-haiku' };
      } catch (err) {
        console.warn(`   ⚠️ Claude failed: ${err.message}`);
      }
    }

    // Priority 5: Copilot / OpenAI / Groq
    if (!this.isOnCooldown('copilot') && (this.env.COPILOT_API_KEY || this.env.OPENAI_API_KEY || this.env.GROQ_API_KEY)) {
      try {
        console.log(`   🔀 Multi-AI Routing: Handing off extraction to Copilot/OpenAI/Groq...`);
        const extraction = await this.callCopilotOrOpenAi(metaText, mediaData);
        return { extraction, modelUsed: 'copilot-openai' };
      } catch (err) {
        console.warn(`   ⚠️ Copilot/OpenAI failed: ${err.message}`);
      }
    }

    // Priority 6: Grok API (Text/meta reasoning)
    if (!this.isOnCooldown('grok') && (this.env.GROK_API_KEY || this.env.XAI_API_KEY)) {
      try {
        console.log(`   🔀 Multi-AI Routing: Handing off extraction to Grok API...`);
        const extraction = await this.callGrok(metaText);
        return { extraction, modelUsed: 'grok-beta' };
      } catch (err) {
        console.warn(`   ⚠️ Grok failed: ${err.message}`);
      }
    }

    // Priority 7: Semantic Rule Engine (Guarantees workflow never crashes)
    console.log(`   ⚙️ Using Semantic Engine fallback for deterministic knowledge note...`);
    const extraction = this.generateSemanticKnowledge(item);
    return { extraction, modelUsed: 'semantic_engine' };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// ELEGANT OBSIDIAN NOTE GENERATOR WITH CALLOUTS & PROVENANCE
// ─────────────────────────────────────────────────────────────────────────────
export function formatKnowledgeMarkdown(noteNumber, extraction, item, categoryFolder, modelName, duplicates = []) {
  const numStr = String(noteNumber).padStart(4, '0');
  const sanitizedTitle = (extraction.title || item.filename || 'Untitled')
    .replace(/[\\/:*?"<>|]/g, '-')
    .replace(/\s+/g, ' ')
    .trim();

  const filename = `${numStr} - ${sanitizedTitle}.md`;
  const sizeMB = ((item.size || 0) / (1024 * 1024)).toFixed(2);
  const now = new Date().toISOString().slice(0, 10);

  const yamlTopics = (extraction.topics || []).map(t => `  - "${t}"`).join('\n');
  const keyInfoBullets = (extraction.key_information || []).map(k => `- ${k}`).join('\n');

  const atomicBlocks = (extraction.atomic_knowledge || []).map((ak, idx) => {
    return `- **${ak.statement}** *(Type: \`${ak.type || 'CONCEPT'}\` | Confidence: ${Math.round((ak.confidence || 0.9) * 100)}%)*`;
  }).join('\n');

  const insightsBullets = (extraction.insights || []).map(i => `- ${i}`).join('\n');
  const actionsBullets = (extraction.actions || []).map(a => `- [ ] ${a}`).join('\n');
  const topicLinks = (extraction.topics || []).map(t => `- [[${t}]]`).join('\n');

  let duplicatesSection = '';
  if (duplicates.length > 0) {
    const dupeLines = duplicates.map(d => `- [${d.filename}](${d.url}) (\`${d.path}\`)`).join('\n');
    duplicatesSection = `\n- **Duplicate / Alternate Pointers:**\n${dupeLines}`;
  }

  let transcriptCallout = '';
  if (extraction.full_transcript || extraction.audio_sound_profile) {
    transcriptCallout = `\n> [!quote] 🎙️ Reel Transcript & Audio Profile\n> ${extraction.audio_sound_profile ? `**Audio Profile:** ${extraction.audio_sound_profile}\n> \n> ` : ''}${extraction.full_transcript || 'No spoken audio transcript.'}\n`;
  }

  let visualTextCallout = '';
  if (extraction.visual_text_content && extraction.visual_text_content.length > 0) {
    const visualBullets = extraction.visual_text_content.map((v) => `> - ${v}`).join('\n');
    visualTextCallout = `\n> [!example] 📱 On-Screen Text & Visual Overlays\n${visualBullets}\n`;
  }

  const content = `---
id: KN-${numStr}
number: ${noteNumber}
type: knowledge
category: "${categoryFolder}"
source_type: ${extraction.source_type || 'media_pointer'}
storage: terabox
raw_url: "${item.url}"
file_size_mb: ${sizeMB}
priority: ${item.priority || 'P1'}
extracted_by: "${modelName}"
shared_memory_connected: true
topics:
${yamlTopics || '  - "Knowledge Capture"'}
source_id: SRC-${item.fs_id || numStr}
created: ${now}
---

# ${numStr} • ${extraction.title || item.filename}

> [!abstract] Core Idea
> ${extraction.core_idea || 'Knowledge capture pointer from external media storage.'}
${transcriptCallout}${visualTextCallout}
> [!quote] Atomic Knowledge & Fundamental Principles
> ${atomicBlocks || '- Atomic conceptual takeaway recorded.'}

> [!tip] Strategic Insights & Key Takeaways
> ${insightsBullets || '- Direct knowledge extraction.'}

${actionsBullets ? `> [!todo] Actionable Application\n> ${actionsBullets}\n` : ''}
---

### 🌐 Connected Knowledge & Topics
- [[${categoryFolder}/_Index|📁 ${categoryFolder} Catalog]]
${topicLinks || '- [[Inbox]]'}

---

> [!info] Provenance & Cloud Pointer
> - **Storage:** TeraBox Cloud
> - **File Name:** \`${item.filename}\`
> - **Original Path:** \`${item.path}\`
> - **File Size:** ${sizeMB} MB
> - **Cloud Media Link:** [Open in TeraBox](${item.url})
> - **Extracted By:** \`${modelName}\` (Multi-AI Shared Brain)${duplicatesSection}
`;

  return { filename, content, numStr };
}

// ─────────────────────────────────────────────────────────────────────────────
// CATALOG INDEX APPRENDER (_Index.md per category folder)
// ─────────────────────────────────────────────────────────────────────────────
export function updateCategoryIndex(categoryFolderPath, numStr, title, sourceType, coreIdea, url) {
  const indexPath = path.join(categoryFolderPath, '_Index.md');
  const shortIdea = (coreIdea || '').replace(/[\r\n]+/g, ' ').slice(0, 120) + '...';
  const cleanTitle = (title || 'Untitled').replace(/\|/g, '-');
  const tableRow = `| ${numStr} | [[${numStr} - ${cleanTitle}\\|${cleanTitle}]] | \`${sourceType}\` | ${shortIdea} | [TeraBox](${url}) |\n`;

  try {
    if (fs.existsSync(indexPath)) {
      let content = fs.readFileSync(indexPath, 'utf8');
      if (!content.includes(numStr)) {
        content += tableRow;
        fs.writeFileSync(indexPath, content, 'utf8');
      }
    }
  } catch (e) {
    // Ignore index write error
  }
}
