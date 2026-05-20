import path from 'node:path';
import pkg from '../../package.json' assert { type: 'json' };
import type { CheckResult, Issue, ScanContext, ScanReport } from '../types.js';
import { shouldScanTextFile } from '../utils/fileSystem.js';
import { listProjectFiles } from '../utils/glob.js';
import { sortIssues } from '../utils/severity.js';
import { scanAnalyticsSdks } from './analyticsScanner.js';
import { scanAppStoreAssets } from './appStoreAssetsScanner.js';
import { scanAtt } from './attScanner.js';
import { scanMetadata } from './metadataScanner.js';
import { scanPlists } from './plistScanner.js';
import { scanPrivacyManifest } from './privacyManifestScanner.js';
import { detectIosProject } from './projectDetection.js';
import { scanRevenueCat } from './revenueCatScanner.js';
import { calculateRiskScore } from './riskScore.js';
import { scanSecurity } from './securityScanner.js';

export async function scanProject(targetPath: string): Promise<ScanReport> {
  const root = path.resolve(targetPath);
  const files = await listProjectFiles(root);
  const projectSummary = detectIosProject(root, files);

  const context: ScanContext = {
    root,
    files,
    swiftFiles: files.filter((file) => file.endsWith('.swift')),
    plistFiles: files.filter((file) => file.endsWith('Info.plist')),
    privacyManifestFiles: files.filter((file) => file.endsWith('PrivacyInfo.xcprivacy')),
    textFiles: files.filter(shouldScanTextFile),
    projectSummary,
  };

  const issues: Issue[] = [];
  const checks: CheckResult[] = [];

  if (projectSummary.confidenceScore === 0) {
    issues.push({
      id: 'project.not_detected',
      title: 'iOS project was not confidently detected',
      severity: 'critical',
      category: 'Project Detection',
      description: 'AppLaunchGuard could not confidently detect an iOS project in this folder. It looked for .xcodeproj, .xcworkspace, project.pbxproj, Info.plist, PrivacyInfo.xcprivacy, Package.swift, Podfile, Cartfile, fastlane, Swift files, entitlements, storyboards, and asset catalogs.',
      suggestedFix: 'Run the scanner from the iOS project root or pass the path to the app project.',
    });
  } else if (projectSummary.confidenceScore < 40) {
    issues.push({
      id: 'project.low_confidence',
      title: 'Low-confidence iOS project detection',
      severity: 'manual_review',
      category: 'Project Detection',
      description: projectSummary.warnings[0] ?? 'Only a few iOS project signals were found.',
      suggestedFix: 'Confirm the scan path points at the iOS project root.',
    });
  } else {
    issues.push({
      id: 'project.detected',
      title: 'iOS project detected',
      severity: 'info',
      category: 'Project Detection',
      description: `Project confidence is ${projectSummary.confidenceScore}/100.`,
    });
  }

  const revenueCat = await scanRevenueCat(context);
  const analytics = await scanAnalyticsSdks(context);
  const metadata = await scanMetadata(context, revenueCat.detectedRevenueCat || revenueCat.detectedStoreKit);

  issues.push(
    ...(await scanPlists(context)),
    ...(await scanPrivacyManifest(context)),
    ...(await scanAtt(context)),
    ...revenueCat.issues,
    ...analytics.issues,
    ...(await scanAppStoreAssets(context)),
    ...(await scanSecurity(context)),
    ...metadata.issues,
  );

  checks.push(
    { name: 'Project detection', status: projectSummary.confidenceScore >= 40 ? 'pass' : projectSummary.confidenceScore > 0 ? 'manual_review' : 'fail', details: projectSummary as unknown as Record<string, unknown> },
    { name: 'Info.plist permissions', status: statusForCategory(issues, 'Info.plist') },
    { name: 'Privacy manifest', status: statusForCategory(issues, 'Privacy Manifest') },
    { name: 'App Tracking Transparency', status: statusForCategory(issues, 'App Tracking Transparency') },
    { name: 'Subscriptions', status: statusForCategory(issues, 'Subscriptions'), details: revenueCat as unknown as Record<string, unknown> },
    { name: 'SDK privacy review', status: statusForCategory(issues, 'SDK Privacy Review'), details: { detectedSdks: analytics.detectedSdks } },
    { name: 'App Store assets', status: statusForCategory(issues, 'App Store Assets') },
    { name: 'Security', status: statusForCategory(issues, 'Security') },
    { name: 'Metadata', status: statusForCategory(issues, 'Metadata'), details: { foundUrls: metadata.foundUrls, mentalHealthDetected: metadata.mentalHealthDetected } },
  );

  const sortedIssues = sortIssues(dedupeIssues(issues));
  const riskScore = calculateRiskScore(sortedIssues);

  return {
    toolName: 'AppLaunchGuard',
    version: pkg.version,
    scannedAt: new Date().toISOString(),
    projectRoot: root,
    projectSummary,
    riskScore,
    riskLevel: riskScore.level,
    summary: {
      critical: riskScore.criticalCount,
      warnings: riskScore.warningCount,
      manualReview: riskScore.manualReviewCount,
      info: riskScore.infoCount,
      totalIssues: sortedIssues.length,
    },
    issues: sortedIssues,
    checks,
    metadata: {
      disclaimer: 'AppLaunchGuard helps reduce review risk, but it does not guarantee App Store approval. Developers are responsible for reviewing Apple’s latest guidelines, App Store Connect privacy answers, and legal requirements.',
      scannedFiles: files.length,
      detectedSdks: analytics.detectedSdks,
      detectedProductIds: revenueCat.detectedProductIds,
      foundUrls: metadata.foundUrls,
    },
  };
}

function statusForCategory(issues: Issue[], category: string): CheckResult['status'] {
  const categoryIssues = issues.filter((issue) => issue.category === category);
  if (categoryIssues.some((issue) => issue.severity === 'critical')) return 'fail';
  if (categoryIssues.some((issue) => issue.severity === 'warning')) return 'warning';
  if (categoryIssues.some((issue) => issue.severity === 'manual_review')) return 'manual_review';
  return 'pass';
}

function dedupeIssues(issues: Issue[]): Issue[] {
  const seen = new Set<string>();
  return issues.filter((issue) => {
    const key = `${issue.id}:${issue.filePath ?? ''}:${issue.evidence ?? ''}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
