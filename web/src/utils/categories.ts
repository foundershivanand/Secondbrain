/**
 * Second Brain Curated Category Taxonomy
 * Strictly bounded to <= 30 categories with intelligent keyword clustering
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
      'ai', 'llm', 'llms', 'gemini', 'gpt', 'claude', 'openai', 'prompt', 'prompting',
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
    id: 'productivity-pkm',
    name: 'Productivity & PKM Systems',
    icon: '⚡',
    color: 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10',
    keywords: [
      'second brain', 'obsidian', 'pkm', 'note-taking', 'knowledge management',
      'productivity', 'focus', 'screen time', 'doomscrolling', 'screenzen', 'opal',
      'brain rot', 'time blocking', 'workflow', 'habits', 'deep work', 'moc', 'zettelkasten'
    ],
  },
  {
    id: 'software-architecture',
    name: 'Software Architecture & Backend',
    icon: '🏗️',
    color: 'text-blue-400 border-blue-500/30 bg-blue-500/10',
    keywords: [
      'architecture', 'system design', 'backend', 'cloudflare', 'workers', 'serverless',
      'database', 'sqlite', 'd1', 'sql', 'microservices', 'api', 'distributed systems',
      'caching', 'rest', 'graphql', 'rust', 'golang', 'node.js', 'docker'
    ],
  },
  {
    id: 'web-mobile-engineering',
    name: 'Web & Mobile Engineering',
    icon: '💻',
    color: 'text-cyan-400 border-cyan-500/30 bg-cyan-500/10',
    keywords: [
      'react', 'typescript', 'javascript', 'frontend', 'pwa', 'web app', 'mobile app',
      'tailwind', 'css', 'html', 'next.js', 'vite', 'ui components', 'state management',
      'responsive design', 'browser extension', 'userscript'
    ],
  },
  {
    id: 'saas-product',
    name: 'SaaS & Product Strategy',
    icon: '🚀',
    color: 'text-amber-400 border-amber-500/30 bg-amber-500/10',
    keywords: [
      'saas', 'startup', 'product', 'mrr', 'arr', 'monetization', 'pricing', 'onboarding',
      'business model', 'product-market fit', 'growth', 'acquisition', 'retention',
      'churn', 'b2b', 'freemium', 'landing page', 'customer development'
    ],
  },
  {
    id: 'hardware-iot',
    name: 'Hardware & Embedded IoT',
    icon: '🔌',
    color: 'text-orange-400 border-orange-500/30 bg-orange-500/10',
    keywords: [
      'hardware', 'iot', 'smart mirror', 'thermal printer', 'raspberry pi', 'arduino',
      'esp32', 'ambient computing', 'sensors', 'embedded', 'microcontroller',
      'robotics', 'physical computing', 'maker', 'electronics'
    ],
  },
  {
    id: 'developer-tools',
    name: 'Developer Tools & Automation',
    icon: '🛠️',
    color: 'text-teal-400 border-teal-500/30 bg-teal-500/10',
    keywords: [
      'git', 'github', 'devops', 'cli', 'automation', 'bash', 'terminal', 'shell',
      'ci/cd', 'tooling', 'linters', 'prettier', 'wrangler', 'testing', 'scripts'
    ],
  },
  {
    id: 'cybersecurity-privacy',
    name: 'Cybersecurity & Privacy',
    icon: '🛡️',
    color: 'text-rose-400 border-rose-500/30 bg-rose-500/10',
    keywords: [
      'security', 'privacy', 'auth', 'oauth', 'jwt', 'encryption', 'token', 'cryptography',
      'vulnerability', 'untrusted', 'injection', 'defense', 'passwords', 'threat'
    ],
  },
  {
    id: 'data-analytics',
    name: 'Data Engineering & Analytics',
    icon: '📊',
    color: 'text-indigo-400 border-indigo-500/30 bg-indigo-500/10',
    keywords: [
      'data pipeline', 'etl', 'analytics', 'metrics', 'bi', 'visualization', 'warehouse',
      'bigquery', 'duckdb', 'data modeling', 'statistics'
    ],
  },
  {
    id: 'design-ux',
    name: 'Design & User Experience',
    icon: '🎨',
    color: 'text-pink-400 border-pink-500/30 bg-pink-500/10',
    keywords: [
      'design', 'ui/ux', 'user experience', 'visual hierarchy', 'typography',
      'design system', 'wireframe', 'figma', 'interaction design', 'accessibility'
    ],
  },
  {
    id: 'content-media',
    name: 'Content Creation & Media',
    icon: '✍️',
    color: 'text-yellow-400 border-yellow-500/30 bg-yellow-500/10',
    keywords: [
      'content', 'youtube', 'video production', 'writing', 'copywriting', 'podcasting',
      'creator', 'storytelling', 'audience', 'publishing', 'media', 'social media'
    ],
  },
  {
    id: 'finance-investing',
    name: 'Finance & Economics',
    icon: '💰',
    color: 'text-emerald-300 border-emerald-500/30 bg-emerald-500/10',
    keywords: [
      'finance', 'investing', 'economics', 'crypto', 'stocks', 'portfolio', 'wealth',
      'fintech', 'macroeconomics', 'money', 'revenue'
    ],
  },
  {
    id: 'mental-models-philosophy',
    name: 'Mental Models & Philosophy',
    icon: '🧭',
    color: 'text-violet-400 border-violet-500/30 bg-violet-500/10',
    keywords: [
      'mental model', 'first principles', 'systems thinking', 'philosophy', 'cognitive bias',
      'decision making', 'rationality', 'learning', 'psychology', 'stoicism'
    ],
  },
  {
    id: 'career-leadership',
    name: 'Career & Leadership',
    icon: '👥',
    color: 'text-sky-400 border-sky-500/30 bg-sky-500/10',
    keywords: [
      'career', 'hiring', 'leadership', 'management', 'teamwork', 'communication',
      'negotiation', 'interviewing', 'mentorship'
    ],
  },
  {
    id: 'general-knowledge',
    name: 'General Knowledge & Research',
    icon: '📚',
    color: 'text-slate-400 border-slate-700/50 bg-slate-800/40',
    keywords: [
      'research', 'science', 'math', 'physics', 'reference', 'article', 'general'
    ],
  },
];

export const MAX_TOTAL_CATEGORIES = 30;

/**
 * Intelligently resolve the canonical category for any knowledge note
 */
export function resolveNoteCategory(note: {
  title?: string;
  topics?: string[] | string;
  core_idea?: string;
  knowledge_type?: string;
}): CategoryDef {
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
        score += topicMatch ? 3 : (titleMatch ? 2 : 1);
      }
    }

    if (score > maxScore) {
      maxScore = score;
      bestCategory = cat;
    }
  }

  return bestCategory;
}

/**
 * Group an array of knowledge notes by their canonical Category
 */
export function groupNotesByCategory<T extends { title?: string; topics?: any; core_idea?: string; knowledge_type?: string }>(
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
