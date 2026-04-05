import { access } from 'node:fs/promises';
import { join } from 'node:path';
import { runStep } from './runner';
import { StepResult, Language } from './types';

async function exists(p: string): Promise<boolean> {
  try { await access(p); return true; } catch { return false; }
}

async function buildTypescript(dir: string): Promise<StepResult[]> {
  const steps: StepResult[] = [];
  const hasYarnLock = await exists(join(dir, 'yarn.lock'));
  const hasPkgLock = await exists(join(dir, 'package-lock.json'));

  let installResult: StepResult;
  if (hasYarnLock) {
    installResult = await runStep('install', 'yarn', ['install', '--frozen-lockfile', '--mutex', 'network'], dir);
  } else if (hasPkgLock) {
    installResult = await runStep('install', 'npm', ['ci'], dir);
  } else {
    installResult = await runStep('install', 'yarn', ['install', '--mutex', 'network'], dir);
  }
  steps.push(installResult);
  if (!installResult.success) return steps;

  const buildResult = hasYarnLock
    ? await runStep('build', 'yarn', ['build'], dir)
    : await runStep('build', 'npm', ['run', 'build'], dir);
  steps.push(buildResult);
  if (!buildResult.success) return steps;

  steps.push(await runStep('test', 'npm', ['run', '--if-present', 'test'], dir));
  return steps;
}

async function buildPython(dir: string): Promise<StepResult[]> {
  const steps: StepResult[] = [];
  // Create venv, install deps
  const install = await runStep('install', 'bash', ['-c',
    'python3 -m venv .venv && source .venv/bin/activate && pip install -q -r requirements.txt'
  ], dir);
  steps.push(install);
  return steps; // Python has no compile/test step in the existing scripts
}

async function buildJava(dir: string): Promise<StepResult[]> {
  const steps: StepResult[] = [];
  const build = await runStep('build', 'mvn', ['-q', 'compile'], dir);
  steps.push(build);
  if (!build.success) return steps;

  steps.push(await runStep('test', 'mvn', ['-q', 'test'], dir));
  return steps;
}

async function buildGo(dir: string): Promise<StepResult[]> {
  const steps: StepResult[] = [];
  const build = await runStep('build', 'go', ['build'], dir);
  steps.push(build);
  if (!build.success) return steps;

  steps.push(await runStep('test', 'go', ['test', './...'], dir));
  return steps;
}

async function buildCsharp(dir: string): Promise<StepResult[]> {
  const steps: StepResult[] = [];
  const build = await runStep('build', 'dotnet', ['build', 'src'], dir);
  steps.push(build);
  return steps; // C# build script doesn't run tests separately
}

export async function buildProject(dir: string, language: Language): Promise<StepResult[]> {
  switch (language) {
    case 'typescript': return buildTypescript(dir);
    case 'python': return buildPython(dir);
    case 'java': return buildJava(dir);
    case 'go': return buildGo(dir);
    case 'csharp': return buildCsharp(dir);
    default: return [{ name: 'build', success: false, durationMs: 0, output: `Unsupported language: ${language}` }];
  }
}
