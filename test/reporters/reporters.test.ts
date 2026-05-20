import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { renderHtmlReport } from '../../src/reporters/htmlReporter.js';
import { renderJsonReport } from '../../src/reporters/jsonReporter.js';
import { renderMarkdownReport } from '../../src/reporters/markdownReporter.js';
import { scanProject } from '../../src/scanner/scanProject.js';
import type { ScanReport } from '../../src/types.js';

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

  it('renders HTML report content', async () => {
    const report = await scanProject(path.resolve('test/fixtures/ios-bad'));
    const rendered = renderHtmlReport(report);
    expect(rendered).toContain('<title>AppLaunchGuard Report</title>');
    expect(rendered).toContain('Risk score');
    expect(rendered).toContain('Critical');
  });

  it('escapes unsafe HTML in report fields', () => {
    const report: ScanReport = {
      toolName: 'AppLaunchGuard',
      version: '0.1.0',
      scannedAt: '2026-05-20T00:00:00.000Z',
      projectRoot: '<script>alert(1)</script>',
      projectSummary: {
        projectRoot: '<script>alert(1)</script>',
        confidenceScore: 50,
        detectedProjectFiles: [],
        detectedWorkspaceFiles: [],
        detectedPbxprojFiles: [],
        detectedPlistFiles: [],
        detectedPrivacyManifestFiles: [],
        detectedSwiftFilesCount: 0,
        detectedPackageManagers: [],
        warnings: [],
      },
      riskScore: {
        score: 10,
        level: 'low',
        criticalCount: 0,
        warningCount: 0,
        manualReviewCount: 1,
        infoCount: 0,
        topRisks: [],
        suggestedNextActions: ['Review <b>this</b>'],
      },
      riskLevel: 'low',
      summary: {
        critical: 0,
        warnings: 0,
        manualReview: 1,
        info: 0,
        totalIssues: 1,
      },
      issues: [
        {
          id: 'test.unsafe',
          title: 'Unsafe <img src=x onerror=alert(1)>',
          severity: 'manual_review',
          category: 'Test',
          description: 'Description with <script>alert(1)</script>',
          evidence: '<svg onload=alert(1)>',
          suggestedFix: 'Fix <b>here</b>',
        },
      ],
      checks: [{ name: 'Test check', status: 'manual_review' }],
      metadata: {
        disclaimer: 'AppLaunchGuard helps reduce review risk.',
        scannedFiles: 1,
        detectedSdks: [],
        detectedProductIds: [],
        foundUrls: [],
      },
    };

    const rendered = renderHtmlReport(report);
    expect(rendered).not.toContain('<script>alert(1)</script>');
    expect(rendered).toContain('&lt;script&gt;alert(1)&lt;/script&gt;');
    expect(rendered).toContain('&lt;img src=x onerror=alert(1)&gt;');
  });
});
