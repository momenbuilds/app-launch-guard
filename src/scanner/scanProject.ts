import path from 'node:path';
import pkg from '../../package.json' assert { type: 'json' };
import type { CheckResult, Issue, ScanContext, ScanOptions, ScanReport } from '../types.js';
import { isTextFile, relativePath } from '../utils/fileSystem.js';
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

export async function scanProject(targetPath: string, options: ScanOptions = {}): Promise<ScanReport> {
  const root = path.resolve(targetPath);
  const files = await listProjectFiles(root, { includeAll: options.includeAll });
  const projectSummary = detectIosProject(root, files);
  const scope = buildScanScope(root, files, options);

  const context: ScanContext = {
    root,
    files,
    swiftFiles: scope.swiftFiles,
    plistFiles: scope.plistFiles,
    privacyManifestFiles: scope.privacyManifestFiles,
    sourceFiles: scope.sourceFiles,
    sdkFiles: scope.sdkFiles,
    securityFiles: scope.securityFiles,
    metadataFiles: scope.metadataFiles,
    mentalHealthFiles: scope.mentalHealthFiles,
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

function buildScanScope(root: string, files: string[], options: ScanOptions): {
  swiftFiles: string[];
  plistFiles: string[];
  privacyManifestFiles: string[];
  sourceFiles: string[];
  sdkFiles: string[];
  securityFiles: string[];
  metadataFiles: string[];
  mentalHealthFiles: string[];
} {
  const swiftFiles = files.filter((file) => file.endsWith('.swift'));
  const plistFiles = files.filter((file) => file.endsWith('Info.plist'));
  const privacyManifestFiles = files.filter((file) => file.endsWith('PrivacyInfo.xcprivacy'));
  const sourceFiles = files.filter((file) => isSourceConfigFile(relativePath(root, file)));
  const metadataFiles = files.filter((file) => isMetadataFile(relativePath(root, file), Boolean(options.includeDocs)));
  const localizationFiles = files.filter((file) => isLocalizationFile(relativePath(root, file)));
  const allTextFiles = files.filter((file) => isTextFile(file));
  const sdkFiles = options.includeAll ? allTextFiles : sourceFiles;
  const securityFiles = options.includeAll ? allTextFiles : sourceFiles.filter((file) => !isTestFixtureFile(root, file));
  const mentalHealthFiles = options.includeAll ? allTextFiles : uniqueFiles([...swiftFiles, ...localizationFiles, ...metadataFiles]);

  return {
    swiftFiles,
    plistFiles,
    privacyManifestFiles,
    sourceFiles,
    sdkFiles,
    securityFiles,
    metadataFiles: options.includeAll ? allTextFiles : metadataFiles,
    mentalHealthFiles,
  };
}

function isSourceConfigFile(relativeFile: string): boolean {
  const lower = relativeFile.toLowerCase();
  const base = path.basename(lower);
  const sourceExtensions = [
    '.swift',
    '.plist',
    '.xcprivacy',
    '.pbxproj',
    '.entitlements',
    '.storyboard',
    '.xib',
    '.xcconfig',
    '.strings',
    '.stringsdict',
    '.xcstrings',
  ];
  const sourceNames = new Set(['podfile', 'cartfile', 'package.swift', 'package.resolved']);
  if (sourceNames.has(base)) return true;
  if (sourceExtensions.some((extension) => lower.endsWith(extension))) return true;
  return lower.includes('.xcassets/') && base === 'contents.json';
}

function isMetadataFile(relativeFile: string, includeDocs: boolean): boolean {
  const lower = relativeFile.toLowerCase();
  const base = path.basename(lower);
  if (base === 'readme.md') return true;
  if (/(^|\/)docs\//.test(lower)) return true;
  if (lower.includes('fastlane/metadata/')) return true;
  if (/(^|\/)(appstore|app-store|app_store)\//.test(lower)) return true;

  if (includeDocs && isDocFile(lower)) return true;
  return false;
}

function isLocalizationFile(relativeFile: string): boolean {
  const lower = relativeFile.toLowerCase();
  return ['.strings', '.stringsdict', '.xcstrings'].some((extension) => lower.endsWith(extension));
}

function isDocFile(relativeFile: string): boolean {
  const lower = relativeFile.toLowerCase();
  return ['.md', '.markdown', '.mdx', '.txt', '.rst', '.adoc'].some((extension) => lower.endsWith(extension));
}

function isTestFixtureFile(root: string, filePath: string): boolean {
  const rel = relativePath(root, filePath);
  return rel.startsWith('test/fixtures/');
}

function uniqueFiles(files: string[]): string[] {
  return [...new Set(files)];
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
