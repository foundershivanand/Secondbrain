/**
 * Second Brain Curated Category Taxonomy
 * Strictly bounded to <= 30 categories (19 canonical categories) with intelligent keyword clustering.
 */

export interface CategoryDef {
  id: string;
  name: string;
  icon: string; // Emoji for minimal visual identification
  color: string; // Tailwind color class
  keywords: string[];
}

export const CANONICAL_CATEGORIES: CategoryDef[] = [
  {
    id: 'ai-llms',
    name: 'Artificial Intelligence & LLMs',
    icon: '🤖',
    color: 'text-purple-400 border-purple-500/30 bg-purple-500/10',
    keywords: [
      'ai study case', 'ai', 'llm', 'llms', 'gemini api', 'gpt', 'claude', 'openai', 'prompt', 'prompting',
      'rag', 'embedding', 'embeddings', 'transformer', 'fine-tuning', 'tokens',
      'deep learning', 'machine learning', 'vision model', 'nlp', 'reasoning model'
    ],
  },
  {
    id: 'ai-agents',
    name: 'AI Agents & Autonomous Systems',
    icon: '🧠',
    color: 'text-fuchsia-400 border-fuchsia-500/30 bg-fuchsia-500/10',
    keywords: [
      'agent', 'agents', 'agentic', 'autonomous', 'crewai', 'autogpt', 'langchain',
      'langgraph', 'subagent', 'multi-agent', 'tool use', 'function calling',
      'memory consolidation', 'evolution agent', 'agent architecture'
    ],
  },
  {
    id: 'digital-wellness',
    name: 'Digital Wellness & Screen Time',
    icon: '📱',
    color: 'text-rose-400 border-rose-500/30 bg-rose-500/10',
    keywords: [
      'screenzen', 'opal', 'touch grass', 'clearspace', 'focus flight', 'brain rot', 'cat on chair',
      'screen time', 'doomscrolling', 'digital detox', 'decluttering', 'hiding apps', 'widgets',
      'lock screen', 'home screen', 'phone addiction', 'habit friction', 'frictionless'
    ],
  },
  {
    id: 'hardware-iot',
    name: 'Hardware & Embedded IoT',
    icon: '🔌',
    color: 'text-orange-400 border-orange-500/30 bg-orange-500/10',
    keywords: [
      'voice-to-print', 'smart mirror', 'thermal printer', 'raspberry pi', 'arduino',
      'esp32', 'ambient computing', 'sensors', 'embedded', 'microcontroller',
      'robotics', 'physical computing', 'maker', 'electronics', 'hardware'
    ],
  },
  {
    id: 'mobile-ui-apps',
    name: 'Mobile Apps & UI Design',
    icon: '📲',
    color: 'text-cyan-400 border-cyan-500/30 bg-cyan-500/10',
    keywords: [
      'play store', 'tablet asset', 'app interface', 'app idea', 'instagram', 'ui concept',
      'workout planner', 'trip planner', 'wireframe', 'mobile app', 'dashboard ui',
      'screenshot', 'ui design', 'concept', 'figma'
    ],
  },
  {
    id: 'academics-education',
    name: 'Academics & Education',
    icon: '🎓',
    color: 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10',
    keywords: [
      'semester', 'academic', 'first semester', '2nd semester', 'third semester',
      '5th semester', 'sixth semester', 'university', 'college', 'coursework',
      'syllabus', 'examination', 'degree', 'marksheet', 'education', 'learning'
    ],
  },
  {
    id: 'history-politics',
    name: 'History, Governance & Politics',
    icon: '🏛️',
    color: 'text-amber-400 border-amber-500/30 bg-amber-500/10',
    keywords: [
      'ncert', 'rss', 'muslim league', 'british rule', 'quit india', 'committees in india',
      'indian history', 'constitution', 'political', 'governance', 'parliament',
      'anti-colonial', 'civil services', 'history'
    ],
  },
  {
    id: 'legal-administration',
    name: 'Legal, Career & Administration',
    icon: '📜',
    color: 'text-blue-400 border-blue-500/30 bg-blue-500/10',
    keywords: [
      'appointment letter', 'intouch', 'affidavit', 'format template', 'durgv.rai',
      'contract', 'agreement', 'legal', 'hr documents', 'employment', 'formal communication'
    ],
  },
  {
    id: 'media-arts',
    name: 'Cinema, Literature & Arts',
    icon: '🎬',
    color: 'text-purple-300 border-purple-400/30 bg-purple-400/10',
    keywords: [
      '12 angry men', 'the odyssey', 'cinema', 'film', 'movie', 'literature', 'homer',
      'epic', 'play', 'storytelling', 'script', 'arts', 'classic'
    ],
  },
  {
    id: 'data-analytics',
    name: 'Data Engineering & Analytics',
    icon: '📊',
    color: 'text-indigo-400 border-indigo-500/30 bg-indigo-500/10',
    keywords: [
      'hr analytics', 'mock data analysis', 'data pipeline', 'etl', 'analytics', 'metrics',
      'bi', 'visualization', 'warehouse', 'bigquery', 'duckdb', 'data modeling', 'statistics'
    ],
  },
  {
    id: 'productivity-pkm',
    name: 'Productivity & PKM Systems',
    icon: '⚡',
    color: 'text-teal-400 border-teal-500/30 bg-teal-500/10',
    keywords: [
      'second brain', 'obsidian', 'pkm', 'note-taking', 'knowledge management',
      'productivity', 'time blocking', 'workflow', 'habits', 'deep work', 'moc', 'zettelkasten'
    ],
  },
  {
    id: 'software-architecture',
    name: 'Software Architecture & Backend',
    icon: '🏗️',
    color: 'text-sky-400 border-sky-500/30 bg-sky-500/10',
    keywords: [
      'architecture', 'system design', 'backend', 'cloudflare', 'workers', 'serverless',
      'database', 'sqlite', 'd1', 'sql', 'microservices', 'api', 'distributed systems'
    ],
  },
  {
    id: 'web-engineering',
    name: 'Web Engineering & PWA',
    icon: '💻',
    color: 'text-cyan-300 border-cyan-400/30 bg-cyan-400/10',
    keywords: [
      'react', 'typescript', 'javascript', 'frontend', 'pwa', 'web app',
      'tailwind', 'css', 'html', 'vite', 'ui components', 'state management'
    ],
  },
  {
    id: 'saas-product',
    name: 'SaaS & Product Strategy',
    icon: '🚀',
    color: 'text-amber-300 border-amber-400/30 bg-amber-400/10',
    keywords: [
      'saas', 'startup', 'product', 'mrr', 'arr', 'monetization', 'pricing', 'onboarding',
      'business model', 'product-market fit', 'growth', 'acquisition'
    ],
  },
  {
    id: 'developer-tools',
    name: 'Developer Tools & DevOps',
    icon: '🛠️',
    color: 'text-emerald-300 border-emerald-400/30 bg-emerald-400/10',
    keywords: [
      'git', 'github', 'devops', 'cli', 'automation', 'bash', 'terminal', 'shell',
      'ci/cd', 'wrangler', 'testing', 'scripts'
    ],
  },
  {
    id: 'cybersecurity-privacy',
    name: 'Cybersecurity & Privacy',
    icon: '🛡️',
    color: 'text-red-400 border-red-500/30 bg-red-500/10',
    keywords: [
      'security', 'privacy', 'auth', 'oauth', 'jwt', 'encryption', 'token', 'cryptography'
    ],
  },
  {
    id: 'finance-economics',
    name: 'Finance & Economics',
    icon: '💰',
    color: 'text-green-400 border-green-500/30 bg-green-500/10',
    keywords: [
      'finance', 'investing', 'economics', 'crypto', 'stocks', 'portfolio', 'wealth'
    ],
  },
  {
    id: 'mental-models-philosophy',
    name: 'Mental Models & Philosophy',
    icon: '🧭',
    color: 'text-violet-400 border-violet-500/30 bg-violet-500/10',
    keywords: [
      'mental model', 'first principles', 'systems thinking', 'philosophy', 'cognitive bias',
      'decision making', 'rationality', 'psychology', 'stoicism'
    ],
  },
  {
    id: 'general-knowledge',
    name: 'General Knowledge & Reference',
    icon: '📚',
    color: 'text-slate-400 border-slate-700/50 bg-slate-800/40',
    keywords: [
      'research', 'science', 'reference', 'article', 'general', 'moto g64', 'unknown'
    ],
  },
];

export const MAX_TOTAL_CATEGORIES = 30;

/**
 * Intelligently resolve the canonical category for any knowledge note
 */
export function resolveNoteCategory(note: {
  title?: string;
  topics?: string[] | string | null;
  core_idea?: string;
  knowledge_type?: string;
  markdown_path?: string | null;
}): CategoryDef {
  // 0. If markdown_path already contains a category folder, check match
  if (note.markdown_path) {
    for (const cat of CANONICAL_CATEGORIES) {
      if (note.markdown_path.includes(`/${cat.name}/`) || note.markdown_path.startsWith(`01 Knowledge/${cat.name}/`)) {
        return cat;
      }
    }
  }

  let topicList: string[] = [];
  if (Array.isArray(note.topics)) {
    topicList = note.topics;
  } else if (typeof note.topics === 'string') {
    try {
      const parsed = JSON.parse(note.topics);
      if (Array.isArray(parsed)) topicList = parsed;
      else if (parsed) topicList = [String(parsed)];
    } catch {
      topicList = note.topics ? [note.topics] : [];
    }
  }

  // Combined search corpus for this note
  const searchCorpus = [
    note.title || '',
    note.core_idea || '',
    note.knowledge_type || '',
    ...topicList,
  ].join(' ').toLowerCase();

  // 1. Direct match on existing category name in topics
  for (const cat of CANONICAL_CATEGORIES) {
    if (topicList.some((t) => t.toLowerCase() === cat.name.toLowerCase() || t.toLowerCase() === cat.id)) {
      return cat;
    }
  }

  // 2. Score each canonical category based on keyword density
  let bestCategory = CANONICAL_CATEGORIES[CANONICAL_CATEGORIES.length - 1]; // Default: General Knowledge
  let maxScore = 0;

  for (const cat of CANONICAL_CATEGORIES) {
    let score = 0;
    for (const kw of cat.keywords) {
      if (searchCorpus.includes(kw)) {
        // Higher weight if in title or topic
        const topicMatch = topicList.some((t) => t.toLowerCase().includes(kw));
        const titleMatch = (note.title || '').toLowerCase().includes(kw);
        score += topicMatch ? 5 : (titleMatch ? 3 : 1);
      }
    }

    if (score > maxScore) {
      maxScore = score;
      bestCategory = cat;
    }
  }

  return bestCategory;
}

export function groupNotesByCategory<T extends {
  id?: string;
  title?: string;
  topics?: any;
  core_idea?: string;
  knowledge_type?: string;
  markdown_path?: string | null;
  [key: string]: any;
}>(
  notes: T[]
): { category: CategoryDef; count: number; notes: T[] }[] {
  const map = new Map<string, { category: CategoryDef; notes: T[] }>();

  // Initialize with canonical categories
  for (const cat of CANONICAL_CATEGORIES) {
    map.set(cat.id, { category: cat, notes: [] });
  }

  // Group each note
  for (const note of notes) {
    const cat = resolveNoteCategory(note);
    const entry = map.get(cat.id);
    if (entry) {
      entry.notes.push(note);
    } else {
      map.set(cat.id, { category: cat, notes: [note] });
    }
  }

  // Filter only categories that have at least 1 note, and sort by count descending
  return Array.from(map.values())
    .filter((g) => g.notes.length > 0)
    .map((g) => ({
      category: g.category,
      count: g.notes.length,
      notes: g.notes,
    }))
    .sort((a, b) => b.count - a.count);
}
