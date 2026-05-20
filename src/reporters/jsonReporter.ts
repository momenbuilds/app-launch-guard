import type { ScanReport } from '../types.js';

export function renderJsonReport(report: ScanReport): string {
  return `${JSON.stringify(report, null, 2)}\n`;
}
