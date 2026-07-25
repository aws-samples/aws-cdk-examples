import { join } from 'node:path';
import { findFiles, readUtf8 } from '../core/discovery';
import type { DependencyChange, LanguageAdapter, ProjectPlan, TargetVersions } from '../core/types';

interface PackageReference {
  readonly block: string;
  readonly name: string;
  readonly version?: string;
}

function findPackageReferences(content: string): PackageReference[] {
  const blocks = content.match(/<PackageReference\b[^>]*\/>|<PackageReference\b[^>]*>[\s\S]*?<\/PackageReference>/gi) ?? [];
  return blocks.flatMap(block => {
    const include = /\bInclude\s*=\s*(["'])(.*?)\1/i.exec(block)?.[2];
    if (!include) {
      return [];
    }
    const attributeVersion = /\bVersion\s*=\s*(["'])(.*?)\1/i.exec(block)?.[2];
    const elementVersion = /<Version\s*>([^<]+)<\/Version\s*>/i.exec(block)?.[1].trim();
    return [{ block, name: include, version: attributeVersion ?? elementVersion }];
  });
}

function replacePackageVersion(
  content: string,
  reference: PackageReference,
  target: string,
): string {
  if (/\bVersion\s*=/i.test(reference.block)) {
    const updated = reference.block.replace(/(\bVersion\s*=\s*)(["'])(.*?)\2/i, `$1$2${target}$2`);
    return content.replace(reference.block, updated);
  }
  if (/<Version\s*>/i.test(reference.block)) {
    const updated = reference.block.replace(/(<Version\s*>)([^<]+)(<\/Version\s*>)/i, `$1${target}$3`);
    return content.replace(reference.block, updated);
  }
  throw new Error(`PackageReference ${reference.name} does not declare a version`);
}

export function updateCsprojContent(content: string, targets: TargetVersions): { content: string; changes: DependencyChange[] } {
  const changes: DependencyChange[] = [];
  let updated = content;

  for (const [name, target] of [
    ['Amazon.CDK.Lib', targets.csharp.cdkLib],
    ['Constructs', targets.csharp.constructs],
  ] as const) {
    const references = findPackageReferences(updated).filter(reference => reference.name === name);
    if (references.length === 0) {
      continue;
    }
    if (references.length !== 1) {
      throw new Error(`Expected one ${name} PackageReference, found ${references.length}`);
    }
    const reference = references[0];
    if (!reference.version) {
      throw new Error(`PackageReference ${name} does not declare a version`);
    }
    if (reference.version !== target) {
      updated = replacePackageVersion(updated, reference, target);
      changes.push({ dependency: name, from: reference.version, to: target });
    }
  }
  return { content: updated, changes };
}

export const csharpAdapter: LanguageAdapter = {
  language: 'csharp',
  async scan({ repoRoot, targets }): Promise<ProjectPlan[]> {
    const manifests = await findFiles(join(repoRoot, 'csharp'), name => name.endsWith('.csproj'));
    const plans: ProjectPlan[] = [];
    for (const manifestPath of manifests) {
      const before = await readUtf8(manifestPath);
      const references = findPackageReferences(before);
      const hasV2 = references.some(reference => reference.name === 'Amazon.CDK.Lib');
      const v1References = references.filter(reference =>
        reference.name === 'Amazon.CDK' || reference.name.startsWith('Amazon.CDK.AWS.') || reference.name === 'Amazon.CDK.Assertions');

      if (!hasV2 && v1References.length === 0) {
        continue;
      }
      if (!hasV2) {
        plans.push({
          language: 'csharp',
          manifestPath,
          status: 'manual-migration-required',
          changes: [],
          message: `CDK v1 packages require source migration: ${v1References.map(reference => reference.name).join(', ')}`,
        });
        continue;
      }

      try {
        const result = updateCsprojContent(before, targets);
        plans.push({
          language: 'csharp',
          manifestPath,
          status: result.content === before ? 'up-to-date' : 'would-update',
          changes: result.changes,
          updates: result.content === before ? [] : [{ path: manifestPath, before, after: result.content }],
        });
      } catch (error) {
        plans.push({
          language: 'csharp',
          manifestPath,
          status: 'error',
          changes: [],
          message: error instanceof Error ? error.message : String(error),
        });
      }
    }
    return plans;
  },
};
