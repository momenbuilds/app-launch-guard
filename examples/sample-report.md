# AppLaunchGuard Report

Scanned path: `/path/to/ios-bad`
Scanned at: 2026-05-20T14:25:12.509Z

## Risk Summary

| Metric | Value |
| --- | --- |
| Risk level | High |
| Risk score | 100/100 |
| Critical | 4 |
| Warnings | 6 |
| Manual review | 11 |
| Info | 2 |

## Critical Issues

### Missing camera usage description

Severity: Critical

Code appears to use a capability that may require NSCameraUsageDescription, but the key was not found in Info.plist.

File: `App/CameraTrackingSubscriptions.swift`

Evidence: `_ = AVCaptureDevice.default(for: .video)`

Suggested fix: Add NSCameraUsageDescription to Info.plist with a clear user-facing reason.

### PrivacyInfo.xcprivacy not found

Severity: Critical

Apple may require privacy manifests for certain data collection, SDKs, and accessed APIs. AppLaunchGuard cannot know the full App Store Connect privacy answers.

Evidence: `import FirebaseAnalytics`

Suggested fix: Add and manually review PrivacyInfo.xcprivacy for the app target and third-party SDK usage.

### Missing NSUserTrackingUsageDescription

Severity: Critical

AppTrackingTransparency usage was detected, but Info.plist does not include NSUserTrackingUsageDescription.

File: `App/CameraTrackingSubscriptions.swift`

Evidence: `import AppTrackingTransparency`

Suggested fix: Add NSUserTrackingUsageDescription to Info.plist with a clear user-facing reason.

### OpenAI API key may be exposed

Severity: Critical

A value that looks like a secret was found in source-controlled files. AppLaunchGuard masks secrets in reports, but the repository should be reviewed before publishing.

File: `App/CameraTrackingSubscriptions.swift`

Evidence: `sk-t...7890`

Suggested fix: Move private secrets out of the app and rotate any key that may have been committed.

## Warnings

### Subscription code detected but product IDs were not found

Severity: Warning

Paywall or subscription code appears to exist, but no obvious App Store product identifiers were found.

File: `App/CameraTrackingSubscriptions.swift`

Suggested fix: Confirm product identifiers, subscription copy, pricing, and entitlement behavior before App Store submission.

### RevenueCat detected but entitlement identifiers were not found

Severity: Warning

RevenueCat projects usually rely on entitlements. Missing or unclear entitlement strings can make review and debugging harder.

File: `App/CameraTrackingSubscriptions.swift`

Suggested fix: Confirm entitlement identifiers and paid access behavior are documented and tested.

### iPad support detected but no iPad screenshot folder found

Severity: Warning

UIDeviceFamily appears to include iPad, but no local iPad screenshot evidence was found.

Suggested fix: Confirm 13-inch iPad screenshots are prepared if the app supports iPad.

### Privacy policy URL not found

Severity: Warning

No privacy policy URL was found in local metadata or docs.

Suggested fix: Confirm the App Store listing includes a reachable privacy policy URL.

### Paid access detected without clear subscription language

Severity: Warning

Subscription or paywall code was detected, but local metadata does not clearly mention subscription terms or paid access.

Suggested fix: Make App Store description, screenshots, and review notes clearly explain paid access and subscription terms.

### Mental health disclaimer language not found

Severity: Warning

Mental health-related text was detected, but AppLaunchGuard did not find obvious disclaimer or emergency guidance language.

File: `README.md`

Suggested fix: Consider adding clear, appropriate support and emergency guidance where relevant.

## Manual Review Items

### Tracking behavior needs manual review

Severity: Manual review

Crash analytics or product analytics do not always require ATT unless used for tracking across apps or websites. Review SDK configuration and App Store Connect privacy answers.

File: `App/CameraTrackingSubscriptions.swift`

### RevenueCat SDK key found

Severity: Manual review

RevenueCat public SDK keys are commonly shipped in apps, but confirm this is not a private secret before publishing reports.

File: `App/CameraTrackingSubscriptions.swift`

Evidence: `appl...3456`

### Subscription metadata needs manual review

Severity: Manual review

If the app uses paid access, App Store text and screenshots should clearly explain subscription terms, gated features, and restoration behavior.

File: `App/CameraTrackingSubscriptions.swift`

### FirebaseAnalytics detected

Severity: Manual review

FirebaseAnalytics may affect privacy labels, tracking disclosures, or App Store Review questions depending on configuration.

File: `App/CameraTrackingSubscriptions.swift`

Evidence: `import FirebaseAnalytics`

Suggested fix: Review what data this SDK collects and how it is disclosed in App Store Connect.

### RevenueCat detected

Severity: Manual review

RevenueCat may affect privacy labels, tracking disclosures, or App Store Review questions depending on configuration.

File: `App/CameraTrackingSubscriptions.swift`

Evidence: `import RevenueCat`

Suggested fix: Review what data this SDK collects and how it is disclosed in App Store Connect.

### Launch screen evidence not found

Severity: Manual review

No obvious launch screen file was found. This may be fine for some SwiftUI projects, but should be checked before submission.

### fastlane metadata not found

Severity: Manual review

Static scanning cannot read App Store Connect. fastlane metadata is optional, but local metadata makes review text easier to audit.

### Screenshot evidence not found

Severity: Manual review

No local screenshot folder or fastlane screenshots were found. Confirm iPhone screenshots are ready before submission.

Suggested fix: Prepare accurate screenshots, including subscription/paywall screens when paid access exists.

### App Store asset checklist needs manual review

Severity: Manual review

Confirm iPhone screenshots, 13-inch iPad screenshots if supported, accurate subscription text, privacy policy URL, terms URL, and support URL.

### Terms URL not found

Severity: Manual review

No terms URL was found in local metadata or docs.

Suggested fix: Confirm the App Store listing includes terms, especially for subscriptions or paid access.

### Mental health or therapy-related language detected

Severity: Manual review

Make sure app metadata does not claim to replace therapy, includes appropriate disclaimers, includes crisis or emergency guidance if relevant, and does not claim diagnosis or medical treatment unless properly supported.

File: `README.md`

Suggested fix: Review App Store metadata, onboarding, and screenshots for careful health-related wording.

## Suggested Next Actions

1. Add NSCameraUsageDescription to Info.plist with a clear user-facing reason.
2. Add and manually review PrivacyInfo.xcprivacy for the app target and third-party SDK usage.
3. Add NSUserTrackingUsageDescription to Info.plist with a clear user-facing reason.
4. Move private secrets out of the app and rotate any key that may have been committed.
5. Confirm product identifiers, subscription copy, pricing, and entitlement behavior before App Store submission.

## Disclaimer

AppLaunchGuard helps reduce review risk, but it does not guarantee App Store approval. Developers are responsible for reviewing Apple’s latest guidelines, App Store Connect privacy answers, and legal requirements.
