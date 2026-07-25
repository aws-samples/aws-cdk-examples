import { resolve } from 'node:path';
import { csharpAdapter } from './languages/csharp';
import { goAdapter } from './languages/go';
import { javaAdapter } from './languages/java';
import { pythonAdapter } from './languages/python';
import { executePlans } from './core/runner';
import { loadTargetVersions } from './core/targets';
import type { Language, LanguageAdapter, RunMode, RunReport } from './core/types';

const ADAPTERS: Readonly<Record<Language, LanguageAdapter>> = {
  python: pythonAdapter,
  java: javaAdapter,
  go: goAdapter,
  csharp: csharpAdapter,
};

export interface UpdateOptions {
  readonly repoRoot: string;
  readonly languages: readonly Language[];
  readonly mode: RunMode;
  readonly initVersionPath?: string;
}

export async function updateCdkDependencies(options: UpdateOptions): Promise<RunReport> {
  const repoRoot = resolve(options.repoRoot);
  const targets = await loadTargetVersions(options.initVersionPath);
  const planGroups = await Promise.all(options.languages.map(language =>
    ADAPTERS[language].scan({ repoRoot, targets })));
  const plans = planGroups.flat().sort((left, right) =>
    left.manifestPath.localeCompare(right.manifestPath));
  return executePlans(plans, options.mode, targets);
}
