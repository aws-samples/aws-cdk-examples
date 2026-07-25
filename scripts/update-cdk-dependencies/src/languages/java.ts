import { join } from 'node:path';
import { findFiles, readUtf8 } from '../core/discovery';
import type { DependencyChange, LanguageAdapter, ProjectPlan, TargetVersions } from '../core/types';

interface DependencyLocation {
  readonly block: string;
  readonly version: string;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function extractTag(content: string, tag: string): string | undefined {
  const match = new RegExp(`<${escapeRegExp(tag)}\\s*>([^<]+)</${escapeRegExp(tag)}\\s*>`).exec(content);
  return match?.[1].trim();
}

function findDependency(content: string, groupId: string, artifactId: string): DependencyLocation[] {
  const blocks = content.match(/<dependency\b[^>]*>[\s\S]*?<\/dependency>/g) ?? [];
  return blocks.flatMap(block => {
    if (extractTag(block, 'groupId') !== groupId || extractTag(block, 'artifactId') !== artifactId) {
      return [];
    }
    const version = extractTag(block, 'version');
    return version ? [{ block, version }] : [];
  });
}

function replaceProperty(content: string, property: string, target: string): { content: string; from: string } {
  const escaped = escapeRegExp(property);
  const pattern = new RegExp(`(<${escaped}\\s*>)([^<]+)(</${escaped}\\s*>)`, 'g');
  const matches = [...content.matchAll(pattern)];
  if (matches.length !== 1) {
    throw new Error(`Expected exactly one <${property}> property, found ${matches.length}`);
  }
  const from = matches[0][2].trim();
  return { content: content.replace(pattern, `$1${target}$3`), from };
}

function replaceDirectVersion(content: string, dependency: DependencyLocation, target: string): { content: string; from: string } {
  const pattern = /(<version\s*>)([^<]+)(<\/version\s*>)/;
  const updatedBlock = dependency.block.replace(pattern, `$1${target}$3`);
  return { content: content.replace(dependency.block, updatedBlock), from: dependency.version };
}

function updateDependency(
  content: string,
  groupId: string,
  artifactId: string,
  target: string,
): { content: string; change?: DependencyChange } {
  const dependencies = findDependency(content, groupId, artifactId);
  if (dependencies.length === 0) {
    return { content };
  }
  if (dependencies.length !== 1) {
    throw new Error(`Expected one ${groupId}:${artifactId} dependency, found ${dependencies.length}`);
  }

  const dependency = dependencies[0];
  const property = /^\$\{([^}]+)\}$/.exec(dependency.version)?.[1];
  const replacement = property
    ? replaceProperty(content, property, target)
    : replaceDirectVersion(content, dependency, target);
  if (replacement.from === target) {
    return { content };
  }
  return {
    content: replacement.content,
    change: { dependency: `${groupId}:${artifactId}`, from: replacement.from, to: target },
  };
}

export function updatePomContent(content: string, targets: TargetVersions): { content: string; changes: DependencyChange[] } {
  const changes: DependencyChange[] = [];
  let updated = content;
  for (const dependency of [
    ['software.amazon.awscdk', 'aws-cdk-lib', targets.java.cdkLib],
    ['software.constructs', 'constructs', targets.java.constructs],
  ] as const) {
    const result = updateDependency(updated, dependency[0], dependency[1], dependency[2]);
    updated = result.content;
    if (result.change) {
      changes.push(result.change);
    }
  }
  return { content: updated, changes };
}

export const javaAdapter: LanguageAdapter = {
  language: 'java',
  async scan({ repoRoot, targets }): Promise<ProjectPlan[]> {
    const manifests = await findFiles(join(repoRoot, 'java'), name => name === 'pom.xml');
    const plans: ProjectPlan[] = [];
    for (const manifestPath of manifests) {
      const before = await readUtf8(manifestPath);
      if (!before.includes('<artifactId>aws-cdk-lib</artifactId>')) {
        continue;
      }
      try {
        const result = updatePomContent(before, targets);
        plans.push({
          language: 'java',
          manifestPath,
          status: result.content === before ? 'up-to-date' : 'would-update',
          changes: result.changes,
          updates: result.content === before ? [] : [{ path: manifestPath, before, after: result.content }],
        });
      } catch (error) {
        plans.push({
          language: 'java',
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
