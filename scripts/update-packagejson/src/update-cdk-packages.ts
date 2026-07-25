#!/usr/bin/env tsx

import { readFile, writeFile } from 'node:fs/promises';
import { opendir, access } from 'node:fs/promises';
import { resolve, join, dirname } from 'node:path';
import { setTimeout as sleep } from 'node:timers/promises';

interface PackageJson {
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  [key: string]: unknown;
}

interface CdkVersion {
  version: string;
}

interface LatestVersions {
  cdkLib: string;
  cdkCli: string;
  constructs: string;
  typescript: string;
  jest: string;
  typesJest: string;
  typesNode: string;
  swcCore: string;
  swcJest: string;
  tsx: string;
}

class PackageUpdateError extends Error {
  override cause?: Error;
  constructor(message: string, options?: { cause: Error }) {
    super(message);
    this.name = 'PackageUpdateError';
    this.cause = options?.cause;
  }
}

// Constants for URLs
const URLS = {
  templatePackage: 'https://raw.githubusercontent.com/aws/aws-cdk-cli/refs/heads/main/packages/aws-cdk/lib/init-templates/app/typescript/package.json',
  cdkVersion: 'https://raw.githubusercontent.com/aws/aws-cdk/main/version.v2.json',
  constructsPackage: 'https://raw.githubusercontent.com/aws/aws-cdk-cli/refs/heads/main/packages/aws-cdk/package.json'
} as const;

// Packages to remove during migration (old format)
const OLD_PACKAGES_TO_REMOVE = ['ts-jest', 'ts-node', 'source-map-support'];

// New tsconfig template
const NEW_TSCONFIG = {
  compilerOptions: {
    target: 'ES2022',
    module: 'NodeNext',
    moduleResolution: 'NodeNext',
    lib: ['es2022'],
    declaration: true,
    strict: true,
    noImplicitAny: true,
    strictNullChecks: true,
    noImplicitThis: true,
    alwaysStrict: true,
    noUnusedLocals: false,
    noUnusedParameters: false,
    noImplicitReturns: true,
    noFallthroughCasesInSwitch: false,
    inlineSourceMap: true,
    inlineSources: true,
    experimentalDecorators: true,
    strictPropertyInitialization: false,
    skipLibCheck: true,
    typeRoots: ['./node_modules/@types'],
    noEmit: true,
    isolatedModules: true,
    types: ['jest', 'node']
  },
  exclude: ['node_modules', 'cdk.out']
};

// New jest.config.js content
const NEW_JEST_CONFIG = `module.exports = {
  testEnvironment: 'node',
  roots: ['<rootDir>/test'],
  testMatch: ['**/*.test.ts'],
  transform: {
    '^.+\\\\.tsx?$': ['@swc/jest']
  },
  setupFilesAfterEnv: ['aws-cdk-lib/testhelpers/jest-autoclean'],
};
`;

// Utility function to get CDK CLI version
async function getCdkCliVersion(): Promise<string> {
  try {
    const { exec } = require('child_process');
    return new Promise((resolve, reject) => {
      exec('cdk --version', (error: Error | null, stdout: string) => {
        if (error) {
          reject(new PackageUpdateError('Failed to get CDK version', { cause: error }));
          return;
        }
        const version = stdout.trim().split(' ')[0];
        resolve(version);
      });
    });
  } catch (error) {
    throw new PackageUpdateError(
      'Failed to get CDK CLI version',
      { cause: error instanceof Error ? error : new Error(String(error)) }
    );
  }
}

// Utility function to fetch and parse JSON with retries
async function fetchJson<T>(url: string, retries = 3): Promise<T> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'CDK-Package-Updater'
        }
      });
      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json() as T;
    } catch (error) {
      if (attempt === retries) {
        throw new PackageUpdateError(
          `Failed to fetch from ${url} after ${retries} attempts`,
          { cause: error instanceof Error ? error : new Error(String(error)) }
        );
      }
      console.warn(`Attempt ${attempt} failed, retrying after ${attempt * 1000}ms...`);
      await sleep(attempt * 1000);
    }
  }
  throw new PackageUpdateError('Unreachable code path');
}

// Find all package.json files (skip node_modules and the scripts directory itself)
async function findPackageJsonFiles(startPath: string): Promise<string[]> {
  const results: string[] = [];
  const scriptsDir = resolve(startPath, 'scripts');

  async function* walk(dir: string): AsyncGenerator<string> {
    try {
      for await (const entry of await opendir(dir)) {
        const fullPath = join(dir, entry.name);
        if (entry.isDirectory()) {
          if (entry.name === 'node_modules') continue;
          if (resolve(fullPath) === scriptsDir) continue;
          yield* walk(fullPath);
        } else if (entry.isFile() && entry.name === 'package.json') {
          yield fullPath;
        }
      }
    } catch (error) {
      throw new PackageUpdateError(
        `Error walking directory ${dir}`,
        { cause: error instanceof Error ? error : new Error(String(error)) }
      );
    }
  }

  for await (const file of walk(startPath)) {
    results.push(file);
  }

  return results;
}

// Detect if a package.json is in old format (uses ts-jest or source-map-support)
function isOldFormat(content: PackageJson): boolean {
  const allDeps = {
    ...content.dependencies,
    ...content.devDependencies
  };
  // Old format if has legacy deps OR is missing new tooling (tsx)
  return !!(allDeps['ts-jest'] || allDeps['ts-node'] || allDeps['source-map-support'] || !allDeps['tsx']);
}

// Check if a package.json is a CDK TypeScript project (has aws-cdk-lib or aws-cdk)
function isCdkTypescriptProject(content: PackageJson): boolean {
  const allDeps = {
    ...content.dependencies,
    ...content.devDependencies
  };
  return !!(allDeps['aws-cdk-lib'] || allDeps['aws-cdk']);
}

// Check if a package.json is CDK-only (just aws-cdk devDep for CLI, like go/python/csharp projects)
function isCdkCliOnly(content: PackageJson): boolean {
  const deps = content.dependencies ?? {};
  const devDeps = content.devDependencies ?? {};
  const allKeys = [...Object.keys(deps), ...Object.keys(devDeps)];
  // If the only dependency is aws-cdk, it's a CLI-only project
  return allKeys.length === 1 && !!devDeps['aws-cdk'];
}

// Migrate a package.json from old to new format
function migratePackageJson(content: PackageJson, versions: LatestVersions): { updated: boolean; content: PackageJson } {
  let updated = false;
  const result = JSON.parse(JSON.stringify(content)) as PackageJson;

  // Remove old packages
  for (const pkg of OLD_PACKAGES_TO_REMOVE) {
    if (result.dependencies?.[pkg]) {
      delete result.dependencies[pkg];
      console.log(`  Removed ${pkg} from dependencies`);
      updated = true;
    }
    if (result.devDependencies?.[pkg]) {
      delete result.devDependencies[pkg];
      console.log(`  Removed ${pkg} from devDependencies`);
      updated = true;
    }
  }

  // Add new packages to devDependencies
  if (!result.devDependencies) {
    result.devDependencies = {};
  }

  const newDevDeps: Record<string, string> = {
    '@swc/core': versions.swcCore,
    '@swc/jest': versions.swcJest,
    'tsx': versions.tsx,
  };

  for (const [pkg, version] of Object.entries(newDevDeps)) {
    if (!result.devDependencies[pkg]) {
      result.devDependencies[pkg] = version;
      console.log(`  Added ${pkg}@${version} to devDependencies`);
      updated = true;
    }
  }

  // Update versions
  const versionResult = updateVersions(result, versions);
  return { updated: updated || versionResult.updated, content: versionResult.content };
}

// Update versions for a package already in new format
function updateVersions(content: PackageJson, versions: LatestVersions): { updated: boolean; content: PackageJson } {
  let updated = false;
  const result = JSON.parse(JSON.stringify(content)) as PackageJson;

  // devDependency version updates
  const devDepUpdates: Record<string, string> = {
    '@types/jest': versions.typesJest,
    '@types/node': versions.typesNode,
    'jest': versions.jest,
    'typescript': versions.typescript,
    'aws-cdk': versions.cdkCli,
    '@swc/core': versions.swcCore,
    '@swc/jest': versions.swcJest,
    'tsx': versions.tsx,
  };

  // Dependency version updates
  const depUpdates: Record<string, string> = {
    'aws-cdk-lib': versions.cdkLib,
    'constructs': versions.constructs,
  };

  if (result.devDependencies) {
    for (const [pkg, version] of Object.entries(devDepUpdates)) {
      if (result.devDependencies[pkg] && result.devDependencies[pkg] !== version) {
        result.devDependencies[pkg] = version;
        console.log(`  Updated ${pkg} to ${version}`);
        updated = true;
      }
    }
  }

  if (result.dependencies) {
    for (const [pkg, version] of Object.entries(depUpdates)) {
      if (result.dependencies[pkg] && result.dependencies[pkg] !== version) {
        result.dependencies[pkg] = version;
        console.log(`  Updated ${pkg} to ${version}`);
        updated = true;
      }
    }
  }

  return { updated, content: result };
}

// Update jest.config.js if it exists and uses old ts-jest format
async function migrateJestConfig(projectDir: string): Promise<boolean> {
  const jestConfigPath = join(projectDir, 'jest.config.js');

  try {
    await access(jestConfigPath);
  } catch {
    // No jest.config.js - skip
    return false;
  }

  const content = await readFile(jestConfigPath, 'utf8');

  // Check if it already uses @swc/jest
  if (content.includes('@swc/jest')) {
    return false;
  }

  // Check if it uses ts-jest (old format)
  if (content.includes('ts-jest')) {
    await writeFile(jestConfigPath, NEW_JEST_CONFIG);
    console.log(`  Migrated jest.config.js to @swc/jest`);
    return true;
  }

  return false;
}

// Remove source-map-support import lines from TypeScript source files
async function removeSourceMapImports(projectDir: string): Promise<boolean> {
  let anyUpdated = false;

  async function* walkTs(dir: string): AsyncGenerator<string> {
    try {
      for await (const entry of await opendir(dir)) {
        const fullPath = join(dir, entry.name);
        if (entry.isDirectory()) {
          if (entry.name === 'node_modules' || entry.name === 'cdk.out') continue;
          yield* walkTs(fullPath);
        } else if (entry.isFile() && entry.name.endsWith('.ts')) {
          yield fullPath;
        }
      }
    } catch {
      // Skip directories we can't read
    }
  }

  for await (const filePath of walkTs(projectDir)) {
    const content = await readFile(filePath, 'utf8');
    // Match import lines for source-map-support
    const pattern = /^import\s+['"]source-map-support\/register['"];?\s*\n?/gm;
    if (pattern.test(content)) {
      const updated = content.replace(pattern, '');
      await writeFile(filePath, updated);
      console.log(`  Removed source-map-support import from ${filePath}`);
      anyUpdated = true;
    }
  }

  return anyUpdated;
}

// Update cdk.json to use tsx instead of ts-node
async function migrateCdkJson(projectDir: string): Promise<boolean> {
  const cdkJsonPath = join(projectDir, 'cdk.json');

  try {
    await access(cdkJsonPath);
  } catch {
    // No cdk.json - skip
    return false;
  }

  const content = await readFile(cdkJsonPath, 'utf8');
  let cdkJson: Record<string, unknown>;

  try {
    cdkJson = JSON.parse(content);
  } catch {
    console.warn(`  Warning: Could not parse cdk.json, skipping`);
    return false;
  }

  const app = cdkJson.app as string | undefined;
  if (!app) return false;

  // Already in target format
  if (app.includes('npx tsc && npx tsx')) return false;

  // Determine entry file based on pattern
  let entryFile: string;
  if (app.includes('ts-node')) {
    // "npx ts-node --prefer-ts-exts bin/app.ts" -> "bin/app.ts"
    entryFile = app.replace(/npx ts-node(?:\s+--prefer-ts-exts)?\s+/, '').trim();
  } else if (app.match(/^npx node -r ts-node\/register\s+/)) {
    // "npx node -r ts-node/register main.ts" -> "main.ts"
    entryFile = app.replace(/^npx node -r ts-node\/register\s+/, '').trim();
  } else if (app.startsWith('npx tsx ')) {
    // Already using tsx but without tsc prefix
    entryFile = app.replace('npx tsx ', '').trim();
  } else if (app.startsWith('node ')) {
    // "node index" -> "index.ts" (old compiled JS pattern)
    const jsFile = app.replace('node ', '').trim();
    entryFile = jsFile.endsWith('.js') ? jsFile.replace('.js', '.ts') : jsFile + '.ts';
  } else {
    return false; // Unknown format, skip
  }

  cdkJson.app = `npx tsc && npx tsx ${entryFile}`;

  await writeFile(cdkJsonPath, JSON.stringify(cdkJson, null, 2) + '\n');
  console.log(`  Migrated cdk.json app command to tsx`);
  return true;
}

// Update tsconfig.json to new format
async function migrateTsconfig(projectDir: string): Promise<boolean> {
  const tsconfigPath = join(projectDir, 'tsconfig.json');

  try {
    await access(tsconfigPath);
  } catch {
    // No tsconfig.json - skip
    return false;
  }

  const content = await readFile(tsconfigPath, 'utf8');
  let tsconfig: Record<string, unknown>;

  try {
    tsconfig = JSON.parse(content);
  } catch {
    console.warn(`  Warning: Could not parse tsconfig.json, skipping`);
    return false;
  }

  const compilerOptions = tsconfig.compilerOptions as Record<string, unknown> | undefined;
  if (!compilerOptions) return false;

  // Detect old format: module is "commonjs" or target is older than ES2022
  const isOld = compilerOptions.module === 'commonjs' ||
    (compilerOptions.target && compilerOptions.target !== 'ES2022');

  if (!isOld) return false;

  // Write the new tsconfig, preserving any custom exclude/include if they have project-specific entries
  const newTsconfig = JSON.parse(JSON.stringify(NEW_TSCONFIG));

  // Preserve custom exclude entries beyond the defaults
  const existingExclude = tsconfig.exclude as string[] | undefined;
  if (existingExclude) {
    const defaultExclude = new Set(['node_modules', 'cdk.out', 'lib']);
    const custom = existingExclude.filter(e => !defaultExclude.has(e));
    if (custom.length > 0) {
      newTsconfig.exclude = [...NEW_TSCONFIG.exclude, ...custom];
    }
  }

  await writeFile(tsconfigPath, JSON.stringify(newTsconfig, null, 2) + '\n');
  console.log(`  Migrated tsconfig.json to new format`);
  return true;
}

// Fetch all latest versions from upstream
async function fetchLatestVersions(): Promise<LatestVersions> {
  console.log('Fetching latest versions from AWS CDK repositories...');

  const [templatePackage, cdkVersion, constructsPackage] = await Promise.all([
    fetchJson<PackageJson>(URLS.templatePackage),
    fetchJson<CdkVersion>(URLS.cdkVersion),
    fetchJson<PackageJson>(URLS.constructsPackage)
  ]);

  const cdkCliVersion = await getCdkCliVersion();
  console.log(`Detected CDK CLI version: ${cdkCliVersion}`);

  const templateDev = templatePackage.devDependencies ?? {};

  const versions: LatestVersions = {
    cdkLib: cdkVersion.version,
    cdkCli: cdkCliVersion,
    constructs: constructsPackage.devDependencies?.constructs ?? '',
    typescript: templateDev.typescript ?? '',
    jest: templateDev.jest ?? '',
    typesJest: templateDev['@types/jest'] ?? '',
    typesNode: templateDev['@types/node'] ?? '',
    swcCore: templateDev['@swc/core'] ?? '',
    swcJest: templateDev['@swc/jest'] ?? '',
    tsx: templateDev.tsx ?? '',
  };

  // Validate critical versions
  const critical = ['cdkLib', 'cdkCli', 'constructs', 'typescript'] as const;
  const missing = critical.filter(k => !versions[k]);
  if (missing.length > 0) {
    throw new PackageUpdateError(`Missing critical versions: ${missing.join(', ')}`);
  }

  console.log(`Versions: cdk-lib=${versions.cdkLib}, cdk-cli=${versions.cdkCli}, constructs=${versions.constructs}, typescript=${versions.typescript}`);
  console.log(`Migration deps: @swc/core=${versions.swcCore}, @swc/jest=${versions.swcJest}, tsx=${versions.tsx}`);

  return versions;
}

// Main function
async function updatePackages(repoRoot: string): Promise<void> {
  try {
    const versions = await fetchLatestVersions();

    // Find all package.json files
    const searchPath = resolve(repoRoot);
    console.log(`\nSearching for package.json files in ${searchPath}...`);
    const packageFiles = await findPackageJsonFiles(searchPath);
    console.log(`Found ${packageFiles.length} package.json files.\n`);

    let migratedCount = 0;
    let updatedCount = 0;
    let skippedCount = 0;

    // Process each package.json
    const concurrencyLimit = 5;
    for (let i = 0; i < packageFiles.length; i += concurrencyLimit) {
      const batch = packageFiles.slice(i, i + concurrencyLimit);
      await Promise.all(batch.map(async (filePath) => {
        const fileContent = await readFile(filePath, { encoding: 'utf8' });
        let content: PackageJson;

        try {
          content = JSON.parse(fileContent);
        } catch {
          console.warn(`Skipping invalid JSON: ${filePath}`);
          skippedCount++;
          return;
        }

        // Skip non-CDK projects
        if (!isCdkTypescriptProject(content)) {
          skippedCount++;
          return;
        }

        // CDK-CLI-only projects (go, python, csharp) just get CLI version update
        if (isCdkCliOnly(content)) {
          const { updated, content: updatedContent } = updateVersions(content, versions);
          if (updated) {
            console.log(`[update] ${filePath}`);
            await writeFile(filePath, JSON.stringify(updatedContent, null, 2) + '\n');
            updatedCount++;
          }
          return;
        }

        const projectDir = dirname(filePath);

        if (isOldFormat(content)) {
          // Migrate from old to new format
          console.log(`[migrate] ${filePath}`);
          const { updated, content: migratedContent } = migratePackageJson(content, versions);
          if (updated) {
            await writeFile(filePath, JSON.stringify(migratedContent, null, 2) + '\n');
          }

          // Migrate jest.config.js, tsconfig.json, cdk.json, and source files
          await migrateJestConfig(projectDir);
          await migrateTsconfig(projectDir);
          await migrateCdkJson(projectDir);
          await removeSourceMapImports(projectDir);
          migratedCount++;
        } else {
          // Already new format - just update versions
          const { updated, content: updatedContent } = updateVersions(content, versions);
          if (updated) {
            console.log(`[update] ${filePath}`);
            await writeFile(filePath, JSON.stringify(updatedContent, null, 2) + '\n');
            updatedCount++;
          }
          // Still check if cdk.json needs updating
          await migrateCdkJson(projectDir);
        }
      }));
    }

    console.log(`\n--- Summary ---`);
    console.log(`Migrated: ${migratedCount} projects (old -> new format)`);
    console.log(`Updated: ${updatedCount} projects (version bumps)`);
    console.log(`Skipped: ${skippedCount} (non-CDK or invalid)`);
    console.log('Done! 🎉');
  } catch (error) {
    if (error instanceof PackageUpdateError) {
      console.error('Error updating packages:', error.message);
      if (error.cause) {
        console.error('Caused by:', error.cause);
      }
    } else {
      console.error('Unexpected error:', error);
    }
    process.exit(1);
  }
}

// Export functions for testing or importing
export {
  updatePackages,
  findPackageJsonFiles,
  fetchJson,
  getCdkCliVersion,
  isOldFormat,
  isCdkTypescriptProject,
  isCdkCliOnly,
  migratePackageJson,
  updateVersions,
  migrateJestConfig,
  migrateCdkJson,
  removeSourceMapImports,
  migrateTsconfig,
  fetchLatestVersions,
  PackageUpdateError,
  NEW_JEST_CONFIG,
  NEW_TSCONFIG,
};

export type { PackageJson, LatestVersions };
