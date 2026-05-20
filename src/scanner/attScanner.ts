import type { Issue, ScanContext } from '../types.js';
import { relativePath } from '../utils/fileSystem.js';
import { parsePlistFile } from '../utils/plist.js';
import { searchFiles } from '../utils/textSearch.js';

export async function scanAtt(context: ScanContext): Promise<Issue[]> {
  const issues: Issue[] = [];
  const attMatches = await searchFiles(context.root, context.swiftFiles, [
    /AppTrackingTransparency/i,
    /ATTrackingManager/i,
    /requestTrackingAuthorization/i,
    /trackingAuthorizationStatus/i,
    /AdSupport/i,
    /ASIdentifierManager/i,
    /advertisingIdentifier/i,
  ]);

  let hasTrackingUsageDescription = false;
  let trackingDescriptionFile: string | undefined;
  for (const plistFile of context.plistFiles) {
    const parsed = await parsePlistFile(plistFile);
    if (parsed.data?.NSUserTrackingUsageDescription || parsed.raw?.includes('NSUserTrackingUsageDescription')) {
      hasTrackingUsageDescription = true;
      trackingDescriptionFile = relativePath(context.root, plistFile);
    }
  }

  if (attMatches.length > 0 && !hasTrackingUsageDescription) {
    issues.push({
      id: 'att.missing_usage_description',
      title: 'Missing NSUserTrackingUsageDescription',
      severity: 'critical',
      category: 'App Tracking Transparency',
      description: 'AppTrackingTransparency usage was detected, but Info.plist does not include NSUserTrackingUsageDescription.',
      filePath: attMatches[0].relativeFilePath,
      evidence: attMatches[0].line,
      suggestedFix: 'Add NSUserTrackingUsageDescription to Info.plist with a clear user-facing reason.',
      docsUrl: 'https://developer.apple.com/documentation/apptrackingtransparency',
    });
  }

  if (hasTrackingUsageDescription && attMatches.length === 0) {
    issues.push({
      id: 'att.description_without_code',
      title: 'Tracking usage description found without ATT code',
      severity: 'manual_review',
      category: 'App Tracking Transparency',
      description: 'NSUserTrackingUsageDescription exists, but AppLaunchGuard did not find ATT API usage. This can be intentional, but may cause App Store Review confusion if the app does not request tracking permission.',
      filePath: trackingDescriptionFile,
      suggestedFix: 'Confirm whether the app tracks users across apps or websites and whether ATT is requested correctly.',
    });
  }

  if (attMatches.length > 0) {
    issues.push({
      id: 'att.manual_review',
      title: 'Tracking behavior needs manual review',
      severity: 'manual_review',
      category: 'App Tracking Transparency',
      description: 'Crash analytics or product analytics do not always require ATT unless used for tracking across apps or websites. Review SDK configuration and App Store Connect privacy answers.',
      filePath: attMatches[0].relativeFilePath,
    });
  }

  return issues;
}
