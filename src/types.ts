export type Severity = 'info' | 'manual_review' | 'warning' | 'critical';

export type RiskLevel = 'low' | 'medium' | 'high';

export interface Issue {
  id: string;
  title: string;
  severity: Severity;
  category: string;
  description: string;
  filePath?: string;
  evidence?: string;
  suggestedFix?: string;
  docsUrl?: string;
}

export interface ProjectSummary {
  projectRoot: string;
  confidenceScore: number;
  detectedProjectFiles: string[];
  detectedWorkspaceFiles: string[];
  detectedPbxprojFiles: string[];
  detectedPlistFiles: string[];
  detectedPrivacyManifestFiles: string[];
  detectedSwiftFilesCount: number;
  detectedPackageManagers: string[];
  warnings: string[];
}

export interface RiskScore {
  score: number;
  level: RiskLevel;
  criticalCount: number;
  warningCount: number;
  manualReviewCount: number;
  infoCount: number;
  topRisks: Issue[];
  suggestedNextActions: string[];
}

export interface CheckResult {
  name: string;
  status: 'pass' | 'warning' | 'manual_review' | 'fail';
  details?: Record<string, unknown>;
}

export interface ScanReport {
  toolName: 'AppLaunchGuard';
  version: string;
  scannedAt: string;
  projectRoot: string;
  projectSummary: ProjectSummary;
  riskScore: RiskScore;
  riskLevel: RiskLevel;
  summary: {
    critical: number;
    warnings: number;
    manualReview: number;
    info: number;
    totalIssues: number;
  };
  issues: Issue[];
  checks: CheckResult[];
  metadata: {
    disclaimer: string;
    scannedFiles: number;
    detectedSdks: string[];
    detectedProductIds: string[];
    foundUrls: string[];
  };
}

export interface ScanContext {
  root: string;
  files: string[];
  swiftFiles: string[];
  plistFiles: string[];
  privacyManifestFiles: string[];
  textFiles: string[];
  projectSummary: ProjectSummary;
}

export interface ScanOptions {
  noColor?: boolean;
}
