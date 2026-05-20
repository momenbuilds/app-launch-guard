import path from 'node:path';
import { readTextFile, relativePath } from './fileSystem.js';

export interface TextMatch {
  filePath: string;
  relativeFilePath: string;
  pattern: string;
  line?: string;
}

export async function searchFiles(root: string, files: string[], patterns: RegExp[]): Promise<TextMatch[]> {
  const matches: TextMatch[] = [];

  for (const file of files) {
    const text = await readTextFile(file);
    if (!text) continue;
    const lines = text.split(/\r?\n/);
    for (const pattern of patterns) {
      const foundLine = lines.find((line) => pattern.test(line));
      pattern.lastIndex = 0;
      if (foundLine) {
        matches.push({
          filePath: file,
          relativeFilePath: relativePath(root, file),
          pattern: pattern.source,
          line: foundLine.trim().slice(0, 180),
        });
      }
    }
  }

  return matches;
}

export function extractUrls(text: string): string[] {
  return [...text.matchAll(/https?:\/\/[^\s)"'>]+/g)]
    .map((match) => match[0])
    .filter((url) => !url.includes('apple.com/DTDs/PropertyList'));
}

export function maskSecret(value: string): string {
  const compact = value.trim();
  if (compact.length <= 8) return '********';
  return `${compact.slice(0, 4)}...${compact.slice(-4)}`;
}

export function looksLikeProductId(value: string): boolean {
  return /^[a-zA-Z][a-zA-Z0-9-]*(\.[a-zA-Z0-9_-]+){2,}$/.test(value) && !value.includes('apple.com');
}

export function quotedStrings(text: string): string[] {
  return [...text.matchAll(/["']([^"'\n]{3,120})["']/g)].map((match) => match[1]);
}

export function fileBaseName(filePath: string): string {
  return path.basename(filePath).toLowerCase();
}
