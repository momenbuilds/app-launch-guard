import type { Issue, RiskLevel, RiskScore } from '../types.js';
import { sortIssues } from '../utils/severity.js';

export function calculateRiskScore(issues: Issue[]): RiskScore {
  const criticalCount = issues.filter((issue) => issue.severity === 'critical').length;
  const warningCount = issues.filter((issue) => issue.severity === 'warning').length;
  const manualReviewCount = issues.filter((issue) => issue.severity === 'manual_review').length;
  const infoCount = issues.filter((issue) => issue.severity === 'info').length;
  const score = Math.min(100, criticalCount * 20 + warningCount * 8 + manualReviewCount * 2);
  const level: RiskLevel = score <= 24 ? 'low' : score <= 59 ? 'medium' : 'high';
  const topRisks = sortIssues(issues).filter((issue) => issue.severity !== 'info').slice(0, 5);

  return {
    score,
    level,
    criticalCount,
    warningCount,
    manualReviewCount,
    infoCount,
    topRisks,
    suggestedNextActions: buildNextActions(topRisks),
  };
}

function buildNextActions(topRisks: Issue[]): string[] {
  if (topRisks.length === 0) return ['Keep privacy labels, screenshots, and metadata reviewed before each App Store submission.'];
  return topRisks.slice(0, 5).map((issue) => issue.suggestedFix ?? `Review: ${issue.title}`);
}
