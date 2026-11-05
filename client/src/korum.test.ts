import { describe, expect, it } from 'vitest';
import legacy from '../legacy.html?raw';
import index from '../index.html?raw';
import manifestJson from '../public/manifest.webmanifest?raw';
import logo from '../public/assets/korum-mark.svg?raw';
import css from './korum.css?raw';
import source from './korum.ts?raw';

describe('Korum Command Center: entry point contracts', () => {
  it('preserves the pixel-art office as a standalone legacy page', () => {
    expect(legacy).toContain('id="world"');
    expect(legacy).toContain('/src/main.ts');
  });
  it('publishes Korum at the main entry point', () => {
    expect(index).toContain('/src/korum.ts');
    expect(index).toContain('Korum Agents');
    for (const id of ['connection-status','metric-agents','teams-grid','activity-stream','governance-checks']) {
      expect(index).toContain('id="' + id + '"');
    }
    expect(index).toContain('/legacy.html');
  });
  it('uses an independent, offline-capable brand asset', () => {
    const manifest = JSON.parse(manifestJson) as { name: string; start_url: string };
    expect(manifest.name).toBe('Korum Agents');
    expect(manifest.start_url).toBe('/');
    expect(logo).toContain('<svg');
    expect(css).not.toContain('fonts.googleapis');
  });
  it('reads observed server data rather than creating fake live agents', () => {
    expect(source).toContain("fetch('/api/snapshot'");
    expect(source).toContain("new EventSource('/api/stream')");
    expect(source).toContain('Nenhuma sessão observada');
  });
});
