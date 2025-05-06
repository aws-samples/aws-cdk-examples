#!/usr/bin/env node
/**
 * Script to build all TypeScript CDK projects in parallel
 * Using worker threads for maximum performance
 */
const fs = require('node:fs');
const fsPromises = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');
const { execSync, spawn } = require('node:child_process');
const { performance } = require('node:perf_hooks');
const { Worker, isMainThread, parentPort, workerData } = require('node:worker_threads');
const { createReadStream, createWriteStream } = require('node:fs');
const readline = require('node:readline');

// Configuration
const SCRIPT_DIR = __dirname;
const REPO_ROOT = path.dirname(SCRIPT_DIR);
const TYPESCRIPT_DIR = path.join(REPO_ROOT, 'typescript');
const BUILD_SCRIPT = path.join(SCRIPT_DIR, 'build-typescript.sh');
const TEMP_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'build-ts-'));

// Use 75% of available cores by default, configurable via env var
const MAX_PARALLEL = Math.max(1, Math.floor(os.cpus().length *
  (process.env.BUILD_CONCURRENCY ? parseFloat(process.env.BUILD_CONCURRENCY) : 0.75)));

/**
 * Find all TypeScript CDK projects using Node.js file system APIs
 */
async function findProjects() {
  console.log('Finding all TypeScript CDK projects...');
  
  const projects = [];
  
  // Recursive function to find cdk.json files
  async function findCdkJsonFiles(dir) {
    const entries = await fsPromises.readdir(dir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      
      // Skip node_modules and cdk.out directories
      if (entry.isDirectory() && 
          entry.name !== 'node_modules' && 
          entry.name !== 'cdk.out') {
        await findCdkJsonFiles(fullPath);
      } else if (entry.isFile() && entry.name === 'cdk.json') {
        projects.push(fullPath);
      }
    }
  }
  
  try {
    await findCdkJsonFiles(TYPESCRIPT_DIR);
    projects.sort(); // Sort for consistent order
    
    console.log(`Found ${projects.length} TypeScript CDK projects to build`);
    console.log(`Using concurrency: ${MAX_PARALLEL} parallel workers`);
    console.log('==============================');
    
    return projects;
  } catch (error) {
    console.error(`Error finding projects: ${error}`);
    return [];
  }
}

/**
 * Worker thread function to build a project
 */
async function workerBuildProject(data) {
  if (!parentPort) return;
  
  const { projectPath, buildScript, repoRoot, tempDir } = data;
  const projectDir = path.dirname(projectPath);
  const relPath = path.relative(repoRoot, projectDir);
  const safeFileName = relPath.replace(/\//g, '_');
  const logFile = path.join(tempDir, `${safeFileName}.log`);
  
  const startTime = performance.now();
  
  try {
    // Check for DO_NOT_AUTOTEST flag
    if (fs.existsSync(path.join(projectDir, 'DO_NOT_AUTOTEST'))) {
      parentPort.postMessage({
        type: 'result',
        result: {
          path: relPath,
          status: 'SKIPPED',
          duration: performance.now() - startTime,
          logFile
        }
      });
      return;
    }
    
    // Check for package.json
    const packageJsonPath = path.join(projectDir, 'package.json');
    if (!fs.existsSync(packageJsonPath)) {
      parentPort.postMessage({
        type: 'result',
        result: {
          path: relPath,
          status: 'SKIPPED',
          duration: performance.now() - startTime,
          logFile
        }
      });
      return;
    }
    
    // Get relative path to package.json
    const packageJsonRelPath = path.relative(repoRoot, packageJsonPath);
    
    // Create a write stream for the log file
    const logStream = createWriteStream(logFile);
    
    // Run the build script and capture output
    const command = `${buildScript} "${packageJsonRelPath}"`;
    const proc = spawn(command, [], { shell: true });
    
    // Pipe output to both the log file and capture it
    proc.stdout.pipe(logStream);
    proc.stderr.pipe(logStream);
    
    let output = '';
    proc.stdout.on('data', (data) => {
      output += data.toString();
    });
    
    proc.stderr.on('data', (data) => {
      output += data.toString();
    });
    
    // Wait for the process to complete
    const exitCode = await new Promise((resolve) => {
      proc.on('close', (code) => resolve(code || 0));
    });
    
    // Close the log stream
    logStream.end();
    
    // Send result back to main thread
    parentPort.postMessage({
      type: 'result',
      result: {
        path: relPath,
        status: exitCode === 0 ? 'SUCCESS' : 'FAILED',
        duration: performance.now() - startTime,
        logFile
      }
    });
  } catch (error) {
    // If the command fails, write the error to the log file and report failure
    try {
      fs.writeFileSync(logFile, `Error: ${error}`);
    } catch (e) {
      // Ignore error writing to log file
    }
    
    parentPort.postMessage({
      type: 'result',
      result: {
        path: relPath,
        status: 'FAILED',
        duration: performance.now() - startTime,
        logFile
      }
    });
  }
}

/**
 * Process warnings from logs using pure Node.js
 */
async function processWarnings(results) {
  const warnings = [];
  
  for (const result of results) {
    try {
      if (fs.existsSync(result.logFile)) {
        // Use readline to process the file line by line
        const fileStream = createReadStream(result.logFile);
        const rl = readline.createInterface({
          input: fileStream,
          crlfDelay: Infinity
        });
        
        for await (const line of rl) {
          if (line.toLowerCase().includes('[warning]')) {
            warnings.push(`[${result.path}] ${line.trim()}`);
          }
        }
      }
    } catch (error) {
      // Ignore file reading errors
    }
  }
  
  return [...new Set(warnings)]; // Remove duplicates
}

/**
 * Run builds using worker threads
 */
async function runBuildsWithWorkers(projects) {
  return new Promise((resolve) => {
    const results = [];
    let activeWorkers = 0;
    let projectIndex = 0;
    
    const startNextWorker = () => {
      if (projectIndex >= projects.length) {
        if (activeWorkers === 0) {
          resolve(results);
        }
        return;
      }
      
      const projectPath = projects[projectIndex++];
      activeWorkers++;
      
      const worker = new Worker(__filename, {
        workerData: {
          projectPath,
          buildScript: BUILD_SCRIPT,
          repoRoot: REPO_ROOT,
          tempDir: TEMP_DIR
        }
      });
      
      worker.on('message', (message) => {
        if (message.type === 'result') {
          const { result } = message;
          results.push(result);
          
          // Log the result
          let icon = '❓';
          if (result.status === 'SUCCESS') icon = '✅';
          if (result.status === 'FAILED') icon = '❌';
          if (result.status === 'SKIPPED') icon = '⏭️';
          
          const duration = result.status !== 'SKIPPED' ?
            ` (${(result.duration / 1000).toFixed(2)}s)` : '';
          console.log(`${icon} ${result.path}${duration}`);
        }
      });
      
      worker.on('error', (error) => {
        console.error(`Worker error for ${path.relative(REPO_ROOT, projectPath)}: ${error}`);
        results.push({
          path: path.relative(REPO_ROOT, projectPath),
          status: 'FAILED',
          duration: 0,
          logFile: ''
        });
        
        activeWorkers--;
        startNextWorker();
      });
      
      worker.on('exit', () => {
        activeWorkers--;
        startNextWorker();
      });
    };
    
    // Start initial batch of workers
    for (let i = 0; i < Math.min(MAX_PARALLEL, projects.length); i++) {
      startNextWorker();
    }
  });
}

/**
 * Read a file using pure Node.js
 */
async function readFile(filePath) {
  try {
    return await fsPromises.readFile(filePath, 'utf8');
  } catch (error) {
    return '';
  }
}

/**
 * Print build summary
 */
async function printSummary(results) {
  // Count results by status
  const counts = {
    SUCCESS: results.filter(r => r.status === 'SUCCESS').length,
    FAILED: results.filter(r => r.status === 'FAILED').length,
    SKIPPED: results.filter(r => r.status === 'SKIPPED').length
  };
  
  // Calculate total duration
  const totalDuration = results.reduce((sum, result) => sum + result.duration, 0) / 1000;
  
  // Sort projects by path
  const sortedResults = [...results].sort((a, b) => a.path.localeCompare(b.path));
  
  console.log('');
  console.log('==============================');
  console.log('BUILD SUMMARY');
  console.log('==============================');
  console.log(`Total: ${results.length} projects in ${totalDuration.toFixed(2)}s`);
  console.log(`✅ ${counts.SUCCESS} succeeded`);
  console.log(`❌ ${counts.FAILED} failed`);
  console.log(`⏭️ ${counts.SKIPPED} skipped`);
  
  console.log('');
  console.log('Project Status:');
  console.log('-----------------------------');
  
  // Group by status for better readability
  if (counts.SUCCESS > 0) {
    console.log('\nSuccessful builds:');
    for (const result of sortedResults.filter(r => r.status === 'SUCCESS')) {
      console.log(`✅ ${result.path} (${(result.duration / 1000).toFixed(2)}s)`);
    }
  }
  
  if (counts.SKIPPED > 0) {
    console.log('\nSkipped builds:');
    for (const result of sortedResults.filter(r => r.status === 'SKIPPED')) {
      console.log(`⏭️ ${result.path}`);
    }
  }
  
  if (counts.FAILED > 0) {
    console.log('\nFailed builds:');
    for (const result of sortedResults.filter(r => r.status === 'FAILED')) {
      console.log(`❌ ${result.path} (${(result.duration / 1000).toFixed(2)}s)`);
    }
  }
  
  // Process and display warnings
  const warnings = await processWarnings(results);
  if (warnings.length > 0) {
    console.log('');
    console.log('==============================');
    console.log('DEPRECATION WARNINGS');
    console.log('==============================');
    warnings.forEach(warning => console.log(warning));
  }
  
  // Print logs for failed builds
  const failedResults = results.filter(r => r.status === 'FAILED');
  if (failedResults.length > 0) {
    console.log('');
    console.log('Build logs for failed projects:');
    console.log('==============================');
    
    for (const result of failedResults) {
      console.log('');
      console.log(`Log for ${result.path}:`);
      console.log('-------------------------------------------');
      try {
        if (fs.existsSync(result.logFile)) {
          const logContent = await readFile(result.logFile);
          console.log(logContent);
        } else {
          console.log('Log file not found');
        }
      } catch (error) {
        console.log(`Error reading log file: ${error}`);
      }
      console.log('-------------------------------------------');
    }
  }
}

/**
 * Clean up temporary files
 */
async function cleanup() {
  try {
    await fsPromises.rm(TEMP_DIR, { recursive: true, force: true });
  } catch (error) {
    console.error(`Error cleaning up temporary directory: ${error}`);
  }
}

/**
 * Main function
 */
async function main() {
  const startTime = performance.now();
  
  try {
    // Register cleanup handler
    process.on('exit', () => {
      try {
        fs.rmSync(TEMP_DIR, { recursive: true, force: true });
      } catch (error) {
        // Ignore cleanup errors on exit
      }
    });
    
    process.on('SIGINT', () => {
      console.log('\nBuild process interrupted');
      process.exit(1);
    });
    
    // Check if build script exists and is executable
    if (!fs.existsSync(BUILD_SCRIPT)) {
      console.error(`Error: Build script not found at ${BUILD_SCRIPT}`);
      process.exit(1);
    }
    
    // Make build script executable if it's not
    try {
      fs.chmodSync(BUILD_SCRIPT, 0o755);
    } catch (error) {
      console.error(`Warning: Could not make build script executable: ${error}`);
    }
    
    // Find projects
    const projects = await findProjects();
    if (projects.length === 0) {
      console.log('No TypeScript CDK projects found.');
      return;
    }
    
    // Run builds
    const results = await runBuildsWithWorkers(projects);
    
    // Print summary
    await printSummary(results);
    
    // Log total execution time
    const totalTime = (performance.now() - startTime) / 1000;
    console.log(`\nTotal execution time: ${totalTime.toFixed(2)}s`);
    
    // Exit with error if any builds failed
    if (results.some(r => r.status === 'FAILED')) {
      process.exit(1);
    }
  } catch (error) {
    console.error(`Error: ${error}`);
    process.exit(1);
  } finally {
    await cleanup();
  }
}

// Worker thread entry point
if (!isMainThread) {
  workerBuildProject(workerData).catch(error => {
    console.error(`Worker error: ${error}`);
    process.exit(1);
  });
}
// Main thread entry point
else {
  main().catch(error => {
    console.error(`Unhandled error: ${error}`);
    process.exit(1);
  });
}
