import fs from 'node:fs/promises';
import path from 'node:path';

export const includeAllIgnoredDirectories = [
  'node_modules',
  '.git',
  'DerivedData',
  'build',
  'dist',
  '.next',
  'coverage',
  'Carthage/Build',
  '.swiftpm',
  '.turbo',
];

export const defaultIgnoredDirectories = [
  ...includeAllIgnoredDirectories,
  'Pods',
  '.claude',
  '.cursor',
  '.windsurf',
  '.openai',
  '.codex',
];

export const defaultIgnoredGlobs = ['**/conversation.md', '**/transcripts/**', '**/logs/**', '**/*.log'];

const binaryExtensions = new Set([
  '.png',
  '.jpg',
  '.jpeg',
  '.gif',
  '.webp',
  '.bmp',
  '.tiff',
  '.ico',
  '.icns',
  '.pdf',
  '.zip',
  '.gz',
  '.tar',
  '.tgz',
  '.rar',
  '.7z',
  '.mp3',
  '.mp4',
  '.mov',
  '.avi',
  '.mkv',
  '.wav',
  '.aiff',
  '.caf',
]);

export function toPosixPath(filePath: string): string {
  return filePath.split(path.sep).join('/');
}

export function relativePath(root: string, filePath: string): string {
  return toPosixPath(path.relative(root, filePath));
}

export function isBinaryFile(filePath: string): boolean {
  const lower = filePath.toLowerCase();
  for (const extension of binaryExtensions) {
    if (lower.endsWith(extension)) return true;
  }
  return false;
}

export function isTextFile(filePath: string): boolean {
  return !isBinaryFile(filePath);
}

export async function readTextFile(filePath: string, maxBytes = 512_000): Promise<string | null> {
  try {
    const stat = await fs.stat(filePath);
    if (!stat.isFile() || stat.size > maxBytes) return null;
    return await fs.readFile(filePath, 'utf8');
  } catch {
    return null;
  }
}

export async function writeTextFile(filePath: string, contents: string): Promise<void> {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, contents, 'utf8');
}

