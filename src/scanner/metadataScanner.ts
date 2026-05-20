import type { Issue, ScanContext } from '../types.js';
import { readTextFile, relativePath } from '../utils/fileSystem.js';
import { extractUrls } from '../utils/textSearch.js';

const mentalHealthPatterns = [
  /therapist/i,
  /therapy/i,
  /mental health/i,
  /anxiety/i,
  /depression/i,
  /diagnosis/i,
  /medical/i,
  /emergency/i,
  /crisis/i,
  /self harm/i,
  /suicide/i,
  /AI companion/i,
  /journal/i,
];

export interface MetadataResult {
  issues: Issue[];
  foundUrls: string[];
  mentalHealthDetected: boolean;
}

export async function scanMetadata(context: ScanContext, hasSubscriptions: boolean): Promise<MetadataResult> {
  const issues: Issue[] = [];
  const foundUrls = new Set<string>();
  let mentalHealthFile: string | undefined;
  let hasDisclaimerLanguage = false;
  let hasSubscriptionLanguage = false;
  const cachedText = new Map<string, string>();

  const metadataFiles = context.metadataFiles;
  const mentalHealthFiles = context.mentalHealthFiles;

  const readCached = async (file: string): Promise<string | null> => {
    if (cachedText.has(file)) return cachedText.get(file) ?? null;
    const text = await readTextFile(file);
    if (text) cachedText.set(file, text);
    return text;
  };

  for (const file of metadataFiles) {
    const text = await readCached(file);
    if (!text) continue;
    const rel = relativePath(context.root, file);
    for (const url of extractUrls(text)) foundUrls.add(url);
    if (mentalHealthPatterns.some((pattern) => pattern.test(text))) mentalHealthFile ??= rel;
    if (/not (a )?(substitute|replacement) for (therapy|medical)|emergency|crisis|call emergency/i.test(text)) hasDisclaimerLanguage = true;
    if (/subscription|free trial|auto-renew|restore purchases|terms of use|paid access|premium/i.test(text)) hasSubscriptionLanguage = true;
  }

  if (!mentalHealthFile) {
    for (const file of mentalHealthFiles) {
      const text = await readCached(file);
      if (!text) continue;
      if (mentalHealthPatterns.some((pattern) => pattern.test(text))) {
        mentalHealthFile = relativePath(context.root, file);
        break;
      }
    }
  }

  const urls = [...foundUrls];
  const hasPrivacy = urls.some((url) => /privacy/i.test(url));
  const hasTerms = urls.some((url) => /terms|tos|eula/i.test(url));
  const hasSupport = urls.some((url) => /support|help|contact/i.test(url));

  const hasMetadataSignals = metadataFiles.length > 0 || foundUrls.size > 0 || hasDisclaimerLanguage || hasSubscriptionLanguage;

  if (!hasPrivacy) {
    issues.push({
      id: 'metadata.privacy_url_missing',
      title: 'Privacy policy URL not found',
      severity: hasMetadataSignals ? 'warning' : 'manual_review',
      category: 'Metadata',
      description: 'No privacy policy URL was found in local metadata or docs.',
      suggestedFix: 'Confirm the App Store listing includes a reachable privacy policy URL.',
    });
  }
  if (!hasTerms) {
    issues.push({
      id: 'metadata.terms_url_missing',
      title: 'Terms URL not found',
      severity: 'manual_review',
      category: 'Metadata',
      description: 'No terms URL was found in local metadata or docs.',
      suggestedFix: 'Confirm the App Store listing includes terms, especially for subscriptions or paid access.',
    });
  }
  if (!hasSupport) {
    issues.push({
      id: 'metadata.support_url_missing',
      title: 'Support URL not found',
      severity: 'manual_review',
      category: 'Metadata',
      description: 'No support URL was found in local metadata or docs.',
      suggestedFix: 'Confirm the App Store listing includes a reachable support URL.',
    });
  }

  if (hasSubscriptions && !hasSubscriptionLanguage) {
    issues.push({
      id: 'metadata.subscription_copy_missing',
      title: 'Paid access detected without clear subscription language',
      severity: 'warning',
      category: 'Metadata',
      description: 'Subscription or paywall code was detected, but local metadata does not clearly mention subscription terms or paid access.',
      suggestedFix: 'Make App Store description, screenshots, and review notes clearly explain paid access and subscription terms.',
    });
  }

  if (mentalHealthFile) {
    issues.push({
      id: 'metadata.mental_health_manual_review',
      title: 'Mental health or therapy-related language detected',
      severity: 'manual_review',
      category: 'Metadata',
      description: 'Make sure app metadata does not claim to replace therapy, includes appropriate disclaimers, includes crisis or emergency guidance if relevant, and does not claim diagnosis or medical treatment unless properly supported.',
      filePath: mentalHealthFile,
      suggestedFix: 'Review App Store metadata, onboarding, and screenshots for careful health-related wording.',
    });

    if (!hasDisclaimerLanguage) {
      issues.push({
        id: 'metadata.mental_health_disclaimer_missing',
        title: 'Mental health disclaimer language not found',
        severity: 'warning',
        category: 'Metadata',
        description: 'Mental health-related text was detected, but AppLaunchGuard did not find obvious disclaimer or emergency guidance language.',
        filePath: mentalHealthFile,
        suggestedFix: 'Consider adding clear, appropriate support and emergency guidance where relevant.',
      });
    }
  }

  return { issues, foundUrls: urls.sort(), mentalHealthDetected: Boolean(mentalHealthFile) };
}
