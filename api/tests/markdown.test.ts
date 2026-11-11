import { describe, it, expect } from 'vitest';
import { generateObsidianMarkdown, formatMOCMarkdown, formatBrainStateMarkdown } from '../src/pipeline/markdown';
import { ExtractionResult, SourceRecord, BrainState } from '../src/types';

describe('Markdown Note Generator', () => {
  it('generates valid Obsidian Markdown with YAML frontmatter, WikiLinks, and checkboxes', () => {
    const extraction: ExtractionResult = {
      title: 'Decoupling Storage from Reasoning',
      source_type: 'video',
      core_idea: 'Keep 100GB+ files in raw storage, store only compressed knowledge in database.',
      key_information: ['D1 free tier has 500MB', 'Raw files remain in TeraBox or Drive'],
      atomic_knowledge: [
        {
          statement: 'Decoupling storage from reasoning enables infinite scaling at zero cost.',
          type: 'CONCEPT',
          confidence: 0.95,
        },
      ],
      insights: ['Avoid digital hoarding by atomizing knowledge.'],
      actions: ['Configure Telegram bot webhook', 'Set up GitHub cloud sync'],
      topics: ['Architecture', 'Second Brain', 'Cloudflare D1'],
      entities: ['Cloudflare', 'Obsidian'],
      relationships: [{ target: 'Memory Systems', type: 'USES' }],
      candidate_memories: [{ content: 'User prefers zero cloud database costs.', importance: 9 }],
      why_saved: 'System design reference',
      what_changed: 'Clarified raw pointer approach',
    };

    const source: SourceRecord = {
      id: 'SRC-998811',
      raw_id: 'RAW-998811',
      source_type: 'video',
      title: 'Decoupling Storage from Reasoning',
      original_url: 'https://youtube.com/watch?v=abc123xyz',
      raw_storage: 'youtube',
      raw_file_id: null,
      raw_message_id: null,
      channel_id: null,
      raw_url: 'https://youtube.com/watch?v=abc123xyz',
      mime_type: 'video/mp4',
      file_size: 1048576,
      captured_at: '2026-11-12T00:00:00.000Z',
      processed_at: null,
      status: 'DONE',
      content_hash: 'abc123hash',
      importance: 9,
      priority: 'P0',
      created_at: '2026-11-12T00:00:00.000Z',
    };

    const md = generateObsidianMarkdown('KN-998811', extraction, source);

    expect(md.filename).toContain('KN-998811 - Decoupling Storage from Reasoning.md');
    expect(md.content).toContain('---');
    expect(md.content).toContain('id: KN-998811');
    expect(md.content).toContain('raw_id: RAW-998811');
    expect(md.content).toContain('topics:');
    expect(md.content).toContain('  - Architecture');
    expect(md.content).toContain('# Decoupling Storage from Reasoning');
    expect(md.content).toContain('## Core Idea');
    expect(md.content).toContain('## Atomic Knowledge');
    expect(md.content).toContain('**Type:** `CONCEPT` | **Confidence:** 95%');
    expect(md.content).toContain('- [ ] Configure Telegram bot webhook');
    expect(md.content).toContain('- [[Architecture]]');
    expect(md.content).toContain('- [[Second Brain]]');
  });

  it('includes transcript and visual text overlays when present', () => {
    const extraction: ExtractionResult = {
      title: 'Viral Instagram Reel on Productivity',
      source_type: 'reel',
      core_idea: 'Friction stops habits.',
      full_transcript: 'If you want to read more, put the book on your pillow.',
      visual_text_content: ['Step 1: Hide distracting apps', 'Step 2: Place widgets on lock screen'],
      audio_sound_profile: 'Trending upbeat electronic beat without voiceover',
      key_information: [],
      insights: [],
      actions: [],
      topics: ['Habits', 'Productivity'],
      candidate_memories: [],
    };

    const md = generateObsidianMarkdown('KN-443322', extraction);
    expect(md.content).toContain('> [!quote] 🎙️ Reel Transcript & Audio Profile');
    expect(md.content).toContain('Trending upbeat electronic beat');
    expect(md.content).toContain('> [!example] 📱 On-Screen Text & Visual Overlays');
    expect(md.content).toContain('> - Step 1: Hide distracting apps');
  });

  it('formats Map of Content (MOC) markdown correctly', () => {
    const mocMd = formatMOCMarkdown('AI Agents', 'MOC-1001', [
      { title: 'Agent Memory Deep Dive', core_idea: 'Hierarchical RAG retrieval.' },
      { title: 'Autonomous Multi-Agent Loops', core_idea: 'Supervisor pattern.' },
    ]);

    expect(mocMd).toContain('# 🗺️ Map of Content: AI Agents');
    expect(mocMd).toContain('- [[Agent Memory Deep Dive]] — Hierarchical RAG retrieval.');
    expect(mocMd).toContain('- [[Autonomous Multi-Agent Loops]] — Supervisor pattern.');
  });

  it('formats brain state markdown correctly', () => {
    const state: BrainState = {
      current_goals: ['Launch Second Brain v1.0', 'Zero cloud database hosting bill'],
      active_projects: ['Personal Second Brain PWA'],
      important_preferences: ['Local-first Markdown notes', 'Structured JSON over unstructured text'],
      recent_learning: ['Decoupled storage patterns'],
      current_interests: [{ topic: 'AI Agents', interest_score: 95, trend: 'rising' }],
      open_questions: ['How best to automate mobile keyframe extraction?'],
      recent_decisions: ['Use Cloudflare D1 and GitHub cloud sync'],
      knowledge_gaps: ['Optimizing video audio extraction in Worker'],
    };

    const md = formatBrainStateMarkdown(state);
    expect(md).toContain('# ⚡ Current Context (Brain State)');
    expect(md).toContain('- Launch Second Brain v1.0');
    expect(md).toContain('- Local-first Markdown notes');
    expect(md).toContain('**AI Agents**: Interest score 95 (Trend: rising)');
  });
});
