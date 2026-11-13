export interface EcosystemLink {
  id: string;
  name: string;
  url: string;
  description: string;
  category: string;
  tag: string;
  iconName: 'FolderGit2' | 'Boxes' | 'Rocket' | 'Compass' | 'GraduationCap' | 'FileText' | 'Brain' | 'Zap' | 'Sparkles';
  accentColor: string;
  isCurrentProject?: boolean;
}

/**
 * All ecosystem URLs provided by the user.
 * Note: 'second-brain-web-d8x.pages.dev' is this current project (Second Brain)
 * and is excluded when displaying the popup to the user.
 */
export const ALL_SYSTEM_LINKS: EcosystemLink[] = [
  {
    id: 'product-hub',
    name: 'Product Hub',
    url: 'https://project-manage-z6u.pages.dev/',
    description: '96 Projects & Master Launch OS for project planning, tracking, and execution.',
    category: 'Management',
    tag: '96 Projects',
    iconName: 'FolderGit2',
    accentColor: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
  },
  {
    id: 'product-factory',
    name: 'Product Factory',
    url: 'https://reusable-dpy.pages.dev/',
    description: 'Unified Personal Product Factory with 263 Master Reusable Modules.',
    category: 'Architecture',
    tag: '263 Modules',
    iconName: 'Boxes',
    accentColor: 'text-purple-400 bg-purple-500/10 border-purple-500/20',
  },
  {
    id: 'launchpilot',
    name: 'LaunchPilot',
    url: 'https://launchpilot.foundershivanand.workers.dev/',
    description: 'AI Startup Distribution & Growth Engine for high-velocity go-to-market.',
    category: 'Growth',
    tag: 'Distribution',
    iconName: 'Rocket',
    accentColor: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
  },
  {
    id: 'finder',
    name: 'Finder',
    url: 'https://finder-d17.pages.dev/',
    description: 'Startup & app ideas discovery engine with market intelligence.',
    category: 'Ideas',
    tag: 'Discovery',
    iconName: 'Compass',
    accentColor: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20',
  },
  {
    id: 'skillforge',
    name: 'SkillForge',
    url: 'https://skillforge-i9b.pages.dev/',
    description: 'Skill training, real-time tests, and mastery evaluations.',
    category: 'Learning',
    tag: 'Train & Test',
    iconName: 'GraduationCap',
    accentColor: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
  },
  {
    id: 'content-os',
    name: 'Content OS',
    url: 'https://content-os.foundershivanand.workers.dev/',
    description: 'Multi-channel content production, scheduling, and distribution platform.',
    category: 'Content',
    tag: 'Production',
    iconName: 'FileText',
    accentColor: 'text-rose-400 bg-rose-500/10 border-rose-500/20',
  },
  {
    id: 'second-brain',
    name: 'Second Brain',
    url: 'https://second-brain-web-d8x.pages.dev/',
    description: 'Compressed knowledge, hierarchical retrieval, provenance & durable memory.',
    category: 'Knowledge',
    tag: 'Current Project',
    iconName: 'Brain',
    accentColor: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
    isCurrentProject: true, // This current project: must be excluded from popup!
  },
  {
    id: 'founder-os',
    name: 'Founder OS',
    url: 'https://setup-factory.pages.dev/',
    description: 'Ultimate vibe coding mission control & setup factory.',
    category: 'DevTools',
    tag: 'Mission Control',
    iconName: 'Zap',
    accentColor: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20',
  },
  {
    id: 'mentor-api',
    name: 'AI Mentor OS',
    url: 'https://mentor-api.foundershivanand.workers.dev/',
    description: 'Autonomous AI Mentor operating system and executive copilot.',
    category: 'AI Mentor',
    tag: 'Autonomous AI',
    iconName: 'Sparkles',
    accentColor: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20',
  },
];

/**
 * Filter out the link of this project (second-brain-web-d8x.pages.dev)
 */
export function getEcosystemLinks(excludeCurrentProject: boolean = true): EcosystemLink[] {
  if (!excludeCurrentProject) return ALL_SYSTEM_LINKS;

  return ALL_SYSTEM_LINKS.filter((link) => {
    // 1. Explicit flag
    if (link.isCurrentProject) return false;

    // 2. Exact match for this project's URL hostname
    const lowerUrl = link.url.toLowerCase();
    if (lowerUrl.includes('second-brain-web-d8x.pages.dev') || lowerUrl.includes('second-brain-web')) {
      return false;
    }

    // 3. Dynamic current window host guard
    if (typeof window !== 'undefined' && window.location && window.location.host) {
      const currentHost = window.location.host.toLowerCase();
      // If deployed on this domain, filter it out
      if (currentHost.includes('second-brain') && lowerUrl.includes(currentHost)) {
        return false;
      }
    }

    return true;
  });
}
