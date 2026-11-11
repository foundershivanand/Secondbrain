import { describe, it, expect } from 'vitest';
import { resolveCategoryName, CANONICAL_CATEGORIES } from '../src/utils/categories';

describe('Category Taxonomy Resolver', () => {
  it('identifies all canonical categories', () => {
    expect(CANONICAL_CATEGORIES.length).toBeGreaterThanOrEqual(19);
  });

  it('routes YouTube videos to dedicated YouTube folder', () => {
    const category = resolveCategoryName({
      title: 'Building an AI Agent with Cloudflare Workers',
      source_type: 'youtube',
      topics: ['AI', 'Cloudflare'],
    });
    expect(category).toBe('YouTube');
  });

  it('routes Instagram Reels and viral short clips to Content, Reels & Creative Media', () => {
    const category = resolveCategoryName({
      title: 'Top 5 Premiere Pro hooks for viral reels',
      source_type: 'reel',
      topics: ['Video Editing', 'Reel', 'Viral'],
    });
    expect(category).toBe('Content, Reels & Creative Media');
  });

  it('routes Digital Wellness & Screen Time notes correctly', () => {
    const category = resolveCategoryName({
      title: 'How I reduced my screen time using ScreenZen and app friction',
      source_type: 'text',
      topics: ['Screen Time', 'Doomscrolling', 'Habit Friction'],
    });
    expect(category).toBe('Digital Wellness & Screen Time');
  });

  it('routes AI Agents & Autonomous Systems notes correctly', () => {
    const category = resolveCategoryName({
      title: 'CrewAI vs LangGraph: Multi-Agent supervisor patterns',
      source_type: 'text',
      topics: ['Agent', 'Autonomous', 'CrewAI'],
    });
    expect(category).toBe('AI Agents & Autonomous Systems');
  });

  it('falls back to General Knowledge & Reference for unspecified content', () => {
    const category = resolveCategoryName({
      title: 'Random miscellaneous scratchpad notes',
      source_type: 'text',
      topics: [],
    });
    expect(category).toBe('General Knowledge & Reference');
  });
});
