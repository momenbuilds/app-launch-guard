# Release Checklist

Use this checklist before publishing a new release.

## Pre-release

- [ ] npm install
- [ ] npm run typecheck
- [ ] npm test
- [ ] npm run lint
- [ ] npm run build
- [ ] Run fixture scans:
  - node dist/index.js scan test/fixtures/ios-basic --no-color
  - node dist/index.js scan test/fixtures/ios-bad --no-color
  - node dist/index.js scan test/fixtures/ios-doc-noise --no-color
  - node dist/index.js scan test/fixtures/ios-doc-noise --include-all --no-color
- [ ] Update version in package.json
- [ ] Update CHANGELOG.md

## Release

- [ ] npm login
- [ ] npm whoami
- [ ] npm pack --dry-run
- [ ] Review packed files and confirm no tests, fixtures, local reports, .env files, or private files are included
- [ ] npm publish --access public
- [ ] Verify npm page: https://www.npmjs.com/package/app-launch-guard
- [ ] Test global install:
  - npm install -g app-launch-guard
  - app-launch-guard --help
  - app-launch-guard scan .
- [ ] Create a git tag (vX.Y.Z)
- [ ] Push tag to GitHub
- [ ] Create GitHub release notes
