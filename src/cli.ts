import { Command } from 'commander';
import fs from 'node:fs/promises';
import path from 'node:path';
import pkg from '../package.json' assert { type: 'json' };
import { renderJsonReport } from './reporters/jsonReporter.js';
import { renderMarkdownReport } from './reporters/markdownReporter.js';
import { renderTerminalReport } from './reporters/terminalReporter.js';
import { scanProject } from './scanner/scanProject.js';
import type { ScanReport } from './types.js';
import { writeTextFile } from './utils/fileSystem.js';

type OutputFormat = 'terminal' | 'json' | 'markdown';
type FailOn = 'none' | 'critical' | 'warning';

export async function runCli(argv = process.argv): Promise<void> {
  const program = new Command();

  program
    .name('app-launch-guard')
    .description('Scan iOS apps for App Store submission review risks before review.')
    .version(pkg.version);

  program
    .command('scan')
    .description('Scan an iOS project for App Store submission risks.')
    .argument('[path]', 'Path to the iOS project', '.')
    .option('--json', 'Print a machine-readable JSON report')
    .option('--markdown', 'Print a Markdown report')
    .option('--output <file>', 'Write the report to a file')
    .option('--fail-on <level>', 'Exit with code 1 on critical, warning, or none', 'none')
    .option('--no-color', 'Disable colored terminal output')
    .action(async (targetPath: string, options: { json?: boolean; markdown?: boolean; output?: string; failOn: FailOn; color: boolean }) => {
      try {
        const report = await scanProject(targetPath);
        const format = resolveOutputFormat(options);
        const rendered = renderReport(report, format, { noColor: options.color === false });

        if (options.output) {
          await writeTextFile(path.resolve(options.output), rendered);
          if (!options.json) {
            process.stdout.write(`AppLaunchGuard report written to ${options.output}\n`);
          }
        } else {
          process.stdout.write(rendered);
        }

        process.exitCode = shouldFail(report, options.failOn) ? 1 : 0;
      } catch (error) {
        process.stderr.write(`AppLaunchGuard scan failed: ${error instanceof Error ? error.message : String(error)}\n`);
        process.exitCode = 1;
      }
    });

  await program.parseAsync(argv);
}

function resolveOutputFormat(options: { json?: boolean; markdown?: boolean; output?: string }): OutputFormat {
  if (options.json) return 'json';
  if (options.markdown) return 'markdown';
  if (options.output?.toLowerCase().endsWith('.json')) return 'json';
  if (options.output?.toLowerCase().endsWith('.md')) return 'markdown';
  return 'terminal';
}

function renderReport(report: ScanReport, format: OutputFormat, options: { noColor?: boolean }): string {
  if (format === 'json') return renderJsonReport(report);
  if (format === 'markdown') return renderMarkdownReport(report);
  return renderTerminalReport(report, options);
}

function shouldFail(report: ScanReport, failOn: FailOn): boolean {
  if (failOn === 'critical') return report.summary.critical > 0;
  if (failOn === 'warning') return report.summary.critical > 0 || report.summary.warnings > 0;
  if (failOn === 'none') return false;
  return false;
}

export async function pathExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}
