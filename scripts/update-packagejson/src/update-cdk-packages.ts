#!/usr/bin/env tsx

import { readFile, writeFile } from 'node:fs/promises';
import { opendir } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { setTimeout as sleep } from 'node:timers/promises';

interface PackageJson {
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  [key: string]: unknown;
}

interface CdkVersion {
  version: string;
}

type DependencyUpdates = {
  dependencies: Record<string, string>;
  devDependencies: Record<string, string>;
};

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
        // Extract just the version number from the output (e.g., "2.1004.0" from "2.1004.0 (build f0ad96e)")
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
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout

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
      await sleep(attempt * 1000); // Exponential backoff
    }
  }
  throw new PackageUpdateError('Unreachable code path');
}

// Utility function to find all package.json files using async iterator
async function findPackageJsonFiles(startPath: string): Promise<string[]> {
  const results: string[] = [];

  async function* walk(dir: string): AsyncGenerator<string> {
    try {
      for await (const entry of await opendir(dir)) {
        const fullPath = join(dir, entry.name);
        if (entry.isDirectory() && entry.name !== 'node_modules') {
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

// Function to update a single package.json file
async function updatePackageJson(
  filePath: string,
  updates: DependencyUpdates
): Promise<void> {
  try {
    const fileContent = await readFile(filePath, { encoding: 'utf8' });
    const content = JSON.parse(fileContent) as PackageJson;
    let updated = false;

    // Helper function to update dependencies
    const updateDeps = (
      depType: 'dependencies' | 'devDependencies',
      updates: Record<string, string>
    ) => {
      if (!content[depType]) return;

      for (const [pkg, version] of Object.entries(updates)) {
        if (content[depType]![pkg] && content[depType]![pkg] !== version) {
          content[depType]![pkg] = version;
          console.log(`Updated ${pkg} to ${version} in ${filePath}`);
          updated = true;
        }
      }
    };

    // Update both types of dependencies
    updateDeps('dependencies', updates.dependencies);
    updateDeps('devDependencies', updates.devDependencies);

    if (updated) {
      await writeFile(filePath, JSON.stringify(content, null, 2) + '\n');
    }
  } catch (error) {
    throw new PackageUpdateError(
      `Error updating ${filePath}`,
      { cause: error instanceof Error ? error : new Error(String(error)) }
    );
  }
}

// Main function
async function updatePackages(repoRoot: string): Promise<void> {
  console.log('Fetching latest versions from AWS CDK repositories...');

  try {
    // Fetch all required data in parallel with AbortController
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout

    const [templatePackage, cdkVersion, constructsPackage] = await Promise.all([
      fetchJson<PackageJson>(URLS.templatePackage),
      fetchJson<CdkVersion>(URLS.cdkVersion),
      fetchJson<PackageJson>(URLS.constructsPackage)
    ]);

    clearTimeout(timeoutId);

    // Get the CDK version by running the CLI command
    const cdkCliVersion = await getCdkCliVersion();
    console.log(`Detected CDK CLI version: ${cdkCliVersion}`);

    // Define the dependencies to update
    const updates: DependencyUpdates = {
      devDependencies: {
        '@types/jest': templatePackage.devDependencies?.['@types/jest'] ?? '',
        '@types/node': templatePackage.devDependencies?.['@types/node'] ?? '',
        'jest': templatePackage.devDependencies?.jest ?? '',
        'ts-jest': templatePackage.devDependencies?.['ts-jest'] ?? '',
        'ts-node': templatePackage.devDependencies?.['ts-node'] ?? '',
        'typescript': templatePackage.devDependencies?.typescript ?? '',
        'aws-cdk': cdkCliVersion
      },
      dependencies: {
        'aws-cdk-lib': cdkVersion.version,
        'constructs': constructsPackage.devDependencies?.constructs ?? ''
      }
    };

    // Validate that we got all the versions we need
    const missingVersions = [
      ...Object.entries(updates.dependencies),
      ...Object.entries(updates.devDependencies)
    ].filter(([, version]) => !version);

    if (missingVersions.length > 0) {
      throw new PackageUpdateError(
        `Missing versions for: ${missingVersions.map(([pkg]) => pkg).join(', ')}`
      );
    }

    // Find all package.json files
    const searchPath = resolve(repoRoot);
    console.log(`Searching for package.json files in ${searchPath}...`);
    const packageFiles = await findPackageJsonFiles(searchPath);

    console.log(`Found ${packageFiles.length} package.json files to update.`);

    // Update all package.json files in parallel with concurrency limit
    const concurrencyLimit = 5;
    for (let i = 0; i < packageFiles.length; i += concurrencyLimit) {
      const batch = packageFiles.slice(i, i + concurrencyLimit);
      await Promise.all(
        batch.map(filePath => updatePackageJson(filePath, updates))
      );
    }

    console.log('Package updates completed successfully! 🎉');
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
  updatePackageJson,
  findPackageJsonFiles,
  fetchJson,
  getCdkCliVersion,
  PackageUpdateError
};
