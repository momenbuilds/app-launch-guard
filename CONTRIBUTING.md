# Contributing to AppLaunchGuard

Thanks for helping make AppLaunchGuard more useful for indie iOS developers and small teams.

## Setup

```sh
npm install
```

## Run locally

```sh
npm run build
node dist/index.js scan test/fixtures/ios-basic
node dist/index.js scan test/fixtures/ios-bad --markdown
```

## Tests

```sh
npm run typecheck
npm test
npm run lint
npm run build
```

## Add a scanner

Scanners live in src/scanner. Prefer a small function that accepts ScanContext and returns issues or a small result object. Keep wording careful:

- Say "review risk", "potential issue", "needs manual review", or "may cause App Store Review confusion".
- Do not say a finding guarantees approval or rejection.
- Do not print secrets or private values.

Wire the scanner into src/scanner/scanProject.ts, add report metadata only if useful, and add focused tests.

## Add fixtures

Fixtures live in test/fixtures. Keep them small and fake. They should not require Xcode, real signing assets, real API keys, or network access.

## Coding style

- TypeScript first.
- Simple functions over classes.
- Stable JSON output.
- Cross-platform paths.
- No telemetry, analytics, databases, auth, or external network calls.
- Avoid large files and unrelated refactors.

## Issue reporting

Use the bug report template and include the command, OS, Node version, and a minimal fixture when possible. Do not paste private app code or secrets into issues.

## PR process

Open a focused PR with a short summary, tests run, and report excerpts if relevant. Good first issues include new SDK detection rules, better fixture coverage, and clearer documentation.
