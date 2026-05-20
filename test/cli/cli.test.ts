import { describe, expect, it } from 'vitest';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { runCli } from '../../src/cli.js';

describe('cli output modes', () => {
  it('rejects conflicting output modes', async () => {
    const previousExitCode = process.exitCode;
    process.exitCode = undefined;

    await runCli(['node', 'app-launch-guard', 'scan', '.', '--json', '--html']);

    expect(process.exitCode).toBe(1);
    process.exitCode = previousExitCode;
  });

  it('generates an HTML output file', async () => {
    const previousExitCode = process.exitCode;
    process.exitCode = undefined;
    const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'app-launch-guard-'));
    const output = path.join(directory, 'report.html');

    await runCli([
      'node',
      'app-launch-guard',
      'scan',
      path.resolve('test/fixtures/ios-basic'),
      '--html',
      '--output',
      output,
    ]);

    const html = await fs.readFile(output, 'utf8');
    expect(process.exitCode ?? 0).toBe(0);
    expect(html).toContain('<title>AppLaunchGuard Report</title>');
    expect(html).toContain('Risk score');

    process.exitCode = previousExitCode;
    await fs.rm(directory, { recursive: true, force: true });
  });
});
