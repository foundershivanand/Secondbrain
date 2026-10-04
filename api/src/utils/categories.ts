/**
 * Second Brain Curated Category Taxonomy for Backend API
 * Strictly bounded to <= 30 categories (19 canonical categories).
 */

export interface CategoryDef {
  id: string;
  name: string;
  icon: string;
  keywords: string[];
}

export const CANONICAL_CATEGORIES: CategoryDef[] = [
  {
    id: 'youtube',
    name: 'YouTube',
    icon: '▶️',
    keywords: [
      'youtube', 'youtu.be', 'liked video', 'liked videos', 'playlist', 'playlists',
      'channel', 'video watch', 'watch history', 'youtube video', 'video'
    ],
  },
  {
    id: 'ai-llms',
    name: 'Artificial Intelligence & LLMs',
    icon: '🤖',
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
    keywords: [
      'appointment letter', 'intouch', 'affidavit', 'format template', 'durgv.rai',
      'contract', 'agreement', 'legal', 'hr documents', 'employment', 'formal communication'
    ],
  },
  {
    id: 'media-arts',
    name: 'Cinema, Literature & Arts',
    icon: '🎬',
    keywords: [
      '12 angry men', 'the odyssey', 'cinema', 'film', 'movie', 'literature', 'homer',
      'epic', 'play', 'storytelling', 'script', 'arts', 'classic'
    ],
  },
  {
    id: 'data-analytics',
    name: 'Data Engineering & Analytics',
    icon: '📊',
    keywords: [
      'hr analytics', 'mock data analysis', 'data pipeline', 'etl', 'analytics', 'metrics',
      'bi', 'visualization', 'warehouse', 'bigquery', 'duckdb', 'data modeling', 'statistics'
    ],
  },
  {
    id: 'productivity-pkm',
    name: 'Productivity & PKM Systems',
    icon: '⚡',
    keywords: [
      'second brain', 'obsidian', 'pkm', 'note-taking', 'knowledge management',
      'productivity', 'time blocking', 'workflow', 'habits', 'deep work', 'moc', 'zettelkasten'
    ],
  },
  {
    id: 'software-architecture',
    name: 'Software Architecture & Backend',
    icon: '🏗️',
    keywords: [
      'architecture', 'system design', 'backend', 'cloudflare', 'workers', 'serverless',
      'database', 'sqlite', 'd1', 'sql', 'microservices', 'api', 'distributed systems'
    ],
  },
  {
    id: 'web-engineering',
    name: 'Web Engineering & PWA',
    icon: '💻',
    keywords: [
      'react', 'typescript', 'javascript', 'frontend', 'pwa', 'web app',
      'tailwind', 'css', 'html', 'vite', 'ui components', 'state management'
    ],
  },
  {
    id: 'saas-product',
    name: 'SaaS & Product Strategy',
    icon: '🚀',
    keywords: [
      'saas', 'startup', 'product', 'mrr', 'arr', 'monetization', 'pricing', 'onboarding',
      'business model', 'product-market fit', 'growth', 'acquisition'
    ],
  },
  {
    id: 'developer-tools',
    name: 'Developer Tools & DevOps',
    icon: '🛠️',
    keywords: [
      'git', 'github', 'devops', 'cli', 'automation', 'bash', 'terminal', 'shell',
      'ci/cd', 'wrangler', 'testing', 'scripts'
    ],
  },
  {
    id: 'cybersecurity-privacy',
    name: 'Cybersecurity & Privacy',
    icon: '🛡️',
    keywords: [
      'security', 'privacy', 'auth', 'oauth', 'jwt', 'encryption', 'token', 'cryptography'
    ],
  },
  {
    id: 'finance-economics',
    name: 'Finance & Economics',
    icon: '💰',
    keywords: [
      'finance', 'investing', 'economics', 'crypto', 'stocks', 'portfolio', 'wealth'
    ],
  },
  {
    id: 'mental-models-philosophy',
    name: 'Mental Models & Philosophy',
    icon: '🧭',
    keywords: [
      'mental model', 'first principles', 'systems thinking', 'philosophy', 'cognitive bias',
      'decision making', 'rationality', 'psychology', 'stoicism'
    ],
  },
  {
    id: 'general-knowledge',
    name: 'General Knowledge & Reference',
    icon: '📚',
    keywords: [
      'research', 'science', 'reference', 'article', 'general', 'moto g64', 'unknown'
    ],
  },
];

export function resolveCategoryName(item: {
  title?: string;
  topics?: string[] | string;
  core_idea?: string;
  knowledge_type?: string;
}): string {
  let topicList: string[] = [];
  if (Array.isArray(item.topics)) {
    topicList = item.topics;
  } else if (typeof item.topics === 'string') {
    try {
      const parsed = JSON.parse(item.topics);
      if (Array.isArray(parsed)) topicList = parsed;
      else if (parsed) topicList = [String(parsed)];
    } catch {
      topicList = item.topics ? [item.topics] : [];
    }
  }

  const searchCorpus = [
    item.title || '',
    item.core_idea || '',
    item.knowledge_type || '',
    ...topicList,
  ].join(' ').toLowerCase();

  // 0. Dedicated YouTube folder rule: all items from YouTube belong exclusively to 'YouTube'
  if (
    item.knowledge_type === 'youtube' ||
    (item.title && (item.title.toLowerCase().includes('youtube') || item.title.toLowerCase().includes('.youtube.'))) ||
    (item.core_idea && item.core_idea.toLowerCase().includes('youtube')) ||
    topicList.some((t) => t.toLowerCase().includes('youtube'))
  ) {
    return 'YouTube';
  }

  for (const cat of CANONICAL_CATEGORIES) {
    if (topicList.some((t) => t.toLowerCase() === cat.name.toLowerCase() || t.toLowerCase() === cat.id)) {
      return cat.name;
    }
  }

  let bestCat = CANONICAL_CATEGORIES[CANONICAL_CATEGORIES.length - 1]; // Default
  let maxScore = 0;

  for (const cat of CANONICAL_CATEGORIES) {
    let score = 0;
    for (const kw of cat.keywords) {
      if (searchCorpus.includes(kw)) {
        const topicMatch = topicList.some((t) => t.toLowerCase().includes(kw));
        const titleMatch = (item.title || '').toLowerCase().includes(kw);
        score += topicMatch ? 5 : (titleMatch ? 3 : 1);
      }
    }

    if (score > maxScore) {
      maxScore = score;
      bestCat = cat;
    }
  }

  return bestCat.name;
}
