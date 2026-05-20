import path from 'node:path';
import type { Issue, ScanContext } from '../types.js';
import { relativePath } from '../utils/fileSystem.js';
import { parsePlistFile } from '../utils/plist.js';

export async function scanAppStoreAssets(context: ScanContext): Promise<Issue[]> {
  const issues: Issue[] = [];
  const relFiles = context.files.map((file) => relativePath(context.root, file));
  const hasAssetCatalog = relFiles.some((file) => file.includes('.xcassets/'));
  const appIcon = relFiles.find((file) => file.includes('AppIcon.appiconset/') && file.endsWith('Contents.json'));
  const hasLaunchScreen = relFiles.some((file) => /LaunchScreen\.(storyboard|swift|xib)$/i.test(path.basename(file)));
  const fastlaneMetadata = relFiles.filter((file) => file.includes('fastlane/metadata/'));
  const fastlaneScreenshots = relFiles.filter((file) => file.includes('fastlane/screenshots/'));
  const screenshots = relFiles.filter((file) => /screenshots?/i.test(file) && /\.(png|jpg|jpeg)$/i.test(file));
  const privacyDetails = relFiles.filter((file) => /app_privacy_details/i.test(file));
  const deliverFiles = relFiles.filter((file) => /deliver/i.test(file));

  if (!hasAssetCatalog) {
    issues.push({
      id: 'assets.xcassets_missing',
      title: 'Asset catalog not found',
      severity: 'warning',
      category: 'App Store Assets',
      description: 'No .xcassets folder was found. Confirm app icons and visual assets are configured for the App Store build.',
    });
  }

  if (!appIcon) {
    issues.push({
      id: 'assets.app_icon_missing',
      title: 'App icon evidence not found',
      severity: 'warning',
      category: 'App Store Assets',
      description: 'AppLaunchGuard did not find AppIcon.appiconset/Contents.json.',
      suggestedFix: 'Confirm the app target has a complete AppIcon.appiconset.',
    });
  } else {
    issues.push({
      id: 'assets.app_icon_found',
      title: 'App icon found',
      severity: 'info',
      category: 'App Store Assets',
      description: 'AppIcon.appiconset was found.',
      filePath: appIcon,
    });
  }

  if (!hasLaunchScreen) {
    issues.push({
      id: 'assets.launch_screen_missing',
      title: 'Launch screen evidence not found',
      severity: 'manual_review',
      category: 'App Store Assets',
      description: 'No obvious launch screen file was found. This may be fine for some SwiftUI projects, but should be checked before submission.',
    });
  }

  if (fastlaneMetadata.length === 0) {
    issues.push({
      id: 'assets.fastlane_metadata_missing',
      title: 'fastlane metadata not found',
      severity: 'manual_review',
      category: 'App Store Assets',
      description: 'Static scanning cannot read App Store Connect. fastlane metadata is optional, but local metadata makes review text easier to audit.',
    });
  }

  if (screenshots.length === 0 && fastlaneScreenshots.length === 0) {
    issues.push({
      id: 'assets.screenshots_missing',
      title: 'Screenshot evidence not found',
      severity: 'warning',
      category: 'App Store Assets',
      description: 'No local screenshot folder or fastlane screenshots were found. Confirm iPhone screenshots are ready before submission.',
      suggestedFix: 'Prepare accurate screenshots, including subscription/paywall screens when paid access exists.',
    });
  }

  const supportsIpad = await inferIpadSupport(context);
  const hasIpadScreens = [...screenshots, ...fastlaneScreenshots].some((file) => /ipad|12\.9|13-inch|129/i.test(file));
  if (supportsIpad && !hasIpadScreens) {
    issues.push({
      id: 'assets.ipad_screenshots_missing',
      title: 'iPad support detected but no iPad screenshot folder found',
      severity: 'warning',
      category: 'App Store Assets',
      description: 'UIDeviceFamily appears to include iPad, but no local iPad screenshot evidence was found.',
      suggestedFix: 'Confirm 13-inch iPad screenshots are prepared if the app supports iPad.',
    });
  }

  issues.push({
    id: 'assets.submission_checklist',
    title: 'App Store asset checklist needs manual review',
    severity: 'manual_review',
    category: 'App Store Assets',
    description: 'Confirm iPhone screenshots, 13-inch iPad screenshots if supported, accurate subscription text, privacy policy URL, terms URL, and support URL.',
    evidence: privacyDetails.length > 0 || deliverFiles.length > 0 ? 'fastlane privacy or deliver files found' : undefined,
  });

  return issues;
}

async function inferIpadSupport(context: ScanContext): Promise<boolean> {
  for (const plistFile of context.plistFiles) {
    const parsed = await parsePlistFile(plistFile);
    const family = parsed.data?.UIDeviceFamily;
    if (Array.isArray(family) && family.map(String).includes('2')) return true;
    if (parsed.raw?.includes('<integer>2</integer>')) return true;
  }
  return false;
}
