import type { CheckResult, Issue, ScanReport } from '../types.js';

const severityOrder: Array<Issue['severity']> = ['critical', 'warning', 'manual_review', 'info'];

export function renderHtmlReport(report: ScanReport): string {
  const grouped = groupIssues(report.issues);
  const summaryCards = [
    renderSummaryCard('Risk score', String(report.riskScore.score), `/${100}`),
    renderSummaryCard('Critical', String(report.summary.critical), ''),
    renderSummaryCard('Warnings', String(report.summary.warnings), ''),
    renderSummaryCard('Manual review', String(report.summary.manualReview), ''),
    renderSummaryCard('Info', String(report.summary.info), ''),
  ].join('');

  const issueSections = severityOrder.map((severity) => renderIssueSection(severity, grouped.get(severity) ?? [])).join('');
  const nextActions = report.riskScore.suggestedNextActions.map((action) => `<li>${escapeHtml(action)}</li>`).join('');
  const checks = report.checks.map((check) => renderCheckRow(check)).join('');

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
        <span class="badge ${escapeHtml(report.riskLevel)}">${escapeHtml(capitalize(report.riskLevel))} risk</span>
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

function renderSummaryCard(label: string, value: string, suffix: string): string {
  return `
    <div class="card">
      <h3>${escapeHtml(label)}</h3>
      <div class="value">${escapeHtml(value)}<span>${escapeHtml(suffix)}</span></div>
    </div>
  `;
}

function renderIssueSection(severity: Issue['severity'], issues: Issue[]): string {
  const titles: Record<Issue['severity'], string> = {
    critical: 'Critical',
    warning: 'Warnings',
    manual_review: 'Manual review',
    info: 'Info',
  };

  const body = issues.length
    ? issues.map((issue) => renderIssueCard(issue)).join('')
    : `<div class="issue"><div class="muted">No ${escapeHtml(titles[severity]).toLowerCase()} issues found.</div></div>`;

  return `
    <section class="section">
      <h2>${escapeHtml(titles[severity])}</h2>
      <div class="issue-grid">
        ${body}
      </div>
    </section>
  `;
}

function renderIssueCard(issue: Issue): string {
  const lines = [
    issue.filePath ? `<div class="meta-line"><strong>File:</strong> ${escapeHtml(issue.filePath)}</div>` : '',
    issue.evidence ? `<div class="meta-line"><strong>Evidence:</strong><code>${escapeHtml(issue.evidence)}</code></div>` : '',
    issue.suggestedFix ? `<div class="meta-line"><strong>Suggested fix:</strong> ${escapeHtml(issue.suggestedFix)}</div>` : '',
    issue.docsUrl ? renderDocsUrl(issue.docsUrl) : '',
  ].filter(Boolean);

  return `
    <div class="issue">
      <h3>${escapeHtml(issue.title)}</h3>
      <div class="meta-line">
        <span class="pill ${escapeHtml(issue.severity)}">${escapeHtml(formatSeverity(issue.severity))}</span>
        <span class="muted">${escapeHtml(issue.category)}</span>
      </div>
      <div>${escapeHtml(issue.description)}</div>
      ${lines.join('')}
    </div>
  `;
}

function renderDocsUrl(url: string): string {
  const safe = sanitizeUrl(url);
  if (!safe) return '';
  return `<div class="meta-line"><strong>Docs:</strong> <a href="${escapeHtml(safe)}">${escapeHtml(safe)}</a></div>`;
}

function renderCheckRow(check: CheckResult): string {
  const tone = check.status === 'fail' ? 'fail' : check.status === 'warning' ? 'warn' : check.status === 'manual_review' ? 'manual' : 'pass';
  const label = check.status === 'manual_review' ? 'Manual review' : capitalize(check.status);
  return `
    <div class="issue">
      <div class="meta-line">
        <span class="pill ${escapeHtml(tone)}">${escapeHtml(label)}</span>
        <strong>${escapeHtml(check.name)}</strong>
      </div>
    </div>
  `;
}

function renderProjectSummary(report: ScanReport): string {
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

function renderList(values: string[]): string {
  if (!values || values.length === 0) return '<span class="muted">None</span>';
  return values.map((value) => `<span>${escapeHtml(value)}</span>`).join(', ');
}

function groupIssues(issues: Issue[]): Map<Issue['severity'], Issue[]> {
  const grouped = new Map<Issue['severity'], Issue[]>();
  for (const severity of severityOrder) grouped.set(severity, []);
  for (const issue of issues) {
    grouped.get(issue.severity)?.push(issue);
  }
  return grouped;
}

function formatSeverity(severity: Issue['severity']): string {
  if (severity === 'manual_review') return 'Manual review';
  return capitalize(severity);
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function sanitizeUrl(url: string): string | null {
  try {
    const parsed = new URL(url);
    if (parsed.protocol === 'http:' || parsed.protocol === 'https:') return parsed.toString();
    return null;
  } catch {
    return null;
  }
}

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}
