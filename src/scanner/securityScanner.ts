import type { Issue, ScanContext } from '../types.js';
import { readTextFile, relativePath } from '../utils/fileSystem.js';
import { maskSecret } from '../utils/textSearch.js';

const secretRules = [
  { name: 'OpenAI API key', pattern: /(OPENAI_API_KEY\s*[=:]\s*["']?)([A-Za-z0-9_-]{12,}|sk-[A-Za-z0-9_-]{16,})/i, severity: 'critical' as const },
  { name: 'Anthropic API key', pattern: /(ANTHROPIC_API_KEY\s*[=:]\s*["']?)([A-Za-z0-9_-]{12,})/i, severity: 'critical' as const },
  { name: 'Supabase service role key', pattern: /(SUPABASE_SERVICE_ROLE_KEY|service_role)\s*[=:]\s*["']?([A-Za-z0-9._-]{16,})/i, severity: 'critical' as const },
  { name: 'Private key', pattern: /(-----BEGIN [A-Z ]*PRIVATE KEY-----)/i, severity: 'critical' as const },
  { name: 'Bearer token', pattern: /(Bearer\s+)([A-Za-z0-9._-]{20,})/i, severity: 'warning' as const },
  { name: 'Generic API key', pattern: /((?:API_KEY|SECRET)\s*[=:]\s*["']?)([A-Za-z0-9._-]{12,})/i, severity: 'warning' as const },
  { name: 'Possible sk- token', pattern: /\b(sk-[A-Za-z0-9_-]{20,})\b/i, severity: 'critical' as const },
];

export async function scanSecurity(context: ScanContext): Promise<Issue[]> {
  const issues: Issue[] = [];

  for (const file of context.textFiles) {
    const text = await readTextFile(file);
    if (!text) continue;
    const rel = relativePath(context.root, file);
    for (const rule of secretRules) {
      const match = text.match(rule.pattern);
      if (!match) continue;
      const secret = match[2] ?? match[1];
      issues.push({
        id: `security.${rule.name.toLowerCase().replace(/[^a-z0-9]+/g, '_')}`,
        title: `${rule.name} may be exposed`,
        severity: rule.severity,
        category: 'Security',
        description: 'A value that looks like a secret was found in source-controlled files. AppLaunchGuard masks secrets in reports, but the repository should be reviewed before publishing.',
        filePath: rel,
        evidence: maskSecret(secret),
        suggestedFix: 'Move private secrets out of the app and rotate any key that may have been committed.',
      });
    }
  }

  return dedupeSecurityIssues(issues);
}

function dedupeSecurityIssues(issues: Issue[]): Issue[] {
  const seen = new Set<string>();
  return issues.filter((issue) => {
    const key = `${issue.filePath}:${issue.evidence}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
