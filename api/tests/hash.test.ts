import { describe, it, expect } from 'vitest';
import { sha256 } from '../src/utils/hash';

describe('sha256 Deduplication Hashing', () => {
  it('generates a 64-character hex hash', async () => {
    const hash = await sha256('test content');
    expect(hash).toHaveLength(64);
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
  });

  it('produces identical hashes regardless of surrounding whitespace and case', async () => {
    const hash1 = await sha256('https://youtube.com/watch?v=123');
    const hash2 = await sha256('  HTTPS://YOUTUBE.COM/WATCH?V=123  ');
    expect(hash1).toBe(hash2);
  });

  it('produces different hashes for different payloads', async () => {
    const hashA = await sha256('payload A');
    const hashB = await sha256('payload B');
    expect(hashA).not.toBe(hashB);
  });
});
