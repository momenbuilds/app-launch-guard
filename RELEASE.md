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

- [ ] Create a git tag (vX.Y.Z)
- [ ] Push tag to GitHub
- [ ] Create GitHub release notes
- [ ] Publish npm package when ready
