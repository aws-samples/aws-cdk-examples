import { readdir, access } from 'node:fs/promises';
import { join, relative, resolve } from 'node:path';
import { DiscoveredProject, Language } from './types';

const IGNORE_DIRS = new Set(['node_modules', 'cdk.out', '.git', 'dist', '.venv', 'target']);

async function exists(p: string): Promise<boolean> {
  try { await access(p); return true; } catch { return false; }
}

async function detectLanguage(dir: string): Promise<Language> {
  if (await exists(join(dir, 'package.json'))) return 'typescript';
  if (await exists(join(dir, 'requirements.txt'))) return 'python';
  if (await exists(join(dir, 'pom.xml'))) return 'java';
  if (await exists(join(dir, 'go.mod'))) return 'go';
  // C# - check for .sln or .csproj in src/
  const entries = await readdir(dir).catch(() => [] as string[]);
  if (entries.some(e => e.endsWith('.sln'))) return 'csharp';
  const srcEntries = await readdir(join(dir, 'src')).catch(() => [] as string[]);
  if (srcEntries.some(e => e.endsWith('.csproj') || e.endsWith('.sln'))) return 'csharp';
  return 'unknown';
}

async function findCdkJsons(dir: string, results: string[]): Promise<void> {
  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (!entry.isDirectory() || IGNORE_DIRS.has(entry.name)) continue;
    const full = join(dir, entry.name);
    if (await exists(join(full, 'cdk.json'))) {
      results.push(full);
    }
    await findCdkJsons(full, results);
  }
}

export async function discoverProjects(rootDir: string, filterLang?: Language): Promise<DiscoveredProject[]> {
  const root = resolve(rootDir);
  const dirs: string[] = [];
  await findCdkJsons(root, dirs);
  dirs.sort();

  const projects: DiscoveredProject[] = [];
  for (const dir of dirs) {
    const language = await detectLanguage(dir);
    if (filterLang && language !== filterLang) continue;

    const name = relative(resolve(root, '..'), dir);
    const hasSkip = await exists(join(dir, 'DO_NOT_AUTOTEST'));

    if (hasSkip) {
      projects.push({ name, path: dir, language, skip: true, skipReason: 'DO_NOT_AUTOTEST' });
    } else if (language === 'unknown') {
      projects.push({ name, path: dir, language, skip: true, skipReason: 'unknown language' });
    } else {
      projects.push({ name, path: dir, language, skip: false });
    }
  }
  return projects;
}
