import { readFile, writeFile } from 'node:fs/promises';
import type {
  ProjectPlan,
  ProjectResult,
  ResultStatus,
  RunMode,
  RunReport,
  RunSummary,
  TargetVersions,
  TextUpdate,
} from './types';

async function applyTextUpdates(updates: readonly TextUpdate[]): Promise<void> {
  const currentContents = await Promise.all(updates.map(update => readFile(update.path, 'utf8')));
  for (let index = 0; index < updates.length; index += 1) {
    if (currentContents[index] !== updates[index].before) {
      throw new Error(`Refusing to overwrite concurrently changed file: ${updates[index].path}`);
    }
  }

  const written: TextUpdate[] = [];
  try {
    for (const update of updates) {
      await writeFile(update.path, update.after);
      written.push(update);
    }
  } catch (error) {
    await Promise.all(written.map(update => writeFile(update.path, update.before)));
    throw error;
  }
}

async function applyPlan(plan: ProjectPlan): Promise<void> {
  await applyTextUpdates(plan.updates ?? []);
  await plan.apply?.();
}

function summarize(results: readonly ProjectResult[]): RunSummary {
  return {
    scanned: results.length,
    upToDate: results.filter(result => result.status === 'up-to-date').length,
    pending: results.filter(result => result.status === 'would-update').length,
    updated: results.filter(result => result.status === 'updated').length,
    manual: results.filter(result => result.status === 'manual-migration-required').length,
    errors: results.filter(result => result.status === 'error').length,
  };
}

export async function executePlans(
  plans: readonly ProjectPlan[],
  mode: RunMode,
  targets: TargetVersions,
): Promise<RunReport> {
  const results: ProjectResult[] = [];

  for (const plan of plans) {
    let status: ResultStatus = plan.status;
    let message = plan.message;

    if (mode === 'write' && plan.status === 'would-update') {
      try {
        await applyPlan(plan);
        status = 'updated';
      } catch (error) {
        status = 'error';
        message = error instanceof Error ? error.message : String(error);
      }
    }

    results.push({
      language: plan.language,
      manifestPath: plan.manifestPath,
      status,
      changes: plan.changes,
      message,
    });
  }

  return {
    mode,
    targets,
    results,
    summary: summarize(results),
  };
}
