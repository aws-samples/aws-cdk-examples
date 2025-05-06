#!/usr/bin/env node

/**
 * update-packagejson
 * A utility for updating package.json files
 */

import { updatePackages } from './update-cdk-packages';

/**
 * Main function to update package.json files
 */
async function main(): Promise<void> {
  try {
    // Get the repository root path from command line arguments
    const repoRoot = process.argv[2];
    
    if (!repoRoot) {
      console.error('Error: Repository root path is required');
      console.error('Usage: update-packagejson <repository-root-path>');
      process.exit(1);
    }

    console.log('Package.json update utility');
    await updatePackages(repoRoot);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

// Run the main function
if (require.main === module) {
  main().catch((error) => {
    console.error('Unhandled error:', error);
    process.exit(1);
  });
}

// Export functions for testing or importing
export { main };
