#!/usr/bin/env node

import { formatJsonReport, formatTextReport } from './core/reporting';
import { SUPPORTED_LANGUAGES } from './core/types';
import type { Language, RunMode } from './core/types';
import { updateCdkDependencies } from './updater';

interface CliOptions {
  readonly repoRoot: string;
  readonly languages: Language[];
  readonly mode: RunMode;
  readonly json: boolean;
}

const USAGE = `Usage: update-cdk-dependencies <repository-root> [options]

Options:
  --language <name>  python, java, go, csharp, or all (repeatable or comma-separated)
  --write            Apply planned updates
  --check            Exit non-zero when updates or manual migrations are pending
  --json              Emit a structured JSON report
  --help              Show this help

The default mode is a non-mutating dry run for all supported languages.`;

function parseLanguages(values: readonly string[]): Language[] {
  const requested = values.flatMap(value => value.split(',')).filter(Boolean);
  if (requested.length === 0 || requested.includes('all')) {
    return [...SUPPORTED_LANGUAGES];
  }
  const invalid = requested.filter(value => !SUPPORTED_LANGUAGES.includes(value as Language));
  if (invalid.length > 0) {
    throw new Error(`Unsupported language: ${invalid.join(', ')}`);
  }
  return [...new Set(requested as Language[])];
}

export function parseArgs(argv: readonly string[]): CliOptions | undefined {
  if (argv.includes('--help')) {
    return undefined;
  }

  let repoRoot: string | undefined;
  let mode: RunMode = 'dry-run';
  let json = false;
  const languageValues: string[] = [];

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    switch (argument) {
      case '--write':
        if (mode === 'check') {
          throw new Error('--write and --check cannot be used together');
        }
        mode = 'write';
        break;
      case '--check':
        if (mode === 'write') {
          throw new Error('--write and --check cannot be used together');
        }
        mode = 'check';
        break;
      case '--json':
        json = true;
        break;
      case '--language': {
        const value = argv[index + 1];
        if (!value || value.startsWith('--')) {
          throw new Error('--language requires a value');
        }
        languageValues.push(value);
        index += 1;
        break;
      }
      default:
        if (argument.startsWith('--')) {
          throw new Error(`Unknown option: ${argument}`);
        }
        if (repoRoot) {
          throw new Error(`Unexpected positional argument: ${argument}`);
        }
        repoRoot = argument;
    }
  }

  if (!repoRoot) {
    throw new Error('Repository root path is required');
  }
  return { repoRoot, languages: parseLanguages(languageValues), mode, json };
}

export async function main(argv: readonly string[] = process.argv.slice(2)): Promise<number> {
  let options: CliOptions | undefined;
  try {
    options = parseArgs(argv);
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    console.error(USAGE);
    return 1;
  }

  if (!options) {
    console.log(USAGE);
    return 0;
  }

  try {
    const report = await updateCdkDependencies(options);
    console.log(options.json ? formatJsonReport(report) : formatTextReport(report, options.repoRoot));
    if (report.summary.errors > 0) {
      return 1;
    }
    if (options.mode === 'check' && (report.summary.pending > 0 || report.summary.manual > 0)) {
      return 2;
    }
    if (options.mode === 'write' && report.summary.manual > 0) {
      return 2;
    }
    return 0;
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    return 1;
  }
}

if (require.main === module) {
  main().then(code => {
    process.exitCode = code;
  }).catch(error => {
    console.error(error);
    process.exitCode = 1;
  });
}
