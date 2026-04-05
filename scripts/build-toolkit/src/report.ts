import { writeFile } from 'node:fs/promises';
import { BuildReport } from './types';

export async function writeJsonReport(report: BuildReport, outputPath: string): Promise<void> {
  await writeFile(outputPath, JSON.stringify(report, null, 2) + '\n');
  console.log(`\nReport written to ${outputPath}`);
}

export function printSummary(report: BuildReport): void {
  const { summary } = report;
  const duration = (report.durationMs / 1000).toFixed(1);

  console.log('\n==============================');
  console.log('BUILD SUMMARY');
  console.log('==============================');
  console.log(`Total: ${summary.total} (✅ ${summary.success} succeeded, ❌ ${summary.failed} failed, ⏭️  ${summary.skipped} skipped)`);
  console.log(`Duration: ${duration}s`);

  // Collect unique warnings across all projects
  const warnings = new Map<string, string[]>();
  for (const p of report.projects) {
    for (const m of p.messages) {
      if (m.level === 'warning' || m.level === 'warn') {
        const key = m.message.slice(0, 120);
        if (!warnings.has(key)) warnings.set(key, []);
        warnings.get(key)!.push(p.name);
      }
    }
  }

  if (warnings.size > 0) {
    console.log('\n--- Warnings ---');
    for (const [msg, projects] of warnings) {
      console.log(`⚠️  ${msg}`);
      console.log(`   in: ${projects.join(', ')}`);
    }
  }

  // Failed projects with details
  const failed = report.projects.filter((p) => p.status === 'failed');
  if (failed.length > 0) {
    console.log('\n--- Failed Projects ---');
    for (const p of failed) {
      const failedStep = p.steps.find((s) => !s.success);
      console.log(`❌ ${p.name}`);
      if (failedStep) {
        console.log(`   Step: ${failedStep.name}`);
        const lastLines = failedStep.output.split('\n').slice(-5).join('\n');
        if (lastLines.trim()) console.log(`   ${lastLines.trim()}`);
      }
    }
  }
}
