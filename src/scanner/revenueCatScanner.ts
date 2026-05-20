import type { Issue, ScanContext } from '../types.js';
import { readTextFile, relativePath } from '../utils/fileSystem.js';
import { looksLikeProductId, maskSecret, quotedStrings } from '../utils/textSearch.js';

export interface RevenueCatResult {
  issues: Issue[];
  detectedRevenueCat: boolean;
  detectedStoreKit: boolean;
  detectedProductIds: string[];
  detectedEntitlementIds: string[];
  detectedOfferingIds: string[];
}

export async function scanRevenueCat(context: ScanContext): Promise<RevenueCatResult> {
  const issues: Issue[] = [];
  const productIds = new Set<string>();
  const entitlementIds = new Set<string>();
  const offeringIds = new Set<string>();
  let detectedRevenueCat = false;
  let detectedStoreKit = false;
  let firstSubscriptionFile: string | undefined;

  const subscriptionFiles = context.sdkFiles.filter((file) => !file.endsWith('.plist') && !file.endsWith('.xcprivacy'));

  for (const file of subscriptionFiles) {
    const text = await readTextFile(file);
    if (!text) continue;
    const rel = relativePath(context.root, file);
    if (/RevenueCat|RevenueCatUI|Purchases\.configure|PaywallView/i.test(text)) {
      detectedRevenueCat = true;
      firstSubscriptionFile ??= rel;
    }
    if (/StoreKit|Product\.products|SubscriptionStoreView/i.test(text)) {
      detectedStoreKit = true;
      firstSubscriptionFile ??= rel;
    }

    for (const value of quotedStrings(text)) {
      if (looksLikeProductId(value)) productIds.add(value);
      if (/entitlement/i.test(value) || /premium|pro|plus|paid/i.test(value)) entitlementIds.add(value);
      if (/offering/i.test(value) || value === 'default' || value === 'current') offeringIds.add(value);
    }

    const keyMatch = text.match(/(appl_[A-Za-z0-9_]{8,}|rc_[A-Za-z0-9_]{8,})/);
    if (keyMatch) {
      issues.push({
        id: 'revenuecat.public_key_found',
        title: 'RevenueCat SDK key found',
        severity: 'manual_review',
        category: 'Subscriptions',
        description: 'RevenueCat public SDK keys are commonly shipped in apps, but confirm this is not a private secret before publishing reports.',
        filePath: rel,
        evidence: maskSecret(keyMatch[1]),
      });
    }
  }

  if ((detectedRevenueCat || detectedStoreKit) && productIds.size === 0) {
    issues.push({
      id: 'subscriptions.product_ids_missing',
      title: 'Subscription code detected but product IDs were not found',
      severity: 'warning',
      category: 'Subscriptions',
      description: 'Paywall or subscription code appears to exist, but no obvious App Store product identifiers were found.',
      filePath: firstSubscriptionFile,
      suggestedFix: 'Confirm product identifiers, subscription copy, pricing, and entitlement behavior before App Store submission.',
    });
  }

  if (detectedRevenueCat && entitlementIds.size === 0) {
    issues.push({
      id: 'revenuecat.entitlements_missing',
      title: 'RevenueCat detected but entitlement identifiers were not found',
      severity: 'warning',
      category: 'Subscriptions',
      description: 'RevenueCat projects usually rely on entitlements. Missing or unclear entitlement strings can make review and debugging harder.',
      filePath: firstSubscriptionFile,
      suggestedFix: 'Confirm entitlement identifiers and paid access behavior are documented and tested.',
    });
  }

  if (detectedRevenueCat || detectedStoreKit) {
    issues.push({
      id: 'subscriptions.metadata_manual_review',
      title: 'Subscription metadata needs manual review',
      severity: 'manual_review',
      category: 'Subscriptions',
      description: 'If the app uses paid access, App Store text and screenshots should clearly explain subscription terms, gated features, and restoration behavior.',
      filePath: firstSubscriptionFile,
    });
  }

  return {
    issues,
    detectedRevenueCat,
    detectedStoreKit,
    detectedProductIds: [...productIds].sort(),
    detectedEntitlementIds: [...entitlementIds].sort(),
    detectedOfferingIds: [...offeringIds].sort(),
  };
}
