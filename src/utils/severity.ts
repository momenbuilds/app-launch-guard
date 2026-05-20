import type { Issue, Severity } from '../types.js';

export const severityRank: Record<Severity, number> = {
  critical: 4,
  warning: 3,
  manual_review: 2,
  info: 1,
};

export function sortIssues(issues: Issue[]): Issue[] {
  return [...issues].sort((a, b) => severityRank[b.severity] - severityRank[a.severity]);
}
