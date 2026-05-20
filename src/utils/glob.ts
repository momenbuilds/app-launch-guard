import fg from 'fast-glob';
import path from 'node:path';
import { defaultIgnoredDirectories, defaultIgnoredGlobs, includeAllIgnoredDirectories, toPosixPath } from './fileSystem.js';

export interface FileListOptions {
  includeAll?: boolean;
}

export async function listProjectFiles(root: string, options: FileListOptions = {}): Promise<string[]> {
  const directories = options.includeAll ? includeAllIgnoredDirectories : defaultIgnoredDirectories;
  const ignore = directories.map((directory) => `**/${directory}/**`);
  if (!options.includeAll) ignore.push(...defaultIgnoredGlobs);

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
