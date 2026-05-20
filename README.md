# AppLaunchGuard

[![CI](https://github.com/momenbuilds/app-launch-guard/actions/workflows/ci.yml/badge.svg)](https://github.com/momenbuilds/app-launch-guard/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

An open-source CLI and GitHub Action that helps iOS developers catch App Store submission risks before review.

## What it does

AppLaunchGuard statically scans an iOS project and produces terminal, JSON, Markdown, or HTML reports for common App Store submission risk areas:

- iOS project detection
- Info.plist permission usage descriptions
- PrivacyInfo.xcprivacy coverage
- App Tracking Transparency mismatches
- RevenueCat, StoreKit, paywall, and subscription signals
- Analytics, crash, ads, and attribution SDK signals
- App icons, screenshots, fastlane metadata, and iPad screenshot evidence
- Exposed secrets (masked in reports)
- Mental health, therapy, medical, and crisis language review notes
- Privacy policy, terms, and support URL evidence

## Why it exists

Many App Store Review issues are avoidable but easy to miss: privacy metadata, tracking confusion, unclear subscriptions, missing screenshots, or sensitive app wording. AppLaunchGuard turns that checklist into a local, testable tool for indie iOS developers and small teams.

## Installation

Local development:

```sh
npm install
npm run build
node dist/index.js scan .
```

Linked local CLI:

```sh
npm link
app-launch-guard scan .
```

After npm publish:

```sh
npm install -g app-launch-guard
app-launch-guard scan .
```

## Quick start

```sh
app-launch-guard scan .
```

## CLI usage

```sh
app-launch-guard scan
app-launch-guard scan .
app-launch-guard scan /path/to/ios/project
app-launch-guard scan --json
app-launch-guard scan --markdown
app-launch-guard scan --output report.md
app-launch-guard scan --output report.json
app-launch-guard scan --html
app-launch-guard scan --html --output report.html
app-launch-guard scan --html --open
app-launch-guard scan --html --serve --open
app-launch-guard scan --html --serve --port 4174
app-launch-guard scan --fail-on critical
app-launch-guard scan --fail-on warning
app-launch-guard scan --fail-on none
app-launch-guard scan --include-docs
app-launch-guard scan --include-all
app-launch-guard scan --no-color
app-launch-guard --help
app-launch-guard scan --help
```

## Scan scope

By default, AppLaunchGuard focuses on iOS source and config files plus app-facing metadata:

- iOS source and config files (Swift, plist, privacy manifests, Xcode project files)
- App assets and configuration evidence
- README.md, docs/, and fastlane metadata

SDK detection stays in source and config files, while README/docs/fastlane are used for metadata and disclaimer checks.

It ignores noisy AI/dev folders and transcript files by default, including .claude, .cursor, .windsurf, .openai, .codex, conversation.md, logs, node_modules, build outputs, and .git. This prevents false positives from AI assistant transcripts, notes, and random logs.

Use `--include-docs` to scan broader documentation files, or `--include-all` to scan all text files except dependency, build, and git folders.

## Reports

AppLaunchGuard can output reports in four formats:

- Terminal output for quick local scans
- Markdown output for PR comments or artifacts
- JSON output for automation or dashboards
- HTML output for a local browser dashboard

Examples:

```sh
app-launch-guard scan . --markdown --output report.md
app-launch-guard scan . --json --output report.json
app-launch-guard scan . --html --output report.html
```

## Local dashboard

AppLaunchGuard can generate a local browser report for reviewing scan results visually. The report is fully local, self-contained, and does not send project data anywhere.

```sh
app-launch-guard scan . --html
app-launch-guard scan . --html --open
app-launch-guard scan . --html --serve --open
app-launch-guard scan . --html --serve --port 4174
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
      - uses: momenbuilds/app-launch-guard@v1
        with:
          path: "."
          output: "markdown"
          fail-on: "critical"
```

If you are using the action before a tagged v1 release, reference main:

```yaml
- uses: momenbuilds/app-launch-guard@main
```

Action inputs: `path`, `output`, `fail-on`, `no-color`, `include-docs`, `include-all`.

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

## What AppLaunchGuard checks

- Permission APIs used without matching Info.plist usage descriptions
- Privacy manifest presence, parseability, and key coverage
- ATT API usage without NSUserTrackingUsageDescription
- Tracking usage description without obvious ATT code
- RevenueCat and StoreKit subscription configuration signals
- Common analytics, crash, ads, attribution, push, and paywall SDK signals
- App icon, screenshot, iPad screenshot, and fastlane metadata evidence
- Common exposed secret patterns, with masked output
- Mental health, therapy, medical, crisis, and AI companion language
- Privacy policy, terms, support, and subscription copy evidence

## What it does not do

AppLaunchGuard does not:

- Guarantee App Store approval or rejection
- Replace Apple guidelines, legal review, or App Store Connect privacy answers
- Connect to App Store Connect
- Upload your code
- Use telemetry
- Make external network calls during scans
- Use AI in v1

## Exit codes and fail-on behavior

`--fail-on` supports:

- `none`: always exit 0 unless the scan has an internal error
- `critical`: exit 1 if critical issues exist
- `warning`: exit 1 if warning or critical issues exist

The default is `--fail-on none` for the CLI. The GitHub Action defaults to `fail-on: critical`.

## Common use cases

- Preflight App Store submissions before release
- Catch missing privacy manifests or ATT text before review
- Validate subscription, paywall, and metadata copy
- Produce Markdown reports for PRs
- Keep App Store assets and screenshots checklist visible

## Contributing

See CONTRIBUTING.md for setup, testing, and contribution guidelines.

## Support the project

If AppLaunchGuard helped you catch a review issue or saved you time, a GitHub star helps more developers find it. You can also support development through PayPal: https://paypal.me/mxcenterprise.

Contributions, issues, and feedback are welcome.

## Disclaimer

AppLaunchGuard helps reduce review risk, but it does not guarantee App Store approval. Developers are responsible for reviewing Apple’s latest guidelines, App Store Connect privacy answers, and legal requirements.

## License

MIT

## Development

```sh
npm install
npm run typecheck
npm test
npm run lint
npm run build
```

Fixture scans:

```sh
node dist/index.js scan test/fixtures/ios-basic --no-color
node dist/index.js scan test/fixtures/ios-bad --no-color
node dist/index.js scan test/fixtures/ios-doc-noise --no-color
node dist/index.js scan test/fixtures/ios-doc-noise --include-all --no-color
```
