# AppLaunchGuard

An open-source CLI and GitHub Action that scans iOS apps for App Store submission risks before review.

AppLaunchGuard helps developers catch App Store review risks before they submit.

## What it does

AppLaunchGuard statically scans an iOS project and produces terminal, JSON, or Markdown reports for common App Store submission risk areas:

- iOS project detection
- Info.plist permission usage descriptions
- PrivacyInfo.xcprivacy coverage
- App Tracking Transparency mismatches
- RevenueCat, StoreKit, paywall, and subscription signals
- Analytics, crash, ads, and attribution SDKs
- App icons, screenshots, fastlane metadata, and iPad screenshot evidence
- Exposed secrets
- Mental health, therapy, and medical-language review notes
- Privacy policy, terms, support URL, and subscription metadata checks

## Why it exists

Many App Store Review problems are avoidable but easy to miss: privacy metadata, tracking confusion, unclear subscriptions, missing screenshots, or sensitive app wording. AppLaunchGuard turns that painful launch checklist into a local, testable tool for indie iOS developers, AI app builders, and small teams.

## Install

```sh
npm install -g app-launch-guard
```

For local development:

```sh
npm install
npm run build
```

## Quick start

```sh
app-launch-guard scan .
```

Or from this repository:

```sh
npm run dev -- scan test/fixtures/ios-basic
```

## CLI usage

```sh
app-launch-guard scan
app-launch-guard scan .
app-launch-guard scan /path/to/ios/project
app-launch-guard scan --json
app-launch-guard scan --markdown
app-launch-guard scan --output report.json
app-launch-guard scan --output report.md
app-launch-guard scan --fail-on critical
app-launch-guard scan --fail-on warning
app-launch-guard scan --no-color
app-launch-guard --help
app-launch-guard scan --help
```

`--fail-on` supports:

- `none`: always exit 0 unless the scan has an internal error
- `critical`: exit 1 if critical issues exist
- `warning`: exit 1 if warning or critical issues exist

The local CLI defaults to `--fail-on none`.

## Example output

```text
AppLaunchGuard

Project
✓ iOS project detected
Root: /Users/example/MyApp
Confidence: 92/100

Risk Summary
Risk level: Medium
Risk score: 48/100
Critical: 1
Warnings: 4
Manual review: 3

Critical Issues
✗ Missing NSUserTrackingUsageDescription
  AppTrackingTransparency usage was detected, but Info.plist does not include NSUserTrackingUsageDescription.
  Suggested fix: Add NSUserTrackingUsageDescription to Info.plist with a clear user-facing reason.
```

## GitHub Action usage

```yaml
name: AppLaunchGuard

on:
  pull_request:
  push:
    branches: [main]

jobs:
  app-launch-guard:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: momenadel/app-launch-guard@v1
        with:
          path: "."
          output: "markdown"
          fail-on: "critical"
```

The example workflow in `examples/github-action` also uploads `app-launch-guard-report.md` as an artifact.

## What AppLaunchGuard checks

AppLaunchGuard checks for local signals that may affect App Store Review:

- Permission APIs used without matching Info.plist usage descriptions
- Privacy manifest presence, parseability, and key coverage
- ATT API usage without `NSUserTrackingUsageDescription`
- Tracking usage description without obvious ATT code
- RevenueCat and StoreKit subscription configuration signals
- Common analytics, crash, ads, attribution, push, and paywall SDKs
- App icon, screenshot, iPad screenshot, and fastlane metadata evidence
- Common exposed secret patterns, with masked output
- Mental health, therapy, medical, crisis, and AI companion language
- Privacy policy, terms, support, and subscription copy evidence

## What it does not do

AppLaunchGuard does not:

- Guarantee App Store approval
- Guarantee App Store rejection
- Replace Apple guidelines, legal review, or App Store Connect privacy answers
- Connect to App Store Connect
- Upload your code
- Use telemetry
- Make external network calls during scans
- Use AI in v1

## JSON report

```sh
app-launch-guard scan . --json --output report.json
```

The JSON report is stable and includes:

- tool name and version
- scanned path and timestamp
- project summary
- risk score and risk level
- issue list
- check results
- report metadata

## Markdown report

```sh
app-launch-guard scan . --markdown --output report.md
```

Markdown reports are useful for PR comments, release checklists, and GitHub Action artifacts.

## Roadmap

See `ROADMAP.md`.

## Contributing

See `CONTRIBUTING.md`.

## Security

See `SECURITY.md`. AppLaunchGuard has no telemetry by default and does not send project contents to external services.

## Disclaimer

AppLaunchGuard helps reduce review risk, but it does not guarantee App Store approval. Developers are responsible for reviewing Apple’s latest guidelines, App Store Connect privacy answers, and legal requirements.

## License

MIT
