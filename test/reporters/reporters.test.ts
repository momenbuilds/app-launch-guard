import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { renderJsonReport } from '../../src/reporters/jsonReporter.js';
import { renderMarkdownReport } from '../../src/reporters/markdownReporter.js';
import { scanProject } from '../../src/scanner/scanProject.js';

describe('reporters', () => {
  it('renders valid JSON only', async () => {
    const report = await scanProject(path.resolve('test/fixtures/ios-basic'));
    const rendered = renderJsonReport(report);
    expect(() => JSON.parse(rendered)).not.toThrow();
    expect(rendered.trim().startsWith('{')).toBe(true);
  });

  it('renders markdown report sections', async () => {
    const report = await scanProject(path.resolve('test/fixtures/ios-bad'));
    const rendered = renderMarkdownReport(report);
    expect(rendered).toContain('# AppLaunchGuard Report');
    expect(rendered).toContain('## Risk Summary');
    expect(rendered).toContain('## Suggested Next Actions');
  });
});
