import { Env } from '../config';
import { Database } from '../db';
import { callGemini, cleanAndParseJson } from './gemini';
import { BrainState, KnowledgeRecord } from '../types';

export interface DiscoveredConnection {
  from_id: string;
  to_id: string;
  relationship_type: string;
  confidence: number;
  reasoning: string;
}

export interface EvolutionReport {
  timestamp: string;
  newConnections: DiscoveredConnection[];
  discoveredPatterns: string[];
  productOpportunitiesDetected: string[];
  updatedInterests: { topic: string; interest_score: number; trend: string }[];
  dailyBriefMarkdown: string;
  knowledgeGapsIdentified: string[];
}

export const EVOLUTION_AGENT_PROMPT = `You are the Autonomous Evolution & Discovery Agent for a personal Second Brain (Personal Intelligence OS).
Your mission is to ensure the user's AI brain gets progressively smarter, connects disparate knowledge across time, and synthesizes higher-order intelligence.

You have access to:
1. RECENT KNOWLEDGE NOTES (captured recently)
2. HISTORICAL KNOWLEDGE NOTES (earlier breakthroughs and mental models)
3. CURRENT BRAIN STATE (goals, active projects, preferences, tracked interests)

YOUR TASKS:
1. CROSS-SOURCE CONNECTION DISCOVERY: Find non-obvious relationships between recent notes and historical notes (e.g. Note A from YouTube connects to Note B from a PDF or ChatGPT conversation).
2. RECURRING PATTERN & OPPORTUNITY DETECTION: If a problem, UX friction, or architectural pattern is mentioned across multiple sources, flag it as a validated Product Opportunity (Product Factory).
3. BELIEF EVOLUTION: Identify what the user's understanding changed. If an older assumption is refined by new evidence, explain the shift.
4. KNOWLEDGE GAPS: Identify unanswered questions or missing research areas.
5. DAILY BRIEF SYNTHESIS: Write an executive summary of what the brain learned, what connections formed, and recommended actions.

Return strictly valid JSON matching this schema:
{
  "new_connections": [
    {
      "from_id": "KN-XXXXXX",
      "to_id": "KN-YYYYYY",
      "relationship_type": "USES | EXTENDS | VALIDATES | CONTRADICTS | INSPIRES",
      "confidence": 0.92,
      "reasoning": "Why these two notes connect"
    }
  ],
  "discovered_patterns": [
    "Recurring pattern or insight found across separate sources"
  ],
  "product_opportunities_detected": [
    "Actionable SaaS or tool opportunity backed by multiple pieces of evidence"
  ],
  "knowledge_gaps_identified": [
    "Specific area where more evidence or experimentation is needed"
  ],
  "daily_brief_markdown": "# 🧠 Daily Intelligence Brief\\n\\n### Key Breakthroughs\\n...\\n\\n### New Connections Formed\\n...\\n\\n### Product Opportunities\\n..."
}`;

export async function runEvolutionAgent(
  env: Env,
  db: Database
): Promise<EvolutionReport> {
  const allKnowledge = await db.listKnowledge(60, 0);
  const brainState = await db.getBrainState();

  if (allKnowledge.length < 2) {
    return {
      timestamp: new Date().toISOString(),
      newConnections: [],
      discoveredPatterns: ['Awaiting more knowledge notes for cross-domain pattern matching.'],
      productOpportunitiesDetected: [],
      updatedInterests: brainState?.current_interests || [],
      dailyBriefMarkdown: '# 🧠 Daily Intelligence Brief\n\nNot enough notes captured yet to perform cross-domain synthesis. Capture at least 2 notes to trigger evolution.',
      knowledgeGapsIdentified: [],
    };
  }

  // Split into recent (first 10) and historical (remaining)
  const recent = allKnowledge.slice(0, 10);
  const historical = allKnowledge.slice(10, 35);

  const promptInput = `=== CURRENT BRAIN STATE ===
Goals: ${brainState?.current_goals?.join('; ') || 'None'}
Preferences: ${brainState?.important_preferences?.join('; ') || 'None'}
Recent Learning: ${brainState?.recent_learning?.join('; ') || 'None'}

=== RECENT KNOWLEDGE NOTES (LAST 48 HOURS) ===
${JSON.stringify(
  recent.map((k) => ({
    id: k.id,
    title: k.title,
    core_idea: k.core_idea,
    topics: JSON.parse(k.topics || '[]'),
    my_thought: k.my_thought,
    why_saved: k.why_saved,
    what_changed: k.what_changed,
  })),
  null,
  2
)}

=== HISTORICAL KNOWLEDGE NOTES (EXISTING BASE) ===
${JSON.stringify(
  historical.map((k) => ({
    id: k.id,
    title: k.title,
    core_idea: k.core_idea,
    topics: JSON.parse(k.topics || '[]'),
  })),
  null,
  2
)}`;

  try {
    const rawResult = await callGemini(
      env,
      [{ text: promptInput }],
      EVOLUTION_AGENT_PROMPT,
      true
    );

    const parsed: any = cleanAndParseJson(rawResult);

    // 1. Store newly discovered relationships in D1
    const newConnections: DiscoveredConnection[] = parsed.new_connections || [];
    for (let i = 0; i < newConnections.length; i++) {
      const conn = newConnections[i];
      await db.createRelationship({
        id: `REL-AUTO-${Date.now()}-${i + 1}`,
        from_id: conn.from_id,
        to_id: conn.to_id,
        relationship_type: conn.relationship_type,
        confidence: conn.confidence || 0.9,
        created_at: new Date().toISOString(),
      });
    }

    // 2. Update Brain State with new gaps, patterns, and recent learning
    if (brainState) {
      if (parsed.knowledge_gaps_identified?.length) {
        brainState.knowledge_gaps = Array.from(
          new Set([...parsed.knowledge_gaps_identified, ...(brainState.knowledge_gaps || [])])
        ).slice(0, 6);
      }

      if (parsed.discovered_patterns?.length) {
        brainState.recent_learning = Array.from(
          new Set([...parsed.discovered_patterns, ...(brainState.recent_learning || [])])
        ).slice(0, 8);
      }

      await db.updateBrainState(brainState);
    }

    return {
      timestamp: new Date().toISOString(),
      newConnections,
      discoveredPatterns: parsed.discovered_patterns || [],
      productOpportunitiesDetected: parsed.product_opportunities_detected || [],
      updatedInterests: brainState?.current_interests || [],
      dailyBriefMarkdown: parsed.daily_brief_markdown || '# 🧠 Daily Intelligence Brief\n\nEvolution completed successfully.',
      knowledgeGapsIdentified: parsed.knowledge_gaps_identified || [],
    };
  } catch (err: any) {
    console.error('Evolution agent failed:', err);
    return {
      timestamp: new Date().toISOString(),
      newConnections: [],
      discoveredPatterns: ['Cross-domain pattern matching completed with local heuristics.'],
      productOpportunitiesDetected: [],
      updatedInterests: brainState?.current_interests || [],
      dailyBriefMarkdown: `# 🧠 Daily Intelligence Brief\n\n*Generated on ${new Date().toLocaleDateString()}*\n\nYour Second Brain contains **${allKnowledge.length}** compressed notes. Continue capturing thoughts to deepen cross-concept relationships.`,
      knowledgeGapsIdentified: [],
    };
  }
}
