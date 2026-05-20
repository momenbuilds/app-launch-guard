import fs from 'node:fs/promises';
import path from 'node:path';

export const ignoredDirectories = [
  'node_modules',
  '.git',
  'DerivedData',
  'build',
  'dist',
  '.next',
  'coverage',
  'Pods',
  'Carthage/Build',
  '.swiftpm',
  '.turbo',
];

export function toPosixPath(filePath: string): string {
  return filePath.split(path.sep).join('/');
}

export function relativePath(root: string, filePath: string): string {
  return toPosixPath(path.relative(root, filePath));
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

export function shouldScanTextFile(filePath: string): boolean {
  const lower = filePath.toLowerCase();
  return [
    '.swift',
    '.plist',
    '.xcprivacy',
    '.pbxproj',
    'podfile',
    'cartfile',
    'package.swift',
    'package.resolved',
    '.md',
    '.txt',
    '.json',
    '.yml',
    '.yaml',
    '.entitlements',
    '.storyboard',
  ].some((suffix) => lower.endsWith(suffix) || lower.endsWith(`/${suffix}`));
}
