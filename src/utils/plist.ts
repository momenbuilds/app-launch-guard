import plist from 'plist';
import { readTextFile } from './fileSystem.js';

export type ParsedPlist = Record<string, any>;

export async function parsePlistFile(filePath: string): Promise<{ data: ParsedPlist | null; raw: string | null; error?: string }> {
  const raw = await readTextFile(filePath);
  if (!raw) return { data: null, raw, error: 'File could not be read as text.' };

  try {
    const parsed = plist.parse(raw);
    if (parsed && typeof parsed === 'object') {
      return { data: parsed as ParsedPlist, raw };
    }
    return { data: null, raw, error: 'Parsed plist was not an object.' };
  } catch (error) {
    return { data: null, raw, error: error instanceof Error ? error.message : 'Unknown plist parse error.' };
  }
}
