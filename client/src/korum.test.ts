import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const read = (path: string) => readFileSync(fileURLToPath(new URL(path, import.meta.url)), 'utf8');

describe('Korum Command Center: entry point contracts', () => {
  it('preserves the pixel-art office as a standalone legacy page', () => {
    const legacy = read('../legacy.html');
    expect(legacy).toContain('id="world"');
    expect(legacy).toContain('/src/main.ts');
  });
  it('publishes Korum at the main entry point', () => {
    const index = read('../index.html');
    expect(index).toContain('/src/korum.ts');
    expect(index).toContain('Korum Agents');
    for (const id of ['connection-status','metric-agents','teams-grid','activity-stream','governance-checks']) {
      expect(index).toContain('id="' + id + '"');
    }
    expect(index).toContain('/legacy.html');
  });
  it('uses an independent, offline-capable brand asset', () => {
    const manifest = JSON.parse(read('../public/manifest.webmanifest')) as {name: string;start_url: string};
    expect(manifest.name).toBe('Korum Agents');
    expect(manifest.start_url).toBe('/');
    expect(read('../public/assets/korum-mark.svg')).toContain('<svg');
    expect(read('./korum.css')).not.toContain('fonts.googleapis');
  });
  it('reads observed server data rather than creating fake live agents', () => {
    const source = read('./korum.ts');
    expect(source).toContain("fetch('/api/snapshot'");
    expect(source).toContain("new EventSource('/api/stream')");
    expect(source).toContain('Nenhuma sessão observada');
  });
});
