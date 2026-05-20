import type { Issue, ScanContext } from '../types.js';
import { searchFiles } from '../utils/textSearch.js';

const sdkRules = [
  { name: 'FirebaseAnalytics', pattern: /FirebaseAnalytics|Analytics\.logEvent/i, risk: 'analytics' },
  { name: 'FirebaseCrashlytics', pattern: /FirebaseCrashlytics|Crashlytics/i, risk: 'crash' },
  { name: 'Firebase', pattern: /FirebaseApp|FirebaseCore/i, risk: 'analytics' },
  { name: 'Sentry', pattern: /SentrySDK|import Sentry/i, risk: 'crash' },
  { name: 'PostHog', pattern: /PostHog/i, risk: 'analytics' },
  { name: 'Amplitude', pattern: /Amplitude/i, risk: 'analytics' },
  { name: 'Mixpanel', pattern: /Mixpanel/i, risk: 'analytics' },
  { name: 'AppsFlyer', pattern: /AppsFlyer/i, risk: 'attribution' },
  { name: 'Adjust', pattern: /Adjust/i, risk: 'attribution' },
  { name: 'OneSignal', pattern: /OneSignal/i, risk: 'analytics' },
  { name: 'RevenueCat', pattern: /RevenueCat|Purchases/i, risk: 'subscriptions' },
  { name: 'Superwall', pattern: /Superwall/i, risk: 'subscriptions' },
  { name: 'AdMob', pattern: /AdMob|GoogleMobileAds/i, risk: 'ads' },
  { name: 'Meta/Facebook SDK', pattern: /FBSDK|FacebookCore|MetaAppEvents/i, risk: 'ads' },
];

export async function scanAnalyticsSdks(context: ScanContext): Promise<{ issues: Issue[]; detectedSdks: string[] }> {
  const issues: Issue[] = [];
  const detected = new Set<string>();

  for (const sdk of sdkRules) {
    const matches = await searchFiles(context.root, context.sdkFiles, [sdk.pattern]);
    if (matches.length === 0 || detected.has(sdk.name)) continue;
    detected.add(sdk.name);

    const isHigherRisk = sdk.risk === 'ads' || sdk.risk === 'attribution';
    const isCrashOnly = sdk.risk === 'crash';
    issues.push({
      id: `sdk.${sdk.name.toLowerCase().replace(/[^a-z0-9]+/g, '_')}`,
      title: `${sdk.name} detected`,
      severity: isHigherRisk ? 'warning' : 'manual_review',
      category: 'SDK Privacy Review',
      description: isCrashOnly
        ? `${sdk.name} appears to be a crash reporting SDK. Crash reporting alone does not necessarily mean tracking, but privacy labels and data collection still need review.`
        : `${sdk.name} may affect privacy labels, tracking disclosures, or App Store Review questions depending on configuration.`,
      filePath: matches[0].relativeFilePath,
      evidence: matches[0].line,
      suggestedFix: isHigherRisk
        ? 'Review ATT, privacy manifest, privacy labels, and SDK configuration for advertising or attribution behavior.'
        : 'Review what data this SDK collects and how it is disclosed in App Store Connect.',
    });
  }

  return { issues, detectedSdks: [...detected].sort() };
}
