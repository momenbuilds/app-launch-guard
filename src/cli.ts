import { Command } from 'commander';
import fs from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import pkg from '../package.json' assert { type: 'json' };
import { renderJsonReport } from './reporters/jsonReporter.js';
import { renderMarkdownReport } from './reporters/markdownReporter.js';
import { renderHtmlReport } from './reporters/htmlReporter.js';
import { renderTerminalReport } from './reporters/terminalReporter.js';
import { scanProject } from './scanner/scanProject.js';
import type { ScanReport } from './types.js';
import { writeTextFile } from './utils/fileSystem.js';
import { openBrowser } from './utils/openBrowser.js';
import { serveHtmlReport } from './utils/server.js';

type OutputFormat = 'terminal' | 'json' | 'markdown' | 'html';
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
    .option('--html', 'Generate a self-contained HTML report')
    .option('--output <file>', 'Write the report to a file')
    .option('--fail-on <level>', 'Exit with code 1 on critical, warning, or none', 'none')
    .option('--no-color', 'Disable colored terminal output')
    .option('--serve', 'Serve the HTML report locally')
    .option('--open', 'Open the HTML report in the browser')
    .option('--port <number>', 'Port for the local HTML report server', '4173')
    .option('--include-docs', 'Scan additional documentation files outside README, docs/, and fastlane metadata')
    .option('--include-all', 'Scan all text files except build outputs, node_modules, and .git')
    .action(
      async (
        targetPath: string,
        options: {
          json?: boolean;
          markdown?: boolean;
          html?: boolean;
          output?: string;
          failOn: FailOn;
          color: boolean;
          serve?: boolean;
          open?: boolean;
          port: string;
          includeDocs?: boolean;
          includeAll?: boolean;
        }
      ) => {
      try {
        const format = resolveOutputFormat(options);
        const port = resolvePort(options.port);
        validateHtmlOptions({ format, serve: options.serve, open: options.open, port: options.port });

        const report = await scanProject(targetPath, { includeDocs: options.includeDocs, includeAll: options.includeAll });
        const rendered = renderReport(report, format, { noColor: options.color === false });
        const outputPath = resolveOutputPath(format, options.output);

        if (outputPath) {
          await writeTextFile(outputPath, rendered);
          if (format !== 'json') {
            process.stdout.write(`AppLaunchGuard report written to ${outputPath}\n`);
          }
        } else {
          process.stdout.write(rendered);
        }

        if (format === 'html' && options.serve) {
          const server = await serveHtmlReport(rendered, port);
          process.stdout.write(`AppLaunchGuard report available at ${server.url}\nPress Ctrl+C to stop.\n`);
          if (options.open) {
            await openBrowser(server.url).catch((error) => {
              process.stderr.write(`AppLaunchGuard could not open the browser: ${error instanceof Error ? error.message : String(error)}\n`);
            });
          }
        } else if (format === 'html' && options.open && outputPath) {
          await openBrowser(pathToFileURL(outputPath).toString()).catch((error) => {
            process.stderr.write(`AppLaunchGuard could not open the browser: ${error instanceof Error ? error.message : String(error)}\n`);
          });
        }

        process.exitCode = shouldFail(report, options.failOn) ? 1 : 0;
      } catch (error) {
        process.stderr.write(`AppLaunchGuard scan failed: ${error instanceof Error ? error.message : String(error)}\n`);
        process.exitCode = 1;
      }
      }
    );

  await program.parseAsync(argv);
}

function resolveOutputFormat(options: { json?: boolean; markdown?: boolean; html?: boolean; output?: string }): OutputFormat {
  const outputs = [options.json, options.markdown, options.html].filter(Boolean).length;
  if (outputs > 1) {
    throw new Error('Choose only one of --json, --markdown, or --html.');
  }
  if (options.json) return 'json';
  if (options.markdown) return 'markdown';
  if (options.html) return 'html';
  if (options.output?.toLowerCase().endsWith('.json')) return 'json';
  if (options.output?.toLowerCase().endsWith('.md')) return 'markdown';
  if (options.output?.toLowerCase().endsWith('.html')) return 'html';
  return 'terminal';
}

function resolveOutputPath(format: OutputFormat, output?: string): string | undefined {
  if (output) return path.resolve(output);
  if (format === 'html') return path.resolve('app-launch-guard-report.html');
  return undefined;
}

function renderReport(report: ScanReport, format: OutputFormat, options: { noColor?: boolean }): string {
  if (format === 'json') return renderJsonReport(report);
  if (format === 'markdown') return renderMarkdownReport(report);
  if (format === 'html') return renderHtmlReport(report);
  return renderTerminalReport(report, options);
}

function resolvePort(port: string): number {
  const parsed = Number(port);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`Invalid port: ${port}. Use a number like 4173.`);
  }
  return parsed;
}

function validateHtmlOptions(options: { format: OutputFormat; serve?: boolean; open?: boolean; port?: string }): void {
  if (options.format !== 'html') {
    if (options.serve || options.open) {
      throw new Error('Use --html with --serve or --open.');
    }
    if (options.port && options.port !== '4173') {
      throw new Error('Use --port only with --html --serve.');
    }
    return;
  }

  if (options.port && !options.serve && options.port !== '4173') {
    throw new Error('Use --port only with --html --serve.');
  }
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
