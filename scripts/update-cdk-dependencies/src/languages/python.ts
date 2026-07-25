import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { findFiles, readUtf8 } from '../core/discovery';
import type { DependencyChange, LanguageAdapter, ProjectPlan, TargetVersions } from '../core/types';

interface ReplacementResult {
  readonly content: string;
  readonly changes: DependencyChange[];
  readonly counts: Readonly<Record<string, number>>;
}

function targetFor(name: string, targets: TargetVersions): string {
  return name.toLowerCase() === 'aws-cdk-lib' ? targets.python.cdkLib : targets.python.constructs;
}

export function updateRequirementsContent(content: string, targets: TargetVersions): ReplacementResult {
  const changes: DependencyChange[] = [];
  const counts: Record<string, number> = { 'aws-cdk-lib': 0, constructs: 0 };
  const newline = content.includes('\r\n') ? '\r\n' : '\n';
  const endsWithNewline = content.endsWith('\n');
  const lines = content.split(/\r?\n/);
  if (endsWithNewline) {
    lines.pop();
  }

  const updated = lines.map(line => {
    const match = /^(\s*)(aws-cdk-lib|constructs)(\[[^\]]+\])?(\s*)([^;#]*?)(\s*(?:;[^#]*?)?)(\s*(?:#.*)?)$/i.exec(line);
    if (!match) {
      return line;
    }

    const dependency = match[2].toLowerCase();
    counts[dependency] += 1;
    const from = match[5].trim() || '<unbounded>';
    const to = targetFor(dependency, targets);
    if (from === to) {
      return line;
    }

    changes.push({ dependency, from, to });
    return `${match[1]}${match[2]}${match[3] ?? ''}${match[4]}${to}${match[6]}${match[7]}`;
  });

  return {
    content: updated.join(newline) + (endsWithNewline ? newline : ''),
    changes,
    counts,
  };
}

export function updatePyprojectContent(content: string, targets: TargetVersions): ReplacementResult {
  const changes: DependencyChange[] = [];
  const counts: Record<string, number> = { 'aws-cdk-lib': 0, constructs: 0 };
  const pattern = /(["'])(aws-cdk-lib|constructs)(\[[^\]"']+\])?([^"']*)\1/gi;
  const updated = content.replace(pattern, (full, quote: string, rawName: string, extras: string | undefined, suffix: string) => {
    const dependency = rawName.toLowerCase();
    counts[dependency] += 1;
    const markerIndex = suffix.indexOf(';');
    const specifier = (markerIndex >= 0 ? suffix.slice(0, markerIndex) : suffix).trim();
    const marker = markerIndex >= 0 ? suffix.slice(markerIndex) : '';
    const to = targetFor(dependency, targets);
    const from = specifier || '<unbounded>';
    if (from === to) {
      return full;
    }
    changes.push({ dependency, from, to });
    return `${quote}${rawName}${extras ?? ''}${to}${marker}${quote}`;
  });
  return { content: updated, changes, counts };
}

async function readOptional(path: string): Promise<string | undefined> {
  try {
    return await readFile(path, 'utf8');
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return undefined;
    }
    throw error;
  }
}

export const pythonAdapter: LanguageAdapter = {
  language: 'python',
  async scan({ repoRoot, targets }): Promise<ProjectPlan[]> {
    const manifests = await findFiles(join(repoRoot, 'python'), name => name === 'requirements.txt');
    const plans: ProjectPlan[] = [];

    for (const manifestPath of manifests) {
      const before = await readUtf8(manifestPath);
      const requirements = updateRequirementsContent(before, targets);
      if (requirements.counts['aws-cdk-lib'] === 0) {
        continue;
      }
      if (requirements.counts['aws-cdk-lib'] !== 1 || requirements.counts.constructs > 1) {
        plans.push({
          language: 'python',
          manifestPath,
          status: 'error',
          changes: requirements.changes,
          message: 'Expected one aws-cdk-lib entry and at most one constructs entry',
        });
        continue;
      }

      const updates = [];
      const changes = [...requirements.changes];
      if (requirements.content !== before) {
        updates.push({ path: manifestPath, before, after: requirements.content });
      }

      const pyprojectPath = join(dirname(manifestPath), 'pyproject.toml');
      const pyprojectBefore = await readOptional(pyprojectPath);
      if (pyprojectBefore !== undefined) {
        const pyproject = updatePyprojectContent(pyprojectBefore, targets);
        changes.push(...pyproject.changes);
        if (pyproject.content !== pyprojectBefore) {
          updates.push({ path: pyprojectPath, before: pyprojectBefore, after: pyproject.content });
        }
      }

      plans.push({
        language: 'python',
        manifestPath,
        status: updates.length > 0 ? 'would-update' : 'up-to-date',
        changes,
        updates,
      });
    }
    return plans;
  },
};
