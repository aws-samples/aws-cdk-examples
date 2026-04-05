import pLimit from 'p-limit';
import { discoverProjects } from './discover';
import { buildProject } from './build';
import { synthProject } from './synth';
import { ProjectResult, BuildReport, DiscoveredProject, Language } from './types';

async function processProject(project: DiscoveredProject): Promise<ProjectResult> {
  const start = Date.now();

  if (project.skip) {
    return {
      name: project.name, path: project.path, language: project.language,
      status: 'skipped', steps: [], messages: [], durationMs: 0,
    };
  }

  const steps = await buildProject(project.path, project.language);
  const buildFailed = steps.some((s) => !s.success);

  if (buildFailed) {
    const failedStep = steps.find((s) => !s.success)!;
    console.log(`❌ ${project.name} (${failedStep.name} failed)`);
    return {
      name: project.name, path: project.path, language: project.language,
      status: 'failed', steps, messages: [], durationMs: Date.now() - start,
    };
  }

  const { step: synthStep, messages } = await synthProject(project.path, project.language);
  steps.push(synthStep);

  const status = synthStep.success ? 'success' : 'failed';
  const warnCount = messages.filter((m) => m.level === 'warning' || m.level === 'warn').length;
  const icon = status === 'success' ? '✅' : '❌';
  const suffix = warnCount > 0 ? ` (${warnCount} warning${warnCount > 1 ? 's' : ''})` : '';
  console.log(`${icon} ${project.name}${suffix}`);

  return {
    name: project.name, path: project.path, language: project.language,
    status, steps, messages, durationMs: Date.now() - start,
  };
}

export async function buildAll(rootDir: string, concurrency: number, filterLang?: Language): Promise<BuildReport> {
  const start = Date.now();
  const projects = await discoverProjects(rootDir, filterLang);

  const skipped = projects.filter((p) => p.skip);
  const buildable = projects.filter((p) => !p.skip);

  // Group by language for display
  const langCounts = new Map<string, number>();
  for (const p of projects) {
    langCounts.set(p.language, (langCounts.get(p.language) || 0) + 1);
  }
  const langSummary = [...langCounts.entries()].map(([l, c]) => `${l}: ${c}`).join(', ');

  console.log(`Found ${projects.length} projects (${buildable.length} buildable, ${skipped.length} skipped)`);
  console.log(`Languages: ${langSummary}`);
  console.log(`Concurrency: ${concurrency}\n`);

  for (const p of skipped) {
    console.log(`⏭️  ${p.name} (${p.skipReason})`);
  }

  const limit = pLimit(concurrency);
  const results = await Promise.all(
    buildable.map((p) => limit(() => processProject(p)))
  );

  const allResults: ProjectResult[] = [
    ...skipped.map((p): ProjectResult => ({
      name: p.name, path: p.path, language: p.language,
      status: 'skipped', steps: [], messages: [], durationMs: 0,
    })),
    ...results,
  ];

  return {
    timestamp: new Date().toISOString(),
    durationMs: Date.now() - start,
    concurrency,
    summary: {
      total: allResults.length,
      success: results.filter((r) => r.status === 'success').length,
      failed: results.filter((r) => r.status === 'failed').length,
      skipped: skipped.length,
    },
    projects: allResults.sort((a, b) => a.name.localeCompare(b.name)),
  };
}
