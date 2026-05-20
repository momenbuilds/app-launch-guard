import kleur from 'kleur';
import type { Issue, ScanReport } from '../types.js';

export function renderTerminalReport(report: ScanReport, options: { noColor?: boolean } = {}): string {
  const color = createColor(options.noColor);
  const lines: string[] = [];
  const ok = color.green('✓');
  const warn = color.yellow('!');
  const fail = color.red('✗');

  lines.push(color.bold('AppLaunchGuard'), '');
  lines.push(color.bold('Project'));
  lines.push(`${report.projectSummary.confidenceScore >= 40 ? ok : warn} ${report.projectSummary.confidenceScore > 0 ? 'iOS project detected' : 'iOS project not confidently detected'}`);
  lines.push(`Root: ${report.projectRoot}`);
  lines.push(`Confidence: ${report.projectSummary.confidenceScore}/100`);
  if (report.projectSummary.warnings.length > 0) {
    for (const warning of report.projectSummary.warnings) lines.push(`${warn} ${warning}`);
  }

  lines.push('', color.bold('Risk Summary'));
  lines.push(`Risk level: ${formatRiskLevel(report.riskLevel, color)}`);
  lines.push(`Risk score: ${report.riskScore.score}/100`);
  lines.push(`Critical: ${report.summary.critical}`);
  lines.push(`Warnings: ${report.summary.warnings}`);
  lines.push(`Manual review: ${report.summary.manualReview}`);

  appendIssueGroup(lines, 'Critical Issues', report.issues.filter((issue) => issue.severity === 'critical'), fail, color);
  appendIssueGroup(lines, 'Warnings', report.issues.filter((issue) => issue.severity === 'warning'), warn, color);
  appendIssueGroup(lines, 'Manual Review', report.issues.filter((issue) => issue.severity === 'manual_review'), warn, color);

  lines.push('', color.bold('Next Actions'));
  report.riskScore.suggestedNextActions.forEach((action, index) => {
    lines.push(`${index + 1}. ${action}`);
  });

  lines.push('', color.dim(report.metadata.disclaimer));
  return `${lines.join('\n')}\n`;
}

function appendIssueGroup(lines: string[], title: string, issues: Issue[], icon: string, color: Colorizer): void {
  if (issues.length === 0) return;
  lines.push('', color.bold(title));
  for (const issue of issues.slice(0, 10)) {
    lines.push(`${icon} ${issue.title}`);
    lines.push(`  ${issue.description}`);
    if (issue.filePath) lines.push(`  File: ${issue.filePath}`);
    if (issue.suggestedFix) lines.push(`  Suggested fix: ${issue.suggestedFix}`);
  }
}

function formatRiskLevel(level: string, color: Colorizer): string {
  if (level === 'high') return color.red('High');
  if (level === 'medium') return color.yellow('Medium');
  return color.green('Low');
}

interface Colorizer {
  bold(value: string): string;
  green(value: string): string;
  yellow(value: string): string;
  red(value: string): string;
  dim(value: string): string;
}

function createColor(noColor?: boolean): Colorizer {
  if (!noColor) return kleur;
  const plain = (value: string) => value;
  return {
    bold: plain,
    green: plain,
    yellow: plain,
    red: plain,
    dim: plain,
  };
}
