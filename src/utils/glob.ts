import fg from 'fast-glob';
import path from 'node:path';
import { ignoredDirectories, toPosixPath } from './fileSystem.js';

export async function listProjectFiles(root: string): Promise<string[]> {
  const ignore = ignoredDirectories.map((directory) => `**/${directory}/**`);
  const entries = await fg(['**/*'], {
    cwd: root,
    absolute: true,
    dot: true,
    onlyFiles: true,
    followSymbolicLinks: false,
    ignore,
  });

  return entries.map((entry) => path.resolve(entry)).sort((a, b) => toPosixPath(a).localeCompare(toPosixPath(b)));
}
