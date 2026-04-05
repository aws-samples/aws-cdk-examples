#!/usr/bin/env node
import { cpus } from 'node:os';
import { resolve } from 'node:path';
import { buildAll } from './orchestrator';
import { writeJsonReport, printSummary } from './report';
import { Language } from './types';

const LANGUAGES: Language[] = ['typescript', 'python', 'java', 'go', 'csharp'];

function parseArgs(argv: string[]) {
  const args = argv.slice(2);
  let rootDir = '';
  let concurrency = Math.max(1, Math.floor(cpus().length / 2));
  let output = '';
  let language: Language | undefined;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--concurrency' && args[i + 1]) {
      concurrency = parseInt(args[++i], 10);
    } else if (args[i] === '--output' && args[i + 1]) {
      output = args[++i];
    } else if (args[i] === '--language' && args[i + 1]) {
      const lang = args[++i] as Language;
      if (!LANGUAGES.includes(lang)) {
        console.error(`Invalid language: ${lang}. Valid: ${LANGUAGES.join(', ')}`);
        process.exit(1);
      }
      language = lang;
    } else if (!args[i].startsWith('-')) {
      rootDir = args[i];
    }
  }

  if (!rootDir) {
    console.error('Usage: build-toolkit <dir> [--language typescript|python|java|go|csharp] [--concurrency N] [--output report.json]');
    console.error('\n  <dir>  Root directory to scan (e.g. "." for all languages, or "typescript" for one)');
    process.exit(1);
  }

  return { rootDir: resolve(rootDir), concurrency, output: output ? resolve(output) : '', language };
}

async function main() {
  const { rootDir, concurrency, output, language } = parseArgs(process.argv);

  const langLabel = language || 'all languages';
  console.log(`Building CDK projects (${langLabel}) in: ${rootDir}`);
  const report = await buildAll(rootDir, concurrency, language);

  printSummary(report);

  if (output) {
    await writeJsonReport(report, output);
  }

  process.exit(report.summary.failed > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error('Fatal:', err);
  process.exit(1);
});
