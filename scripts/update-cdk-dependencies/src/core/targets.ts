import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import type { TargetVersions } from './types';

interface InitVersions {
  readonly 'aws-cdk-lib': string;
  readonly constructs: string;
}

interface PackageMetadata {
  readonly version: string;
}

function parseCaretVersion(value: string, name: string): { version: string; major: number } {
  const match = /^\^(\d+)\.(\d+)\.(\d+)$/.exec(value);
  if (!match) {
    throw new Error(`Unsupported ${name} init version: ${value}`);
  }
  return { version: `${match[1]}.${match[2]}.${match[3]}`, major: Number(match[1]) };
}

export function createTargetVersions(
  initVersions: InitVersions,
  cdkCli: string,
  source = 'provided init versions',
): TargetVersions {
  const cdk = parseCaretVersion(initVersions['aws-cdk-lib'], 'aws-cdk-lib');
  const constructs = parseCaretVersion(initVersions.constructs, 'constructs');

  return {
    source,
    cdkCli,
    base: {
      cdkLib: cdk.version,
      constructs: constructs.version,
    },
    python: {
      cdkLib: `>=${cdk.version},<${cdk.major + 1}.0.0`,
      constructs: `>=${constructs.version},<${constructs.major + 1}.0.0`,
    },
    java: {
      cdkLib: `[${cdk.version},${cdk.major + 1}.0.0)`,
      constructs: `[${constructs.version},${constructs.major + 1}.0.0)`,
    },
    go: {
      cdkLib: `v${cdk.version}`,
      constructs: `v${constructs.version}`,
    },
    csharp: {
      cdkLib: `[${cdk.version},${cdk.major + 1}.0.0)`,
      constructs: `${constructs.major}.*`,
    },
  };
}

export async function loadTargetVersions(initVersionPath?: string): Promise<TargetVersions> {
  const packageJsonPath = require.resolve('aws-cdk/package.json');
  const packageRoot = dirname(packageJsonPath);
  const source = initVersionPath ?? join(packageRoot, 'lib', 'init-templates', '.init-version.json');
  const [initText, packageText] = await Promise.all([
    readFile(source, 'utf8'),
    readFile(packageJsonPath, 'utf8'),
  ]);
  const initVersions = JSON.parse(initText) as InitVersions;
  const packageMetadata = JSON.parse(packageText) as PackageMetadata;
  return createTargetVersions(initVersions, packageMetadata.version, source);
}
