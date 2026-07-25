import { relative } from 'node:path';
import type { RunReport } from './types';

export function formatTextReport(report: RunReport, repoRoot: string): string {
  const lines: string[] = [
    `CDK dependency targets from ${report.targets.source}`,
    `CDK CLI ${report.targets.cdkCli}, aws-cdk-lib ${report.targets.base.cdkLib}, constructs ${report.targets.base.constructs}`,
    '',
  ];

  for (const result of report.results) {
    if (result.status === 'up-to-date') {
      continue;
    }
    const manifest = relative(repoRoot, result.manifestPath);
    lines.push(`[${result.status}] ${manifest}`);
    for (const change of result.changes) {
      lines.push(`  ${change.dependency}: ${change.from} -> ${change.to}`);
    }
    if (result.message) {
      lines.push(`  ${result.message}`);
    }
  }

  const summary = report.summary;
  lines.push(
    '',
    `Scanned: ${summary.scanned}, up-to-date: ${summary.upToDate}, pending: ${summary.pending}, updated: ${summary.updated}, manual: ${summary.manual}, errors: ${summary.errors}`,
  );
  return lines.join('\n');
}

export function formatJsonReport(report: RunReport): string {
  return JSON.stringify(report, null, 2);
}
