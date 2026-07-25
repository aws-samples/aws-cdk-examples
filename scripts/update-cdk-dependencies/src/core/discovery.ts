import { opendir, readFile } from 'node:fs/promises';
import { join } from 'node:path';

const IGNORED_DIRECTORIES = new Set([
  '.git',
  '.venv',
  'bin',
  'build',
  'cdk.out',
  'coverage',
  'dist',
  'node_modules',
  'obj',
  'target',
]);

export async function findFiles(
  root: string,
  matches: (name: string) => boolean,
): Promise<string[]> {
  const results: string[] = [];

  async function walk(directory: string): Promise<void> {
    let entries;
    try {
      entries = await opendir(directory);
    } catch (error) {
      const code = (error as NodeJS.ErrnoException).code;
      if (code === 'ENOENT') {
        return;
      }
      throw error;
    }

    for await (const entry of entries) {
      const path = join(directory, entry.name);
      if (entry.isDirectory()) {
        if (!IGNORED_DIRECTORIES.has(entry.name)) {
          await walk(path);
        }
      } else if (entry.isFile() && matches(entry.name)) {
        results.push(path);
      }
    }
  }

  await walk(root);
  return results.sort((left, right) => left.localeCompare(right));
}

export async function readUtf8(path: string): Promise<string> {
  return readFile(path, 'utf8');
}
