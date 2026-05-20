import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { scanProject } from '../../src/scanner/scanProject.js';
import { detectIosProject } from '../../src/scanner/projectDetection.js';
import { calculateRiskScore } from '../../src/scanner/riskScore.js';
import type { Issue } from '../../src/types.js';

const fixtures = path.resolve('test/fixtures');

describe('project detection', () => {
  it('detects an iOS-like project', () => {
    const root = path.join(fixtures, 'ios-basic');
    const summary = detectIosProject(root, [
      path.join(root, 'BasicApp.xcodeproj/project.pbxproj'),
      path.join(root, 'App/App.swift'),
      path.join(root, 'App/Info.plist'),
      path.join(root, 'App/Assets.xcassets/AppIcon.appiconset/Contents.json'),
    ]);
    expect(summary.confidenceScore).toBeGreaterThanOrEqual(40);
    expect(summary.detectedSwiftFilesCount).toBe(1);
  });
});

describe('scanProject', () => {
  it('finds missing ATT usage description', async () => {
    const report = await scanProject(path.join(fixtures, 'ios-with-att-missing-plist'));
    expect(report.issues.some((issue) => issue.id === 'att.missing_usage_description')).toBe(true);
    expect(report.summary.critical).toBeGreaterThan(0);
  });

  it('detects privacy manifest files', async () => {
    const report = await scanProject(path.join(fixtures, 'ios-with-privacy-manifest'));
    expect(report.projectSummary.detectedPrivacyManifestFiles.length).toBe(1);
    expect(report.issues.some((issue) => issue.id === 'privacy_manifest.found')).toBe(true);
  });

  it('detects RevenueCat product and entitlement IDs', async () => {
    const report = await scanProject(path.join(fixtures, 'ios-with-revenuecat'));
    expect(report.metadata.detectedProductIds).toContain('com.example.revenueapp.monthly');
    expect(report.issues.some((issue) => issue.id === 'revenuecat.public_key_found')).toBe(true);
  });

  it('flags bad fixture risks and masks secrets', async () => {
    const report = await scanProject(path.join(fixtures, 'ios-bad'));
    expect(report.issues.some((issue) => issue.id === 'plist.NSCameraUsageDescription.missing')).toBe(true);
    expect(report.issues.some((issue) => issue.id === 'att.missing_usage_description')).toBe(true);
    expect(report.issues.some((issue) => issue.id.startsWith('sdk.firebaseanalytics'))).toBe(true);
    const secret = report.issues.find((issue) => issue.category === 'Security');
    expect(secret?.evidence).not.toContain('testsecretvalue1234567890');
  });

  it('ignores doc noise by default but still reads README metadata', async () => {
    const report = await scanProject(path.join(fixtures, 'ios-doc-noise'));
    expect(report.metadata.detectedSdks.length).toBe(0);
    expect(report.issues.some((issue) => issue.category === 'SDK Privacy Review')).toBe(false);
    expect(report.issues.some((issue) => issue.id === 'metadata.privacy_url_missing')).toBe(false);
    expect(report.metadata.foundUrls).toContain('https://example.com/privacy');
  });

  it('includes doc noise with include-all', async () => {
    const report = await scanProject(path.join(fixtures, 'ios-doc-noise'), { includeAll: true });
    expect(report.metadata.detectedSdks).toEqual(expect.arrayContaining(['RevenueCat', 'Superwall', 'Adjust', 'PostHog']));
  });
});

describe('risk scoring', () => {
  it('scores issues with caps', () => {
    const issues: Issue[] = [
      { id: 'a', title: 'A', severity: 'critical', category: 'x', description: 'x' },
      { id: 'b', title: 'B', severity: 'warning', category: 'x', description: 'x' },
      { id: 'c', title: 'C', severity: 'manual_review', category: 'x', description: 'x' },
    ];
    const score = calculateRiskScore(issues);
    expect(score.score).toBe(30);
    expect(score.level).toBe('medium');
  });
});
