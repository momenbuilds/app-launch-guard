#!/usr/bin/env node

// src/cli.ts
import { Command } from "commander";
import fs2 from "fs/promises";
import path7 from "path";
import { pathToFileURL } from "url";

// package.json
var package_default = {
  name: "app-launch-guard",
  version: "0.1.0",
  description: "Open-source CLI and GitHub Action that scans iOS apps for App Store submission risks.",
  type: "module",
  bin: {
    "app-launch-guard": "dist/index.js"
  },
  files: [
    "dist/index.js",
    "dist/index.d.ts",
    "README.md",
    "LICENSE",
    "CHANGELOG.md"
  ],
  repository: {
    type: "git",
    url: "git+https://github.com/momenbuilds/app-launch-guard.git"
  },
  bugs: {
    url: "https://github.com/momenbuilds/app-launch-guard/issues"
  },
  homepage: "https://github.com/momenbuilds/app-launch-guard#readme",
  author: "Momen Adel",
  license: "MIT",
  funding: {
    type: "custom",
    url: "https://paypal.me/mxcenterprise"
  },
  engines: {
    node: ">=18"
  },
  scripts: {
    build: "tsup src/index.ts --format esm --dts --sourcemap --clean",
    dev: "tsx src/index.ts",
    test: "vitest run",
    typecheck: "tsc --noEmit",
    lint: "eslint .",
    format: "prettier --write .",
    scan: "tsx src/index.ts scan",
    prepublishOnly: "npm run typecheck && npm test && npm run lint && npm run build"
  },
  dependencies: {
    commander: "^12.1.0",
    "fast-glob": "^3.3.2",
    kleur: "^4.1.5",
    plist: "^3.1.0"
  },
  devDependencies: {
    "@types/node": "^20.14.10",
    "@types/plist": "^3.0.5",
    "@typescript-eslint/eslint-plugin": "^7.16.0",
    "@typescript-eslint/parser": "^7.16.0",
    eslint: "^8.57.0",
    prettier: "^3.3.3",
    tsup: "^8.1.0",
    tsx: "^4.16.2",
    typescript: "^5.5.3",
    vitest: "^2.0.3"
  },
  keywords: [
    "ios",
    "app-store",
    "app-store-review",
    "privacy",
    "privacy-manifest",
    "revenuecat",
    "storekit",
    "cli",
    "github-action",
    "swift",
    "app-launch"
  ]
};

// src/reporters/jsonReporter.ts
function renderJsonReport(report) {
  return `${JSON.stringify(report, null, 2)}
`;
}

// src/reporters/markdownReporter.ts
var labels = {
  critical: "Critical",
  warning: "Warning",
  manual_review: "Manual review",
  info: "Info"
};
function renderMarkdownReport(report) {
  const sections = [
    "# AppLaunchGuard Report",
    "",
    `Scanned path: \`${report.projectRoot}\``,
    `Scanned at: ${report.scannedAt}`,
    "",
    "## Risk Summary",
    "",
    "| Metric | Value |",
    "| --- | --- |",
    `| Risk level | ${capitalize(report.riskLevel)} |`,
    `| Risk score | ${report.riskScore.score}/100 |`,
    `| Critical | ${report.summary.critical} |`,
    `| Warnings | ${report.summary.warnings} |`,
    `| Manual review | ${report.summary.manualReview} |`,
    `| Info | ${report.summary.info} |`,
    "",
    issueSection("Critical Issues", report.issues.filter((issue) => issue.severity === "critical")),
    issueSection("Warnings", report.issues.filter((issue) => issue.severity === "warning")),
    issueSection("Manual Review Items", report.issues.filter((issue) => issue.severity === "manual_review")),
    "## Suggested Next Actions",
    "",
    ...report.riskScore.suggestedNextActions.map((action, index) => `${index + 1}. ${action}`),
    "",
    "## Disclaimer",
    "",
    report.metadata.disclaimer,
    ""
  ];
  return sections.filter((section) => section !== void 0).join("\n");
}
function issueSection(title, issues) {
  if (issues.length === 0) {
    return `## ${title}

None found.
`;
  }
  const blocks = issues.map((issue) => {
    const lines = [`### ${issue.title}`, "", `Severity: ${labels[issue.severity]}`, "", issue.description];
    if (issue.filePath) lines.push("", `File: \`${issue.filePath}\``);
    if (issue.evidence) lines.push("", `Evidence: \`${issue.evidence}\``);
    if (issue.suggestedFix) lines.push("", `Suggested fix: ${issue.suggestedFix}`);
    return lines.join("\n");
  });
  return [`## ${title}`, "", blocks.join("\n\n"), ""].join("\n");
}
function capitalize(value) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

// src/reporters/htmlReporter.ts
var severityOrder = ["critical", "warning", "manual_review", "info"];
function renderHtmlReport(report) {
  const grouped = groupIssues(report.issues);
  const summaryCards = [
    renderSummaryCard("Risk score", String(report.riskScore.score), `/${100}`),
    renderSummaryCard("Critical", String(report.summary.critical), ""),
    renderSummaryCard("Warnings", String(report.summary.warnings), ""),
    renderSummaryCard("Manual review", String(report.summary.manualReview), ""),
    renderSummaryCard("Info", String(report.summary.info), "")
  ].join("");
  const issueSections = severityOrder.map((severity) => renderIssueSection(severity, grouped.get(severity) ?? [])).join("");
  const nextActions = report.riskScore.suggestedNextActions.map((action) => `<li>${escapeHtml(action)}</li>`).join("");
  const checks = report.checks.map((check) => renderCheckRow(check)).join("");
  const projectSummary = renderProjectSummary(report);
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>AppLaunchGuard Report</title>
  <style>
    :root {
      color-scheme: dark;
      --bg: #0b0f14;
      --card: #131a22;
      --card-alt: #17202a;
      --text: #e6edf3;
      --muted: #94a3b8;
      --critical: #ef4444;
      --warning: #f59e0b;
      --manual: #8b5cf6;
      --info: #22c55e;
      --border: #1f2a37;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      background: var(--bg);
      color: var(--text);
      line-height: 1.5;
    }
    .container {
      max-width: 1100px;
      margin: 0 auto;
      padding: 32px 20px 64px;
    }
    header {
      display: flex;
      flex-direction: column;
      gap: 12px;
      margin-bottom: 24px;
    }
    .title-row {
      display: flex;
      align-items: center;
      gap: 12px;
      flex-wrap: wrap;
    }
    h1 { margin: 0; font-size: 28px; }
    .badge {
      padding: 4px 10px;
      border-radius: 999px;
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      font-weight: 600;
    }
    .badge.low { background: rgba(34, 197, 94, 0.2); color: var(--info); }
    .badge.medium { background: rgba(245, 158, 11, 0.2); color: var(--warning); }
    .badge.high { background: rgba(239, 68, 68, 0.2); color: var(--critical); }
    .meta {
      color: var(--muted);
      font-size: 14px;
    }
    .grid {
      display: grid;
      gap: 16px;
      grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
      margin-bottom: 24px;
    }
    .card {
      background: var(--card);
      border: 1px solid var(--border);
      border-radius: 12px;
      padding: 16px;
    }
    .card h3 { margin: 0 0 6px; font-size: 14px; color: var(--muted); }
    .card .value { font-size: 22px; font-weight: 600; }
    .card .value span { color: var(--muted); font-size: 14px; margin-left: 4px; }
    .section { margin-top: 28px; }
    .section h2 { margin-bottom: 12px; font-size: 20px; }
    .issue-grid { display: grid; gap: 12px; }
    .issue {
      background: var(--card-alt);
      border: 1px solid var(--border);
      border-radius: 12px;
      padding: 14px;
    }
    .issue h3 { margin: 0 0 6px; font-size: 16px; }
    .issue .meta-line { font-size: 13px; color: var(--muted); margin-bottom: 8px; }
    .pill {
      display: inline-flex;
      align-items: center;
      padding: 2px 8px;
      border-radius: 999px;
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      font-weight: 600;
      margin-right: 6px;
    }
    .pill.critical { background: rgba(239, 68, 68, 0.2); color: var(--critical); }
    .pill.warning { background: rgba(245, 158, 11, 0.2); color: var(--warning); }
    .pill.manual_review { background: rgba(139, 92, 246, 0.2); color: var(--manual); }
    .pill.info { background: rgba(34, 197, 94, 0.2); color: var(--info); }
    .pill.pass { background: rgba(34, 197, 94, 0.2); color: var(--info); }
    .pill.fail { background: rgba(239, 68, 68, 0.2); color: var(--critical); }
    .pill.manual { background: rgba(139, 92, 246, 0.2); color: var(--manual); }
    .pill.warn { background: rgba(245, 158, 11, 0.2); color: var(--warning); }
    .muted { color: var(--muted); }
    code, pre {
      background: #0d141c;
      border: 1px solid var(--border);
      padding: 6px 8px;
      border-radius: 8px;
      display: block;
      overflow-x: auto;
      font-size: 13px;
    }
    ul { padding-left: 18px; }
    a { color: #7dd3fc; text-decoration: none; }
    a:hover { text-decoration: underline; }
    footer { margin-top: 32px; font-size: 13px; color: var(--muted); }
    @media (max-width: 640px) {
      .title-row { flex-direction: column; align-items: flex-start; }
    }
  </style>
</head>
<body>
  <div class="container">
    <header>
      <div class="title-row">
        <h1>AppLaunchGuard</h1>
        <span class="badge ${escapeHtml(report.riskLevel)}">${escapeHtml(capitalize2(report.riskLevel))} risk</span>
      </div>
      <div class="meta">Scanned path: ${escapeHtml(report.projectRoot)}</div>
      <div class="meta">Scanned at: ${escapeHtml(report.scannedAt)}</div>
      <div class="meta">Risk score: ${escapeHtml(String(report.riskScore.score))}/100</div>
    </header>

    <section class="grid">
      ${summaryCards}
    </section>

    <section class="section">
      <h2>Risk explanation</h2>
      <p class="muted">${escapeHtml(report.metadata.disclaimer)}</p>
    </section>

    ${issueSections}

    <section class="section">
      <h2>Suggested next actions</h2>
      <ul>
        ${nextActions || '<li class="muted">No suggested actions.</li>'}
      </ul>
    </section>

    <section class="section">
      <h2>Checks overview</h2>
      <div class="issue-grid">
        ${checks}
      </div>
    </section>

    <section class="section">
      <h2>Project summary</h2>
      ${projectSummary}
    </section>

    <footer>
      <div>GitHub: <a href="https://github.com/momenbuilds/app-launch-guard">https://github.com/momenbuilds/app-launch-guard</a></div>
      <div>Star the project if it helped. Support: <a href="https://paypal.me/mxcenterprise">https://paypal.me/mxcenterprise</a></div>
      <div>${escapeHtml(report.metadata.disclaimer)}</div>
    </footer>
  </div>
</body>
</html>`;
}
function renderSummaryCard(label, value, suffix) {
  return `
    <div class="card">
      <h3>${escapeHtml(label)}</h3>
      <div class="value">${escapeHtml(value)}<span>${escapeHtml(suffix)}</span></div>
    </div>
  `;
}
function renderIssueSection(severity, issues) {
  const titles = {
    critical: "Critical",
    warning: "Warnings",
    manual_review: "Manual review",
    info: "Info"
  };
  const body = issues.length ? issues.map((issue) => renderIssueCard(issue)).join("") : `<div class="issue"><div class="muted">No ${escapeHtml(titles[severity]).toLowerCase()} issues found.</div></div>`;
  return `
    <section class="section">
      <h2>${escapeHtml(titles[severity])}</h2>
      <div class="issue-grid">
        ${body}
      </div>
    </section>
  `;
}
function renderIssueCard(issue) {
  const lines = [
    issue.filePath ? `<div class="meta-line"><strong>File:</strong> ${escapeHtml(issue.filePath)}</div>` : "",
    issue.evidence ? `<div class="meta-line"><strong>Evidence:</strong><code>${escapeHtml(issue.evidence)}</code></div>` : "",
    issue.suggestedFix ? `<div class="meta-line"><strong>Suggested fix:</strong> ${escapeHtml(issue.suggestedFix)}</div>` : "",
    issue.docsUrl ? renderDocsUrl(issue.docsUrl) : ""
  ].filter(Boolean);
  return `
    <div class="issue">
      <h3>${escapeHtml(issue.title)}</h3>
      <div class="meta-line">
        <span class="pill ${escapeHtml(issue.severity)}">${escapeHtml(formatSeverity(issue.severity))}</span>
        <span class="muted">${escapeHtml(issue.category)}</span>
      </div>
      <div>${escapeHtml(issue.description)}</div>
      ${lines.join("")}
    </div>
  `;
}
function renderDocsUrl(url) {
  const safe = sanitizeUrl(url);
  if (!safe) return "";
  return `<div class="meta-line"><strong>Docs:</strong> <a href="${escapeHtml(safe)}">${escapeHtml(safe)}</a></div>`;
}
function renderCheckRow(check) {
  const tone = check.status === "fail" ? "fail" : check.status === "warning" ? "warn" : check.status === "manual_review" ? "manual" : "pass";
  const label = check.status === "manual_review" ? "Manual review" : capitalize2(check.status);
  return `
    <div class="issue">
      <div class="meta-line">
        <span class="pill ${escapeHtml(tone)}">${escapeHtml(label)}</span>
        <strong>${escapeHtml(check.name)}</strong>
      </div>
    </div>
  `;
}
function renderProjectSummary(report) {
  const summary = report.projectSummary;
  return `
    <div class="issue">
      <div class="meta-line"><strong>Project root:</strong> ${escapeHtml(summary.projectRoot)}</div>
      <div class="meta-line"><strong>Confidence score:</strong> ${escapeHtml(String(summary.confidenceScore))}/100</div>
      <div class="meta-line"><strong>Info.plist files:</strong> ${renderList(summary.detectedPlistFiles)}</div>
      <div class="meta-line"><strong>Privacy manifests:</strong> ${renderList(summary.detectedPrivacyManifestFiles)}</div>
      <div class="meta-line"><strong>Swift files:</strong> ${escapeHtml(String(summary.detectedSwiftFilesCount))}</div>
      <div class="meta-line"><strong>Package managers:</strong> ${renderList(summary.detectedPackageManagers)}</div>
      <div class="meta-line"><strong>Detected SDKs:</strong> ${renderList(report.metadata.detectedSdks)}</div>
      <div class="meta-line"><strong>Detected product IDs:</strong> ${renderList(report.metadata.detectedProductIds)}</div>
      <div class="meta-line"><strong>Found URLs:</strong> ${renderList(report.metadata.foundUrls)}</div>
    </div>
  `;
}
function renderList(values) {
  if (!values || values.length === 0) return '<span class="muted">None</span>';
  return values.map((value) => `<span>${escapeHtml(value)}</span>`).join(", ");
}
function groupIssues(issues) {
  const grouped = /* @__PURE__ */ new Map();
  for (const severity of severityOrder) grouped.set(severity, []);
  for (const issue of issues) {
    grouped.get(issue.severity)?.push(issue);
  }
  return grouped;
}
function formatSeverity(severity) {
  if (severity === "manual_review") return "Manual review";
  return capitalize2(severity);
}
function escapeHtml(value) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}
function sanitizeUrl(url) {
  try {
    const parsed = new URL(url);
    if (parsed.protocol === "http:" || parsed.protocol === "https:") return parsed.toString();
    return null;
  } catch {
    return null;
  }
}
function capitalize2(value) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

// src/reporters/terminalReporter.ts
import kleur from "kleur";
function renderTerminalReport(report, options = {}) {
  const color = createColor(options.noColor);
  const lines = [];
  const ok = color.green("\u2713");
  const warn = color.yellow("!");
  const fail = color.red("\u2717");
  lines.push(color.bold("AppLaunchGuard"), "");
  lines.push(color.bold("Project"));
  lines.push(`${report.projectSummary.confidenceScore >= 40 ? ok : warn} ${report.projectSummary.confidenceScore > 0 ? "iOS project detected" : "iOS project not confidently detected"}`);
  lines.push(`Root: ${report.projectRoot}`);
  lines.push(`Confidence: ${report.projectSummary.confidenceScore}/100`);
  if (report.projectSummary.warnings.length > 0) {
    for (const warning of report.projectSummary.warnings) lines.push(`${warn} ${warning}`);
  }
  lines.push("", color.bold("Risk Summary"));
  lines.push(`Risk level: ${formatRiskLevel(report.riskLevel, color)}`);
  lines.push(`Risk score: ${report.riskScore.score}/100`);
  lines.push(`Critical: ${report.summary.critical}`);
  lines.push(`Warnings: ${report.summary.warnings}`);
  lines.push(`Manual review: ${report.summary.manualReview}`);
  appendIssueGroup(lines, "Critical Issues", report.issues.filter((issue) => issue.severity === "critical"), fail, color);
  appendIssueGroup(lines, "Warnings", report.issues.filter((issue) => issue.severity === "warning"), warn, color);
  appendIssueGroup(lines, "Manual Review", report.issues.filter((issue) => issue.severity === "manual_review"), warn, color);
  lines.push("", color.bold("Next Actions"));
  report.riskScore.suggestedNextActions.forEach((action, index) => {
    lines.push(`${index + 1}. ${action}`);
  });
  lines.push("", color.dim(report.metadata.disclaimer));
  return `${lines.join("\n")}
`;
}
function appendIssueGroup(lines, title, issues, icon, color) {
  if (issues.length === 0) return;
  lines.push("", color.bold(title));
  for (const issue of issues.slice(0, 10)) {
    lines.push(`${icon} ${issue.title}`);
    lines.push(`  ${issue.description}`);
    if (issue.filePath) lines.push(`  File: ${issue.filePath}`);
    if (issue.suggestedFix) lines.push(`  Suggested fix: ${issue.suggestedFix}`);
  }
}
function formatRiskLevel(level, color) {
  if (level === "high") return color.red("High");
  if (level === "medium") return color.yellow("Medium");
  return color.green("Low");
}
function createColor(noColor) {
  if (!noColor) return kleur;
  const plain = (value) => value;
  return {
    bold: plain,
    green: plain,
    yellow: plain,
    red: plain,
    dim: plain
  };
}

// src/scanner/scanProject.ts
import path6 from "path";

// src/utils/fileSystem.ts
import fs from "fs/promises";
import path from "path";
var includeAllIgnoredDirectories = [
  "node_modules",
  ".git",
  "DerivedData",
  "build",
  "dist",
  ".next",
  "coverage",
  "Carthage/Build",
  ".swiftpm",
  ".turbo"
];
var defaultIgnoredDirectories = [
  ...includeAllIgnoredDirectories,
  "Pods",
  ".claude",
  ".cursor",
  ".windsurf",
  ".openai",
  ".codex"
];
var defaultIgnoredGlobs = ["**/conversation.md", "**/transcripts/**", "**/logs/**", "**/*.log"];
var binaryExtensions = /* @__PURE__ */ new Set([
  ".png",
  ".jpg",
  ".jpeg",
  ".gif",
  ".webp",
  ".bmp",
  ".tiff",
  ".ico",
  ".icns",
  ".pdf",
  ".zip",
  ".gz",
  ".tar",
  ".tgz",
  ".rar",
  ".7z",
  ".mp3",
  ".mp4",
  ".mov",
  ".avi",
  ".mkv",
  ".wav",
  ".aiff",
  ".caf"
]);
function toPosixPath(filePath) {
  return filePath.split(path.sep).join("/");
}
function relativePath(root, filePath) {
  return toPosixPath(path.relative(root, filePath));
}
function isBinaryFile(filePath) {
  const lower = filePath.toLowerCase();
  for (const extension of binaryExtensions) {
    if (lower.endsWith(extension)) return true;
  }
  return false;
}
function isTextFile(filePath) {
  return !isBinaryFile(filePath);
}
async function readTextFile(filePath, maxBytes = 512e3) {
  try {
    const stat = await fs.stat(filePath);
    if (!stat.isFile() || stat.size > maxBytes) return null;
    return await fs.readFile(filePath, "utf8");
  } catch {
    return null;
  }
}
async function writeTextFile(filePath, contents) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, contents, "utf8");
}

// src/utils/glob.ts
import fg from "fast-glob";
import path2 from "path";
async function listProjectFiles(root, options = {}) {
  const directories = options.includeAll ? includeAllIgnoredDirectories : defaultIgnoredDirectories;
  const ignore = directories.map((directory) => `**/${directory}/**`);
  if (!options.includeAll) ignore.push(...defaultIgnoredGlobs);
  const entries = await fg(["**/*"], {
    cwd: root,
    absolute: true,
    dot: true,
    onlyFiles: true,
    followSymbolicLinks: false,
    ignore
  });
  return entries.map((entry) => path2.resolve(entry)).sort((a, b) => toPosixPath(a).localeCompare(toPosixPath(b)));
}

// src/utils/severity.ts
var severityRank = {
  critical: 4,
  warning: 3,
  manual_review: 2,
  info: 1
};
function sortIssues(issues) {
  return [...issues].sort((a, b) => severityRank[b.severity] - severityRank[a.severity]);
}

// src/utils/textSearch.ts
import path3 from "path";
async function searchFiles(root, files, patterns) {
  const matches = [];
  for (const file of files) {
    const text = await readTextFile(file);
    if (!text) continue;
    const lines = text.split(/\r?\n/);
    for (const pattern of patterns) {
      const foundLine = lines.find((line) => pattern.test(line));
      pattern.lastIndex = 0;
      if (foundLine) {
        matches.push({
          filePath: file,
          relativeFilePath: relativePath(root, file),
          pattern: pattern.source,
          line: foundLine.trim().slice(0, 180)
        });
      }
    }
  }
  return matches;
}
function extractUrls(text) {
  return [...text.matchAll(/https?:\/\/[^\s)"'>]+/g)].map((match) => match[0]).filter((url) => !url.includes("apple.com/DTDs/PropertyList"));
}
function maskSecret(value) {
  const compact = value.trim();
  if (compact.length <= 8) return "********";
  return `${compact.slice(0, 4)}...${compact.slice(-4)}`;
}
function looksLikeProductId(value) {
  return /^[a-zA-Z][a-zA-Z0-9-]*(\.[a-zA-Z0-9_-]+){2,}$/.test(value) && !value.includes("apple.com");
}
function quotedStrings(text) {
  return [...text.matchAll(/["']([^"'\n]{3,120})["']/g)].map((match) => match[1]);
}

// src/scanner/analyticsScanner.ts
var sdkRules = [
  { name: "FirebaseAnalytics", pattern: /FirebaseAnalytics|Analytics\.logEvent/i, risk: "analytics" },
  { name: "FirebaseCrashlytics", pattern: /FirebaseCrashlytics|Crashlytics/i, risk: "crash" },
  { name: "Firebase", pattern: /FirebaseApp|FirebaseCore/i, risk: "analytics" },
  { name: "Sentry", pattern: /SentrySDK|import Sentry/i, risk: "crash" },
  { name: "PostHog", pattern: /PostHog/i, risk: "analytics" },
  { name: "Amplitude", pattern: /Amplitude/i, risk: "analytics" },
  { name: "Mixpanel", pattern: /Mixpanel/i, risk: "analytics" },
  { name: "AppsFlyer", pattern: /AppsFlyer/i, risk: "attribution" },
  { name: "Adjust", pattern: /Adjust/i, risk: "attribution" },
  { name: "OneSignal", pattern: /OneSignal/i, risk: "analytics" },
  { name: "RevenueCat", pattern: /RevenueCat|Purchases/i, risk: "subscriptions" },
  { name: "Superwall", pattern: /Superwall/i, risk: "subscriptions" },
  { name: "AdMob", pattern: /AdMob|GoogleMobileAds/i, risk: "ads" },
  { name: "Meta/Facebook SDK", pattern: /FBSDK|FacebookCore|MetaAppEvents/i, risk: "ads" }
];
async function scanAnalyticsSdks(context) {
  const issues = [];
  const detected = /* @__PURE__ */ new Set();
  for (const sdk of sdkRules) {
    const matches = await searchFiles(context.root, context.sdkFiles, [sdk.pattern]);
    if (matches.length === 0 || detected.has(sdk.name)) continue;
    detected.add(sdk.name);
    const isHigherRisk = sdk.risk === "ads" || sdk.risk === "attribution";
    const isCrashOnly = sdk.risk === "crash";
    issues.push({
      id: `sdk.${sdk.name.toLowerCase().replace(/[^a-z0-9]+/g, "_")}`,
      title: `${sdk.name} detected`,
      severity: isHigherRisk ? "warning" : "manual_review",
      category: "SDK Privacy Review",
      description: isCrashOnly ? `${sdk.name} appears to be a crash reporting SDK. Crash reporting alone does not necessarily mean tracking, but privacy labels and data collection still need review.` : `${sdk.name} may affect privacy labels, tracking disclosures, or App Store Review questions depending on configuration.`,
      filePath: matches[0].relativeFilePath,
      evidence: matches[0].line,
      suggestedFix: isHigherRisk ? "Review ATT, privacy manifest, privacy labels, and SDK configuration for advertising or attribution behavior." : "Review what data this SDK collects and how it is disclosed in App Store Connect."
    });
  }
  return { issues, detectedSdks: [...detected].sort() };
}

// src/scanner/appStoreAssetsScanner.ts
import path4 from "path";

// src/utils/plist.ts
import plist from "plist";
async function parsePlistFile(filePath) {
  const raw = await readTextFile(filePath);
  if (!raw) return { data: null, raw, error: "File could not be read as text." };
  try {
    const parsed = plist.parse(raw);
    if (parsed && typeof parsed === "object") {
      return { data: parsed, raw };
    }
    return { data: null, raw, error: "Parsed plist was not an object." };
  } catch (error) {
    return { data: null, raw, error: error instanceof Error ? error.message : "Unknown plist parse error." };
  }
}

// src/scanner/appStoreAssetsScanner.ts
async function scanAppStoreAssets(context) {
  const issues = [];
  const relFiles = context.files.map((file) => relativePath(context.root, file));
  const hasAssetCatalog = relFiles.some((file) => file.includes(".xcassets/"));
  const appIcon = relFiles.find((file) => file.includes("AppIcon.appiconset/") && file.endsWith("Contents.json"));
  const hasLaunchScreen = relFiles.some((file) => /LaunchScreen\.(storyboard|swift|xib)$/i.test(path4.basename(file)));
  const fastlaneMetadata = relFiles.filter((file) => file.includes("fastlane/metadata/"));
  const fastlaneScreenshots = relFiles.filter((file) => file.includes("fastlane/screenshots/"));
  const screenshots = relFiles.filter((file) => /screenshots?/i.test(file) && /\.(png|jpg|jpeg)$/i.test(file));
  const privacyDetails = relFiles.filter((file) => /app_privacy_details/i.test(file));
  const deliverFiles = relFiles.filter((file) => /deliver/i.test(file));
  if (!hasAssetCatalog) {
    issues.push({
      id: "assets.xcassets_missing",
      title: "Asset catalog not found",
      severity: "warning",
      category: "App Store Assets",
      description: "No .xcassets folder was found. Confirm app icons and visual assets are configured for the App Store build."
    });
  }
  if (!appIcon) {
    issues.push({
      id: "assets.app_icon_missing",
      title: "App icon evidence not found",
      severity: "warning",
      category: "App Store Assets",
      description: "AppLaunchGuard did not find AppIcon.appiconset/Contents.json.",
      suggestedFix: "Confirm the app target has a complete AppIcon.appiconset."
    });
  } else {
    issues.push({
      id: "assets.app_icon_found",
      title: "App icon found",
      severity: "info",
      category: "App Store Assets",
      description: "AppIcon.appiconset was found.",
      filePath: appIcon
    });
  }
  if (!hasLaunchScreen) {
    issues.push({
      id: "assets.launch_screen_missing",
      title: "Launch screen evidence not found",
      severity: "manual_review",
      category: "App Store Assets",
      description: "No obvious launch screen file was found. This may be fine for some SwiftUI projects, but should be checked before submission."
    });
  }
  if (fastlaneMetadata.length === 0) {
    issues.push({
      id: "assets.fastlane_metadata_missing",
      title: "fastlane metadata not found",
      severity: "manual_review",
      category: "App Store Assets",
      description: "Static scanning cannot read App Store Connect. fastlane metadata is optional, but local metadata makes review text easier to audit."
    });
  }
  if (screenshots.length === 0 && fastlaneScreenshots.length === 0) {
    issues.push({
      id: "assets.screenshots_missing",
      title: "Screenshot evidence not found",
      severity: "manual_review",
      category: "App Store Assets",
      description: "No local screenshot folder or fastlane screenshots were found. Confirm iPhone screenshots are ready before submission.",
      suggestedFix: "Prepare accurate screenshots, including subscription/paywall screens when paid access exists."
    });
  }
  const supportsIpad = await inferIpadSupport(context);
  const hasIpadScreens = [...screenshots, ...fastlaneScreenshots].some((file) => /ipad|12\.9|13-inch|129/i.test(file));
  if (supportsIpad && !hasIpadScreens) {
    issues.push({
      id: "assets.ipad_screenshots_missing",
      title: "iPad support detected but no iPad screenshot folder found",
      severity: "warning",
      category: "App Store Assets",
      description: "UIDeviceFamily appears to include iPad, but no local iPad screenshot evidence was found.",
      suggestedFix: "Confirm 13-inch iPad screenshots are prepared if the app supports iPad."
    });
  }
  issues.push({
    id: "assets.submission_checklist",
    title: "App Store asset checklist needs manual review",
    severity: "manual_review",
    category: "App Store Assets",
    description: "Confirm iPhone screenshots, 13-inch iPad screenshots if supported, accurate subscription text, privacy policy URL, terms URL, and support URL.",
    evidence: privacyDetails.length > 0 || deliverFiles.length > 0 ? "fastlane privacy or deliver files found" : void 0
  });
  return issues;
}
async function inferIpadSupport(context) {
  for (const plistFile of context.plistFiles) {
    const parsed = await parsePlistFile(plistFile);
    const family = parsed.data?.UIDeviceFamily;
    if (Array.isArray(family) && family.map(String).includes("2")) return true;
    if (parsed.raw?.includes("<integer>2</integer>")) return true;
  }
  return false;
}

// src/scanner/attScanner.ts
async function scanAtt(context) {
  const issues = [];
  const attMatches = await searchFiles(context.root, context.swiftFiles, [
    /AppTrackingTransparency/i,
    /ATTrackingManager/i,
    /requestTrackingAuthorization/i,
    /trackingAuthorizationStatus/i,
    /AdSupport/i,
    /ASIdentifierManager/i,
    /advertisingIdentifier/i
  ]);
  let hasTrackingUsageDescription = false;
  let trackingDescriptionFile;
  for (const plistFile of context.plistFiles) {
    const parsed = await parsePlistFile(plistFile);
    if (parsed.data?.NSUserTrackingUsageDescription || parsed.raw?.includes("NSUserTrackingUsageDescription")) {
      hasTrackingUsageDescription = true;
      trackingDescriptionFile = relativePath(context.root, plistFile);
    }
  }
  if (attMatches.length > 0 && !hasTrackingUsageDescription) {
    issues.push({
      id: "att.missing_usage_description",
      title: "Missing NSUserTrackingUsageDescription",
      severity: "critical",
      category: "App Tracking Transparency",
      description: "AppTrackingTransparency usage was detected, but Info.plist does not include NSUserTrackingUsageDescription.",
      filePath: attMatches[0].relativeFilePath,
      evidence: attMatches[0].line,
      suggestedFix: "Add NSUserTrackingUsageDescription to Info.plist with a clear user-facing reason.",
      docsUrl: "https://developer.apple.com/documentation/apptrackingtransparency"
    });
  }
  if (hasTrackingUsageDescription && attMatches.length === 0) {
    issues.push({
      id: "att.description_without_code",
      title: "Tracking usage description found without ATT code",
      severity: "manual_review",
      category: "App Tracking Transparency",
      description: "NSUserTrackingUsageDescription exists, but AppLaunchGuard did not find ATT API usage. This can be intentional, but may cause App Store Review confusion if the app does not request tracking permission.",
      filePath: trackingDescriptionFile,
      suggestedFix: "Confirm whether the app tracks users across apps or websites and whether ATT is requested correctly."
    });
  }
  if (attMatches.length > 0) {
    issues.push({
      id: "att.manual_review",
      title: "Tracking behavior needs manual review",
      severity: "manual_review",
      category: "App Tracking Transparency",
      description: "Crash analytics or product analytics do not always require ATT unless used for tracking across apps or websites. Review SDK configuration and App Store Connect privacy answers.",
      filePath: attMatches[0].relativeFilePath
    });
  }
  return issues;
}

// src/scanner/metadataScanner.ts
var mentalHealthPatterns = [
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
  /journal/i
];
async function scanMetadata(context, hasSubscriptions) {
  const issues = [];
  const foundUrls = /* @__PURE__ */ new Set();
  let mentalHealthFile;
  let hasDisclaimerLanguage = false;
  let hasSubscriptionLanguage = false;
  const cachedText = /* @__PURE__ */ new Map();
  const metadataFiles = context.metadataFiles;
  const mentalHealthFiles = context.mentalHealthFiles;
  const readCached = async (file) => {
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
      id: "metadata.privacy_url_missing",
      title: "Privacy policy URL not found",
      severity: hasMetadataSignals ? "warning" : "manual_review",
      category: "Metadata",
      description: "No privacy policy URL was found in local metadata or docs.",
      suggestedFix: "Confirm the App Store listing includes a reachable privacy policy URL."
    });
  }
  if (!hasTerms) {
    issues.push({
      id: "metadata.terms_url_missing",
      title: "Terms URL not found",
      severity: "manual_review",
      category: "Metadata",
      description: "No terms URL was found in local metadata or docs.",
      suggestedFix: "Confirm the App Store listing includes terms, especially for subscriptions or paid access."
    });
  }
  if (!hasSupport) {
    issues.push({
      id: "metadata.support_url_missing",
      title: "Support URL not found",
      severity: "manual_review",
      category: "Metadata",
      description: "No support URL was found in local metadata or docs.",
      suggestedFix: "Confirm the App Store listing includes a reachable support URL."
    });
  }
  if (hasSubscriptions && !hasSubscriptionLanguage) {
    issues.push({
      id: "metadata.subscription_copy_missing",
      title: "Paid access detected without clear subscription language",
      severity: "warning",
      category: "Metadata",
      description: "Subscription or paywall code was detected, but local metadata does not clearly mention subscription terms or paid access.",
      suggestedFix: "Make App Store description, screenshots, and review notes clearly explain paid access and subscription terms."
    });
  }
  if (mentalHealthFile) {
    issues.push({
      id: "metadata.mental_health_manual_review",
      title: "Mental health or therapy-related language detected",
      severity: "manual_review",
      category: "Metadata",
      description: "Make sure app metadata does not claim to replace therapy, includes appropriate disclaimers, includes crisis or emergency guidance if relevant, and does not claim diagnosis or medical treatment unless properly supported.",
      filePath: mentalHealthFile,
      suggestedFix: "Review App Store metadata, onboarding, and screenshots for careful health-related wording."
    });
    if (!hasDisclaimerLanguage) {
      issues.push({
        id: "metadata.mental_health_disclaimer_missing",
        title: "Mental health disclaimer language not found",
        severity: "warning",
        category: "Metadata",
        description: "Mental health-related text was detected, but AppLaunchGuard did not find obvious disclaimer or emergency guidance language.",
        filePath: mentalHealthFile,
        suggestedFix: "Consider adding clear, appropriate support and emergency guidance where relevant."
      });
    }
  }
  return { issues, foundUrls: urls.sort(), mentalHealthDetected: Boolean(mentalHealthFile) };
}

// src/scanner/plistScanner.ts
var permissionRules = [
  {
    key: "NSCameraUsageDescription",
    title: "Missing camera usage description",
    patterns: [/AVCaptureDevice/i, /UIImagePickerController/i, /\bcamera\b/i],
    critical: true
  },
  {
    key: "NSMicrophoneUsageDescription",
    title: "Missing microphone usage description",
    patterns: [/AVAudioRecorder/i, /AVCaptureAudioDataOutput/i, /\bmicrophone\b/i],
    critical: true
  },
  {
    key: "NSSpeechRecognitionUsageDescription",
    title: "Missing speech recognition usage description",
    patterns: [/SFSpeechRecognizer/i, /Speech framework/i, /requestAuthorization/i],
    critical: true
  },
  {
    key: "NSPhotoLibraryUsageDescription",
    title: "Missing photo library usage description",
    patterns: [/PHPhotoLibrary/i, /PhotosUI/i, /PHPickerViewController/i, /photo library/i],
    critical: false
  },
  {
    key: "NSPhotoLibraryAddUsageDescription",
    title: "Missing photo library add usage description",
    patterns: [/UIImageWriteToSavedPhotosAlbum/i, /performChanges/i],
    critical: false
  },
  {
    key: "NSLocationWhenInUseUsageDescription",
    title: "Missing location usage description",
    patterns: [/CLLocationManager/i, /CoreLocation/i, /requestWhenInUseAuthorization/i],
    critical: true
  },
  {
    key: "NSLocationAlwaysAndWhenInUseUsageDescription",
    title: "Missing always-on location usage description",
    patterns: [/requestAlwaysAuthorization/i, /allowsBackgroundLocationUpdates/i],
    critical: true
  },
  { key: "NSFaceIDUsageDescription", title: "Missing Face ID usage description", patterns: [/LAContext/i, /biometry/i, /FaceID/i], critical: false },
  { key: "NSContactsUsageDescription", title: "Missing contacts usage description", patterns: [/CNContact/i, /Contacts/i], critical: true },
  { key: "NSCalendarsUsageDescription", title: "Missing calendars usage description", patterns: [/EventKit/i, /EKEvent/i], critical: false },
  { key: "NSRemindersUsageDescription", title: "Missing reminders usage description", patterns: [/EKReminder/i], critical: false },
  { key: "NSBluetoothAlwaysUsageDescription", title: "Missing Bluetooth usage description", patterns: [/CoreBluetooth/i, /CBCentralManager/i], critical: false },
  { key: "NSMotionUsageDescription", title: "Missing motion usage description", patterns: [/CoreMotion/i, /CMMotionManager/i], critical: false },
  { key: "NSHealthShareUsageDescription", title: "Missing Health share usage description", patterns: [/HealthKit/i, /HKHealthStore/i], critical: true },
  { key: "NSHealthUpdateUsageDescription", title: "Missing Health update usage description", patterns: [/HKSample/i, /saveObject/i], critical: false }
];
async function scanPlists(context) {
  const issues = [];
  const foundKeys = /* @__PURE__ */ new Map();
  for (const file of context.plistFiles) {
    const parsed = await parsePlistFile(file);
    const rel = relativePath(context.root, file);
    const raw = parsed.raw ?? "";
    for (const rule of permissionRules) {
      if (parsed.data?.[rule.key] || raw.includes(rule.key)) {
        foundKeys.set(rule.key, rel);
        issues.push({
          id: `plist.${rule.key}.found`,
          title: `${rule.key} found`,
          severity: "info",
          category: "Info.plist",
          description: `The app declares ${rule.key}. Review the wording to make sure it clearly explains the user-facing reason.`,
          filePath: rel
        });
      }
    }
    if (!parsed.data && parsed.error) {
      issues.push({
        id: "plist.parse_failed",
        title: "Info.plist could not be parsed",
        severity: "manual_review",
        category: "Info.plist",
        description: "AppLaunchGuard could not parse this plist, so it used safer text checks where possible.",
        filePath: rel,
        evidence: parsed.error
      });
    }
  }
  for (const rule of permissionRules) {
    if (foundKeys.has(rule.key)) continue;
    const matches = await searchFiles(context.root, context.swiftFiles, rule.patterns);
    if (matches.length === 0) continue;
    const first = matches[0];
    issues.push({
      id: `plist.${rule.key}.missing`,
      title: rule.title,
      severity: rule.critical ? "critical" : "warning",
      category: "Info.plist",
      description: `Code appears to use a capability that may require ${rule.key}, but the key was not found in Info.plist.`,
      filePath: first.relativeFilePath,
      evidence: first.line,
      suggestedFix: `Add ${rule.key} to Info.plist with a clear user-facing reason.`,
      docsUrl: "https://developer.apple.com/documentation/bundleresources/information-property-list"
    });
  }
  if (context.plistFiles.length === 0) {
    issues.push({
      id: "plist.missing_info_plist",
      title: "Info.plist not found",
      severity: "warning",
      category: "Info.plist",
      description: "No Info.plist file was found. Some modern projects generate one at build time, but App Store privacy permission keys still need manual review.",
      suggestedFix: "Confirm where Info.plist values are defined for the app target."
    });
  }
  return issues;
}

// src/scanner/privacyManifestScanner.ts
async function scanPrivacyManifest(context) {
  const issues = [];
  const riskySignals = await searchFiles(context.root, context.sdkFiles, [
    /FirebaseAnalytics/i,
    /Mixpanel/i,
    /Amplitude/i,
    /AppsFlyer/i,
    /Adjust/i,
    /advertisingIdentifier/i,
    /UserDefaults/i,
    /FileManager/i
  ]);
  if (context.privacyManifestFiles.length === 0) {
    issues.push({
      id: "privacy_manifest.missing",
      title: "PrivacyInfo.xcprivacy not found",
      severity: riskySignals.length > 0 ? "critical" : "warning",
      category: "Privacy Manifest",
      description: "Apple may require privacy manifests for certain data collection, SDKs, and accessed APIs. AppLaunchGuard cannot know the full App Store Connect privacy answers.",
      evidence: riskySignals[0]?.line,
      suggestedFix: "Add and manually review PrivacyInfo.xcprivacy for the app target and third-party SDK usage.",
      docsUrl: "https://developer.apple.com/documentation/bundleresources/privacy_manifest_files"
    });
    return issues;
  }
  for (const file of context.privacyManifestFiles) {
    const rel = relativePath(context.root, file);
    const parsed = await parsePlistFile(file);
    if (!parsed.data) {
      issues.push({
        id: "privacy_manifest.invalid",
        title: "Privacy manifest could not be parsed",
        severity: "warning",
        category: "Privacy Manifest",
        description: "PrivacyInfo.xcprivacy should be a valid plist/XML file.",
        filePath: rel,
        evidence: parsed.error
      });
      continue;
    }
    const required = ["NSPrivacyCollectedDataTypes", "NSPrivacyTracking", "NSPrivacyAccessedAPITypes"];
    for (const key of required) {
      if (!(key in parsed.data)) {
        issues.push({
          id: `privacy_manifest.${key}.missing`,
          title: `${key} missing from privacy manifest`,
          severity: "warning",
          category: "Privacy Manifest",
          description: `${key} was not found. Empty values can be valid, but missing fields should be manually reviewed against App Store Connect privacy labels.`,
          filePath: rel,
          suggestedFix: `Review whether ${key} should be included in PrivacyInfo.xcprivacy.`
        });
      }
    }
    if (parsed.data.NSPrivacyTracking === true && !("NSPrivacyTrackingDomains" in parsed.data)) {
      issues.push({
        id: "privacy_manifest.tracking_domains_missing",
        title: "Tracking enabled without tracking domains",
        severity: "warning",
        category: "Privacy Manifest",
        description: "NSPrivacyTracking is true, but NSPrivacyTrackingDomains was not found.",
        filePath: rel,
        suggestedFix: "Add NSPrivacyTrackingDomains or confirm that tracking is not enabled."
      });
    }
    for (const key of ["NSPrivacyCollectedDataTypes", "NSPrivacyAccessedAPITypes"]) {
      if (Array.isArray(parsed.data[key]) && parsed.data[key].length === 0) {
        issues.push({
          id: `privacy_manifest.${key}.empty`,
          title: `${key} is empty`,
          severity: "manual_review",
          category: "Privacy Manifest",
          description: "An empty array can be correct, but it needs manual review because the tool cannot infer every App Store Connect privacy answer.",
          filePath: rel
        });
      }
    }
    issues.push({
      id: "privacy_manifest.found",
      title: "PrivacyInfo.xcprivacy found",
      severity: "info",
      category: "Privacy Manifest",
      description: "A privacy manifest exists. Manually confirm it matches App Store Connect privacy labels and current Apple requirements.",
      filePath: rel
    });
  }
  return issues;
}

// src/scanner/projectDetection.ts
import path5 from "path";
function detectIosProject(root, files) {
  const rel = files.map((file) => relativePath(root, file));
  const detectedProjectFiles = rel.filter((file) => file.endsWith(".xcodeproj/project.pbxproj") || file.includes(".xcodeproj/"));
  const detectedWorkspaceFiles = rel.filter((file) => file.includes(".xcworkspace/"));
  const detectedPbxprojFiles = rel.filter((file) => file.endsWith("project.pbxproj"));
  const detectedPlistFiles = rel.filter((file) => file.endsWith("Info.plist"));
  const detectedPrivacyManifestFiles = rel.filter((file) => file.endsWith("PrivacyInfo.xcprivacy"));
  const swiftFiles = rel.filter((file) => file.endsWith(".swift"));
  const packageManagers = [];
  if (rel.some((file) => path5.basename(file) === "Package.swift")) packageManagers.push("Swift Package Manager");
  if (rel.some((file) => path5.basename(file) === "Podfile")) packageManagers.push("CocoaPods");
  if (rel.some((file) => path5.basename(file) === "Cartfile")) packageManagers.push("Carthage");
  let score = 0;
  if (detectedProjectFiles.length > 0) score += 30;
  if (detectedWorkspaceFiles.length > 0) score += 20;
  if (detectedPbxprojFiles.length > 0) score += 20;
  if (detectedPlistFiles.length > 0) score += 15;
  if (detectedPrivacyManifestFiles.length > 0) score += 10;
  if (swiftFiles.length > 0) score += Math.min(20, swiftFiles.length * 2);
  if (rel.some((file) => file.includes(".xcassets/"))) score += 10;
  if (rel.some((file) => file.endsWith(".storyboard"))) score += 8;
  if (rel.some((file) => file.endsWith(".entitlements"))) score += 8;
  if (packageManagers.length > 0) score += 8;
  const confidenceScore = Math.min(100, score);
  const warnings = [];
  if (confidenceScore === 0) {
    warnings.push("AppLaunchGuard could not confidently detect an iOS project in this folder.");
  } else if (confidenceScore < 40) {
    warnings.push("Only a few iOS project signals were found. The scan will continue, but results may be incomplete.");
  }
  return {
    projectRoot: root,
    confidenceScore,
    detectedProjectFiles,
    detectedWorkspaceFiles,
    detectedPbxprojFiles,
    detectedPlistFiles,
    detectedPrivacyManifestFiles,
    detectedSwiftFilesCount: swiftFiles.length,
    detectedPackageManagers: packageManagers,
    warnings
  };
}

// src/scanner/revenueCatScanner.ts
async function scanRevenueCat(context) {
  const issues = [];
  const productIds = /* @__PURE__ */ new Set();
  const entitlementIds = /* @__PURE__ */ new Set();
  const offeringIds = /* @__PURE__ */ new Set();
  let detectedRevenueCat = false;
  let detectedStoreKit = false;
  let firstSubscriptionFile;
  const subscriptionFiles = context.sdkFiles.filter((file) => !file.endsWith(".plist") && !file.endsWith(".xcprivacy"));
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
      if (/offering/i.test(value) || value === "default" || value === "current") offeringIds.add(value);
    }
    const keyMatch = text.match(/(appl_[A-Za-z0-9_]{8,}|rc_[A-Za-z0-9_]{8,})/);
    if (keyMatch) {
      issues.push({
        id: "revenuecat.public_key_found",
        title: "RevenueCat SDK key found",
        severity: "manual_review",
        category: "Subscriptions",
        description: "RevenueCat public SDK keys are commonly shipped in apps, but confirm this is not a private secret before publishing reports.",
        filePath: rel,
        evidence: maskSecret(keyMatch[1])
      });
    }
  }
  if ((detectedRevenueCat || detectedStoreKit) && productIds.size === 0) {
    issues.push({
      id: "subscriptions.product_ids_missing",
      title: "Subscription code detected but product IDs were not found",
      severity: "warning",
      category: "Subscriptions",
      description: "Paywall or subscription code appears to exist, but no obvious App Store product identifiers were found.",
      filePath: firstSubscriptionFile,
      suggestedFix: "Confirm product identifiers, subscription copy, pricing, and entitlement behavior before App Store submission."
    });
  }
  if (detectedRevenueCat && entitlementIds.size === 0) {
    issues.push({
      id: "revenuecat.entitlements_missing",
      title: "RevenueCat detected but entitlement identifiers were not found",
      severity: "warning",
      category: "Subscriptions",
      description: "RevenueCat projects usually rely on entitlements. Missing or unclear entitlement strings can make review and debugging harder.",
      filePath: firstSubscriptionFile,
      suggestedFix: "Confirm entitlement identifiers and paid access behavior are documented and tested."
    });
  }
  if (detectedRevenueCat || detectedStoreKit) {
    issues.push({
      id: "subscriptions.metadata_manual_review",
      title: "Subscription metadata needs manual review",
      severity: "manual_review",
      category: "Subscriptions",
      description: "If the app uses paid access, App Store text and screenshots should clearly explain subscription terms, gated features, and restoration behavior.",
      filePath: firstSubscriptionFile
    });
  }
  return {
    issues,
    detectedRevenueCat,
    detectedStoreKit,
    detectedProductIds: [...productIds].sort(),
    detectedEntitlementIds: [...entitlementIds].sort(),
    detectedOfferingIds: [...offeringIds].sort()
  };
}

// src/scanner/riskScore.ts
function calculateRiskScore(issues) {
  const criticalCount = issues.filter((issue) => issue.severity === "critical").length;
  const warningCount = issues.filter((issue) => issue.severity === "warning").length;
  const manualReviewCount = issues.filter((issue) => issue.severity === "manual_review").length;
  const infoCount = issues.filter((issue) => issue.severity === "info").length;
  const score = Math.min(100, criticalCount * 20 + warningCount * 8 + manualReviewCount * 2);
  const level = score <= 24 ? "low" : score <= 59 ? "medium" : "high";
  const topRisks = sortIssues(issues).filter((issue) => issue.severity !== "info").slice(0, 5);
  return {
    score,
    level,
    criticalCount,
    warningCount,
    manualReviewCount,
    infoCount,
    topRisks,
    suggestedNextActions: buildNextActions(topRisks)
  };
}
function buildNextActions(topRisks) {
  if (topRisks.length === 0) return ["Keep privacy labels, screenshots, and metadata reviewed before each App Store submission."];
  return topRisks.slice(0, 5).map((issue) => issue.suggestedFix ?? `Review: ${issue.title}`);
}

// src/scanner/securityScanner.ts
var secretRules = [
  { name: "OpenAI API key", pattern: /(OPENAI_API_KEY\s*[=:]\s*["']?)([A-Za-z0-9_-]{12,}|sk-[A-Za-z0-9_-]{16,})/i, severity: "critical" },
  { name: "Anthropic API key", pattern: /(ANTHROPIC_API_KEY\s*[=:]\s*["']?)([A-Za-z0-9_-]{12,})/i, severity: "critical" },
  { name: "Supabase service role key", pattern: /(SUPABASE_SERVICE_ROLE_KEY|service_role)\s*[=:]\s*["']?([A-Za-z0-9._-]{16,})/i, severity: "critical" },
  { name: "Private key", pattern: /(-----BEGIN [A-Z ]*PRIVATE KEY-----)/i, severity: "critical" },
  { name: "Bearer token", pattern: /(Bearer\s+)([A-Za-z0-9._-]{20,})/i, severity: "warning" },
  { name: "Generic API key", pattern: /((?:API_KEY|SECRET)\s*[=:]\s*["']?)([A-Za-z0-9._-]{12,})/i, severity: "warning" },
  { name: "Possible sk- token", pattern: /\b(sk-[A-Za-z0-9_-]{20,})\b/i, severity: "critical" }
];
async function scanSecurity(context) {
  const issues = [];
  for (const file of context.securityFiles) {
    const text = await readTextFile(file);
    if (!text) continue;
    const rel = relativePath(context.root, file);
    for (const rule of secretRules) {
      const match = text.match(rule.pattern);
      if (!match) continue;
      const secret = match[2] ?? match[1];
      issues.push({
        id: `security.${rule.name.toLowerCase().replace(/[^a-z0-9]+/g, "_")}`,
        title: `${rule.name} may be exposed`,
        severity: rule.severity,
        category: "Security",
        description: "A value that looks like a secret was found in source-controlled files. AppLaunchGuard masks secrets in reports, but the repository should be reviewed before publishing.",
        filePath: rel,
        evidence: maskSecret(secret),
        suggestedFix: "Move private secrets out of the app and rotate any key that may have been committed."
      });
    }
  }
  return dedupeSecurityIssues(issues);
}
function dedupeSecurityIssues(issues) {
  const seen = /* @__PURE__ */ new Set();
  return issues.filter((issue) => {
    const key = `${issue.filePath}:${issue.evidence}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

// src/scanner/scanProject.ts
async function scanProject(targetPath, options = {}) {
  const root = path6.resolve(targetPath);
  const files = await listProjectFiles(root, { includeAll: options.includeAll });
  const projectSummary = detectIosProject(root, files);
  const scope = buildScanScope(root, files, options);
  const context = {
    root,
    files,
    swiftFiles: scope.swiftFiles,
    plistFiles: scope.plistFiles,
    privacyManifestFiles: scope.privacyManifestFiles,
    sourceFiles: scope.sourceFiles,
    sdkFiles: scope.sdkFiles,
    securityFiles: scope.securityFiles,
    metadataFiles: scope.metadataFiles,
    mentalHealthFiles: scope.mentalHealthFiles,
    projectSummary
  };
  const issues = [];
  const checks = [];
  if (projectSummary.confidenceScore === 0) {
    issues.push({
      id: "project.not_detected",
      title: "iOS project was not confidently detected",
      severity: "critical",
      category: "Project Detection",
      description: "AppLaunchGuard could not confidently detect an iOS project in this folder. It looked for .xcodeproj, .xcworkspace, project.pbxproj, Info.plist, PrivacyInfo.xcprivacy, Package.swift, Podfile, Cartfile, fastlane, Swift files, entitlements, storyboards, and asset catalogs.",
      suggestedFix: "Run the scanner from the iOS project root or pass the path to the app project."
    });
  } else if (projectSummary.confidenceScore < 40) {
    issues.push({
      id: "project.low_confidence",
      title: "Low-confidence iOS project detection",
      severity: "manual_review",
      category: "Project Detection",
      description: projectSummary.warnings[0] ?? "Only a few iOS project signals were found.",
      suggestedFix: "Confirm the scan path points at the iOS project root."
    });
  } else {
    issues.push({
      id: "project.detected",
      title: "iOS project detected",
      severity: "info",
      category: "Project Detection",
      description: `Project confidence is ${projectSummary.confidenceScore}/100.`
    });
  }
  const revenueCat = await scanRevenueCat(context);
  const analytics = await scanAnalyticsSdks(context);
  const metadata = await scanMetadata(context, revenueCat.detectedRevenueCat || revenueCat.detectedStoreKit);
  issues.push(
    ...await scanPlists(context),
    ...await scanPrivacyManifest(context),
    ...await scanAtt(context),
    ...revenueCat.issues,
    ...analytics.issues,
    ...await scanAppStoreAssets(context),
    ...await scanSecurity(context),
    ...metadata.issues
  );
  checks.push(
    { name: "Project detection", status: projectSummary.confidenceScore >= 40 ? "pass" : projectSummary.confidenceScore > 0 ? "manual_review" : "fail", details: projectSummary },
    { name: "Info.plist permissions", status: statusForCategory(issues, "Info.plist") },
    { name: "Privacy manifest", status: statusForCategory(issues, "Privacy Manifest") },
    { name: "App Tracking Transparency", status: statusForCategory(issues, "App Tracking Transparency") },
    { name: "Subscriptions", status: statusForCategory(issues, "Subscriptions"), details: revenueCat },
    { name: "SDK privacy review", status: statusForCategory(issues, "SDK Privacy Review"), details: { detectedSdks: analytics.detectedSdks } },
    { name: "App Store assets", status: statusForCategory(issues, "App Store Assets") },
    { name: "Security", status: statusForCategory(issues, "Security") },
    { name: "Metadata", status: statusForCategory(issues, "Metadata"), details: { foundUrls: metadata.foundUrls, mentalHealthDetected: metadata.mentalHealthDetected } }
  );
  const sortedIssues = sortIssues(dedupeIssues(issues));
  const riskScore = calculateRiskScore(sortedIssues);
  return {
    toolName: "AppLaunchGuard",
    version: package_default.version,
    scannedAt: (/* @__PURE__ */ new Date()).toISOString(),
    projectRoot: root,
    projectSummary,
    riskScore,
    riskLevel: riskScore.level,
    summary: {
      critical: riskScore.criticalCount,
      warnings: riskScore.warningCount,
      manualReview: riskScore.manualReviewCount,
      info: riskScore.infoCount,
      totalIssues: sortedIssues.length
    },
    issues: sortedIssues,
    checks,
    metadata: {
      disclaimer: "AppLaunchGuard helps reduce review risk, but it does not guarantee App Store approval. Developers are responsible for reviewing Apple\u2019s latest guidelines, App Store Connect privacy answers, and legal requirements.",
      scannedFiles: files.length,
      detectedSdks: analytics.detectedSdks,
      detectedProductIds: revenueCat.detectedProductIds,
      foundUrls: metadata.foundUrls
    }
  };
}
function buildScanScope(root, files, options) {
  const swiftFiles = files.filter((file) => file.endsWith(".swift"));
  const plistFiles = files.filter((file) => file.endsWith("Info.plist"));
  const privacyManifestFiles = files.filter((file) => file.endsWith("PrivacyInfo.xcprivacy"));
  const sourceFiles = files.filter((file) => isSourceConfigFile(relativePath(root, file)));
  const metadataFiles = files.filter((file) => isMetadataFile(relativePath(root, file), Boolean(options.includeDocs)));
  const localizationFiles = files.filter((file) => isLocalizationFile(relativePath(root, file)));
  const allTextFiles = files.filter((file) => isTextFile(file));
  const sdkFiles = options.includeAll ? allTextFiles : sourceFiles;
  const securityFiles = options.includeAll ? allTextFiles : sourceFiles.filter((file) => !isTestFixtureFile(root, file));
  const mentalHealthFiles = options.includeAll ? allTextFiles : uniqueFiles([...swiftFiles, ...localizationFiles, ...metadataFiles]);
  return {
    swiftFiles,
    plistFiles,
    privacyManifestFiles,
    sourceFiles,
    sdkFiles,
    securityFiles,
    metadataFiles: options.includeAll ? allTextFiles : metadataFiles,
    mentalHealthFiles
  };
}
function isSourceConfigFile(relativeFile) {
  const lower = relativeFile.toLowerCase();
  const base = path6.basename(lower);
  const sourceExtensions = [
    ".swift",
    ".plist",
    ".xcprivacy",
    ".pbxproj",
    ".entitlements",
    ".storyboard",
    ".xib",
    ".xcconfig",
    ".strings",
    ".stringsdict",
    ".xcstrings"
  ];
  const sourceNames = /* @__PURE__ */ new Set(["podfile", "cartfile", "package.swift", "package.resolved"]);
  if (sourceNames.has(base)) return true;
  if (sourceExtensions.some((extension) => lower.endsWith(extension))) return true;
  return lower.includes(".xcassets/") && base === "contents.json";
}
function isMetadataFile(relativeFile, includeDocs) {
  const lower = relativeFile.toLowerCase();
  const base = path6.basename(lower);
  if (base === "readme.md") return true;
  if (/(^|\/)docs\//.test(lower)) return true;
  if (lower.includes("fastlane/metadata/")) return true;
  if (/(^|\/)(appstore|app-store|app_store)\//.test(lower)) return true;
  if (includeDocs && isDocFile(lower)) return true;
  return false;
}
function isLocalizationFile(relativeFile) {
  const lower = relativeFile.toLowerCase();
  return [".strings", ".stringsdict", ".xcstrings"].some((extension) => lower.endsWith(extension));
}
function isDocFile(relativeFile) {
  const lower = relativeFile.toLowerCase();
  return [".md", ".markdown", ".mdx", ".txt", ".rst", ".adoc"].some((extension) => lower.endsWith(extension));
}
function isTestFixtureFile(root, filePath) {
  const rel = relativePath(root, filePath);
  return rel.startsWith("test/fixtures/");
}
function uniqueFiles(files) {
  return [...new Set(files)];
}
function statusForCategory(issues, category) {
  const categoryIssues = issues.filter((issue) => issue.category === category);
  if (categoryIssues.some((issue) => issue.severity === "critical")) return "fail";
  if (categoryIssues.some((issue) => issue.severity === "warning")) return "warning";
  if (categoryIssues.some((issue) => issue.severity === "manual_review")) return "manual_review";
  return "pass";
}
function dedupeIssues(issues) {
  const seen = /* @__PURE__ */ new Set();
  return issues.filter((issue) => {
    const key = `${issue.id}:${issue.filePath ?? ""}:${issue.evidence ?? ""}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

// src/utils/openBrowser.ts
import { spawn } from "child_process";
async function openBrowser(target) {
  const platform = process.platform;
  const { command, args } = resolveOpenCommand(platform, target);
  await new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: "ignore", detached: true });
    child.on("error", reject);
    child.unref();
    resolve();
  });
}
function resolveOpenCommand(platform, target) {
  if (platform === "darwin") return { command: "open", args: [target] };
  if (platform === "win32") return { command: "cmd", args: ["/c", "start", "", target] };
  return { command: "xdg-open", args: [target] };
}

// src/utils/server.ts
import http from "http";
async function serveHtmlReport(html, port) {
  return await new Promise((resolve, reject) => {
    const server = http.createServer((request, response) => {
      if (request.method !== "GET" || request.url !== "/") {
        response.statusCode = 404;
        response.end("Not found");
        return;
      }
      response.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      response.end(html);
    });
    server.on("error", (error) => {
      if (error && typeof error === "object" && "code" in error && error.code === "EADDRINUSE") {
        reject(new Error(`Port ${port} is already in use. Try --port ${port + 1}.`));
        return;
      }
      reject(error);
    });
    server.listen(port, "127.0.0.1", () => {
      resolve({ server, url: `http://localhost:${port}` });
    });
  });
}

// src/cli.ts
async function runCli(argv = process.argv) {
  const program = new Command();
  program.name("app-launch-guard").description("Scan iOS apps for App Store submission review risks before review.").version(package_default.version);
  program.command("scan").description("Scan an iOS project for App Store submission risks.").argument("[path]", "Path to the iOS project", ".").option("--json", "Print a machine-readable JSON report").option("--markdown", "Print a Markdown report").option("--html", "Generate a self-contained HTML report").option("--output <file>", "Write the report to a file").option("--fail-on <level>", "Exit with code 1 on critical, warning, or none", "none").option("--no-color", "Disable colored terminal output").option("--serve", "Serve the HTML report locally").option("--open", "Open the HTML report in the browser").option("--port <number>", "Port for the local HTML report server", "4173").option("--include-docs", "Scan additional documentation files outside README, docs/, and fastlane metadata").option("--include-all", "Scan all text files except build outputs, node_modules, and .git").action(
    async (targetPath, options) => {
      try {
        const format = resolveOutputFormat(options);
        const port = resolvePort(options.port);
        validateHtmlOptions({ format, serve: options.serve, open: options.open, port: options.port });
        const report = await scanProject(targetPath, { includeDocs: options.includeDocs, includeAll: options.includeAll });
        const rendered = renderReport(report, format, { noColor: options.color === false });
        const outputPath = resolveOutputPath(format, options.output);
        if (outputPath) {
          await writeTextFile(outputPath, rendered);
          if (format !== "json") {
            process.stdout.write(`AppLaunchGuard report written to ${outputPath}
`);
          }
        } else {
          process.stdout.write(rendered);
        }
        if (format === "html" && options.serve) {
          const server = await serveHtmlReport(rendered, port);
          process.stdout.write(`AppLaunchGuard report available at ${server.url}
Press Ctrl+C to stop.
`);
          if (options.open) {
            await openBrowser(server.url).catch((error) => {
              process.stderr.write(`AppLaunchGuard could not open the browser: ${error instanceof Error ? error.message : String(error)}
`);
            });
          }
        } else if (format === "html" && options.open && outputPath) {
          await openBrowser(pathToFileURL(outputPath).toString()).catch((error) => {
            process.stderr.write(`AppLaunchGuard could not open the browser: ${error instanceof Error ? error.message : String(error)}
`);
          });
        }
        process.exitCode = shouldFail(report, options.failOn) ? 1 : 0;
      } catch (error) {
        process.stderr.write(`AppLaunchGuard scan failed: ${error instanceof Error ? error.message : String(error)}
`);
        process.exitCode = 1;
      }
    }
  );
  await program.parseAsync(argv);
}
function resolveOutputFormat(options) {
  const outputs = [options.json, options.markdown, options.html].filter(Boolean).length;
  if (outputs > 1) {
    throw new Error("Choose only one of --json, --markdown, or --html.");
  }
  if (options.json) return "json";
  if (options.markdown) return "markdown";
  if (options.html) return "html";
  if (options.output?.toLowerCase().endsWith(".json")) return "json";
  if (options.output?.toLowerCase().endsWith(".md")) return "markdown";
  if (options.output?.toLowerCase().endsWith(".html")) return "html";
  return "terminal";
}
function resolveOutputPath(format, output) {
  if (output) return path7.resolve(output);
  if (format === "html") return path7.resolve("app-launch-guard-report.html");
  return void 0;
}
function renderReport(report, format, options) {
  if (format === "json") return renderJsonReport(report);
  if (format === "markdown") return renderMarkdownReport(report);
  if (format === "html") return renderHtmlReport(report);
  return renderTerminalReport(report, options);
}
function resolvePort(port) {
  const parsed = Number(port);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`Invalid port: ${port}. Use a number like 4173.`);
  }
  return parsed;
}
function validateHtmlOptions(options) {
  if (options.format !== "html") {
    if (options.serve || options.open) {
      throw new Error("Use --html with --serve or --open.");
    }
    if (options.port && options.port !== "4173") {
      throw new Error("Use --port only with --html --serve.");
    }
    return;
  }
  if (options.port && !options.serve && options.port !== "4173") {
    throw new Error("Use --port only with --html --serve.");
  }
}
function shouldFail(report, failOn) {
  if (failOn === "critical") return report.summary.critical > 0;
  if (failOn === "warning") return report.summary.critical > 0 || report.summary.warnings > 0;
  if (failOn === "none") return false;
  return false;
}

// src/index.ts
await runCli();
//# sourceMappingURL=index.js.map