import { describe, it, expect } from 'vitest';
import { ALL_SYSTEM_LINKS, getEcosystemLinks } from '../../web/src/data/allLinks';

describe('All Links & Ecosystem Hub', () => {
  it('contains all 9 provided URLs in master list', () => {
    expect(ALL_SYSTEM_LINKS).toHaveLength(9);
    const urls = ALL_SYSTEM_LINKS.map((l) => l.url);

    expect(urls).toContain('https://project-manage-z6u.pages.dev/');
    expect(urls).toContain('https://reusable-dpy.pages.dev/');
    expect(urls).toContain('https://launchpilot.foundershivanand.workers.dev/');
    expect(urls).toContain('https://finder-d17.pages.dev/');
    expect(urls).toContain('https://skillforge-i9b.pages.dev/');
    expect(urls).toContain('https://content-os.foundershivanand.workers.dev/');
    expect(urls).toContain('https://second-brain-web-d8x.pages.dev/');
    expect(urls).toContain('https://setup-factory.pages.dev/');
    expect(urls).toContain('https://mentor-api.foundershivanand.workers.dev/');
  });

  it('strictly excludes the current project URL when displaying ecosystem links', () => {
    const displayLinks = getEcosystemLinks(true);

    expect(displayLinks).toHaveLength(8);

    const displayUrls = displayLinks.map((l) => l.url);
    // Must NOT contain the Second Brain URL of this project
    expect(displayUrls).not.toContain('https://second-brain-web-d8x.pages.dev/');
    expect(displayUrls.some((u) => u.includes('second-brain-web'))).toBe(false);

    // Must contain the other 8 URLs
    expect(displayUrls).toContain('https://project-manage-z6u.pages.dev/');
    expect(displayUrls).toContain('https://reusable-dpy.pages.dev/');
    expect(displayUrls).toContain('https://launchpilot.foundershivanand.workers.dev/');
    expect(displayUrls).toContain('https://finder-d17.pages.dev/');
    expect(displayUrls).toContain('https://skillforge-i9b.pages.dev/');
    expect(displayUrls).toContain('https://content-os.foundershivanand.workers.dev/');
    expect(displayUrls).toContain('https://setup-factory.pages.dev/');
    expect(displayUrls).toContain('https://mentor-api.foundershivanand.workers.dev/');
  });

  it('has valid metadata for each link', () => {
    for (const link of ALL_SYSTEM_LINKS) {
      expect(link.id).toBeTruthy();
      expect(link.name).toBeTruthy();
      expect(link.description).toBeTruthy();
      expect(link.category).toBeTruthy();
      expect(link.url.startsWith('https://')).toBe(true);
    }
  });
});
