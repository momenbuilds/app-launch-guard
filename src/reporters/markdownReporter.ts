import type { Issue, ScanReport, Severity } from '../types.js';

const labels: Record<Severity, string> = {
  critical: 'Critical',
  warning: 'Warning',
  manual_review: 'Manual review',
  info: 'Info',
};

export function renderMarkdownReport(report: ScanReport): string {
  const sections = [
    '# AppLaunchGuard Report',
    '',
    `Scanned path: \`${report.projectRoot}\``,
    `Scanned at: ${report.scannedAt}`,
    '',
    '## Risk Summary',
    '',
    '| Metric | Value |',
    '| --- | --- |',
    `| Risk level | ${capitalize(report.riskLevel)} |`,
    `| Risk score | ${report.riskScore.score}/100 |`,
    `| Critical | ${report.summary.critical} |`,
    `| Warnings | ${report.summary.warnings} |`,
    `| Manual review | ${report.summary.manualReview} |`,
    `| Info | ${report.summary.info} |`,
    '',
    issueSection('Critical Issues', report.issues.filter((issue) => issue.severity === 'critical')),
    issueSection('Warnings', report.issues.filter((issue) => issue.severity === 'warning')),
    issueSection('Manual Review Items', report.issues.filter((issue) => issue.severity === 'manual_review')),
    '## Suggested Next Actions',
    '',
    ...report.riskScore.suggestedNextActions.map((action, index) => `${index + 1}. ${action}`),
    '',
    '## Disclaimer',
    '',
    report.metadata.disclaimer,
    '',
  ];

  return sections.filter((section) => section !== undefined).join('\n');
}

function issueSection(title: string, issues: Issue[]): string {
  if (issues.length === 0) {
    return `## ${title}\n\nNone found.\n`;
  }

  return [
    `## ${title}`,
    '',
    ...issues.map((issue) => {
      const lines = [`### ${issue.title}`, '', `Severity: ${labels[issue.severity]}`, '', issue.description];
      if (issue.filePath) lines.push('', `File: \`${issue.filePath}\``);
      if (issue.evidence) lines.push('', `Evidence: \`${issue.evidence}\``);
      if (issue.suggestedFix) lines.push('', `Suggested fix: ${issue.suggestedFix}`);
      return lines.join('\n');
    }),
    '',
  ].join('\n');
}

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}
