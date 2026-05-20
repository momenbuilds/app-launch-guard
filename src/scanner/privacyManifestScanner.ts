import type { Issue, ScanContext } from '../types.js';
import { relativePath } from '../utils/fileSystem.js';
import { parsePlistFile } from '../utils/plist.js';
import { searchFiles } from '../utils/textSearch.js';

export async function scanPrivacyManifest(context: ScanContext): Promise<Issue[]> {
  const issues: Issue[] = [];
  const riskySignals = await searchFiles(context.root, context.sdkFiles, [
    /FirebaseAnalytics/i,
    /Mixpanel/i,
    /Amplitude/i,
    /AppsFlyer/i,
    /Adjust/i,
    /advertisingIdentifier/i,
    /UserDefaults/i,
    /FileManager/i,
  ]);

  if (context.privacyManifestFiles.length === 0) {
    issues.push({
      id: 'privacy_manifest.missing',
      title: 'PrivacyInfo.xcprivacy not found',
      severity: riskySignals.length > 0 ? 'critical' : 'warning',
      category: 'Privacy Manifest',
      description: 'Apple may require privacy manifests for certain data collection, SDKs, and accessed APIs. AppLaunchGuard cannot know the full App Store Connect privacy answers.',
      evidence: riskySignals[0]?.line,
      suggestedFix: 'Add and manually review PrivacyInfo.xcprivacy for the app target and third-party SDK usage.',
      docsUrl: 'https://developer.apple.com/documentation/bundleresources/privacy_manifest_files',
    });
    return issues;
  }

  for (const file of context.privacyManifestFiles) {
    const rel = relativePath(context.root, file);
    const parsed = await parsePlistFile(file);
    if (!parsed.data) {
      issues.push({
        id: 'privacy_manifest.invalid',
        title: 'Privacy manifest could not be parsed',
        severity: 'warning',
        category: 'Privacy Manifest',
        description: 'PrivacyInfo.xcprivacy should be a valid plist/XML file.',
        filePath: rel,
        evidence: parsed.error,
      });
      continue;
    }

    const required = ['NSPrivacyCollectedDataTypes', 'NSPrivacyTracking', 'NSPrivacyAccessedAPITypes'];
    for (const key of required) {
      if (!(key in parsed.data)) {
        issues.push({
          id: `privacy_manifest.${key}.missing`,
          title: `${key} missing from privacy manifest`,
          severity: 'warning',
          category: 'Privacy Manifest',
          description: `${key} was not found. Empty values can be valid, but missing fields should be manually reviewed against App Store Connect privacy labels.`,
          filePath: rel,
          suggestedFix: `Review whether ${key} should be included in PrivacyInfo.xcprivacy.`,
        });
      }
    }

    if (parsed.data.NSPrivacyTracking === true && !('NSPrivacyTrackingDomains' in parsed.data)) {
      issues.push({
        id: 'privacy_manifest.tracking_domains_missing',
        title: 'Tracking enabled without tracking domains',
        severity: 'warning',
        category: 'Privacy Manifest',
        description: 'NSPrivacyTracking is true, but NSPrivacyTrackingDomains was not found.',
        filePath: rel,
        suggestedFix: 'Add NSPrivacyTrackingDomains or confirm that tracking is not enabled.',
      });
    }

    for (const key of ['NSPrivacyCollectedDataTypes', 'NSPrivacyAccessedAPITypes']) {
      if (Array.isArray(parsed.data[key]) && parsed.data[key].length === 0) {
        issues.push({
          id: `privacy_manifest.${key}.empty`,
          title: `${key} is empty`,
          severity: 'manual_review',
          category: 'Privacy Manifest',
          description: 'An empty array can be correct, but it needs manual review because the tool cannot infer every App Store Connect privacy answer.',
          filePath: rel,
        });
      }
    }

    issues.push({
      id: 'privacy_manifest.found',
      title: 'PrivacyInfo.xcprivacy found',
      severity: 'info',
      category: 'Privacy Manifest',
      description: 'A privacy manifest exists. Manually confirm it matches App Store Connect privacy labels and current Apple requirements.',
      filePath: rel,
    });
  }

  return issues;
}
