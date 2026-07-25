import { spawn } from 'node:child_process';
import { readFile, unlink, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { findFiles, readUtf8 } from '../core/discovery';
import type { DependencyChange, LanguageAdapter, ProjectPlan, ScanContext } from '../core/types';

const CDK_MODULE = 'github.com/aws/aws-cdk-go/awscdk/v2';
const CONSTRUCTS_MODULE = 'github.com/aws/constructs-go/constructs/v10';

export type CommandRunner = (command: string, args: readonly string[], cwd: string) => Promise<void>;

export const runCommand: CommandRunner = async (command, args, cwd) => {
  await new Promise<void>((resolve, reject) => {
    const child = spawn(command, [...args], { cwd, stdio: ['ignore', 'ignore', 'pipe'] });
    let stderr = '';
    child.stderr.setEncoding('utf8');
    child.stderr.on('data', chunk => {
      stderr += chunk;
    });
    child.on('error', reject);
    child.on('close', code => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`${command} ${args.join(' ')} failed with exit code ${code}: ${stderr.trim()}`));
      }
    });
  });
};

function findRequiredVersion(content: string, module: string): string | undefined {
  const escaped = module.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`^\\s*${escaped}\\s+(v\\S+)`, 'm').exec(content)?.[1];
}

function compareGoVersions(left: string, right: string): number {
  const parse = (value: string): number[] => value.replace(/^v/, '').split('.').map(part => Number(part));
  const leftParts = parse(left);
  const rightParts = parse(right);
  for (let index = 0; index < Math.max(leftParts.length, rightParts.length); index += 1) {
    const difference = (leftParts[index] ?? 0) - (rightParts[index] ?? 0);
    if (difference !== 0) {
      return difference;
    }
  }
  return 0;
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

async function restore(path: string, content: string | undefined): Promise<void> {
  if (content === undefined) {
    try {
      await unlink(path);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        throw error;
      }
    }
  } else {
    await writeFile(path, content);
  }
}

async function updateGoModule(
  manifestPath: string,
  cdkTarget: string,
  commandRunner: CommandRunner,
): Promise<void> {
  const projectDir = dirname(manifestPath);
  const sumPath = join(projectDir, 'go.sum');
  const [modBefore, sumBefore] = await Promise.all([
    readFile(manifestPath, 'utf8'),
    readOptional(sumPath),
  ]);

  try {
    await commandRunner('go', [
      'get',
      `${CDK_MODULE}@${cdkTarget}`,
    ], projectDir);
    await commandRunner('go', ['mod', 'tidy'], projectDir);
  } catch (error) {
    await Promise.all([
      restore(manifestPath, modBefore),
      restore(sumPath, sumBefore),
    ]);
    throw error;
  }
}

export function createGoAdapter(commandRunner: CommandRunner = runCommand): LanguageAdapter {
  return {
    language: 'go',
    async scan({ repoRoot, targets }: ScanContext): Promise<ProjectPlan[]> {
      const manifests = await findFiles(join(repoRoot, 'go'), name => name === 'go.mod');
      const plans: ProjectPlan[] = [];
      for (const manifestPath of manifests) {
        const content = await readUtf8(manifestPath);
        const cdkVersion = findRequiredVersion(content, CDK_MODULE);
        if (!cdkVersion) {
          continue;
        }
        const constructsVersion = findRequiredVersion(content, CONSTRUCTS_MODULE);
        const changes: DependencyChange[] = [];
        if (cdkVersion !== targets.go.cdkLib) {
          changes.push({ dependency: CDK_MODULE, from: cdkVersion, to: targets.go.cdkLib });
        }
        if (constructsVersion && compareGoVersions(constructsVersion, targets.go.constructs) < 0) {
          changes.push({
            dependency: CONSTRUCTS_MODULE,
            from: constructsVersion,
            to: `>=${targets.go.constructs} (resolved by go mod tidy)`,
          });
        }
        plans.push({
          language: 'go',
          manifestPath,
          status: changes.length > 0 ? 'would-update' : 'up-to-date',
          changes,
          apply: changes.length > 0
            ? (): Promise<void> => updateGoModule(manifestPath, targets.go.cdkLib, commandRunner)
            : undefined,
        });
      }
      return plans;
    },
  };
}

export const goAdapter = createGoAdapter();
