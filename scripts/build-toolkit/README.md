# build-toolkit

TypeScript build runner for all CDK example projects using the [@aws-cdk/toolkit-lib](https://www.npmjs.com/package/@aws-cdk/toolkit-lib) for programmatic synthesis. Replaces the bash-based `build-*.sh` scripts with structured output and message capture.

## Supported Languages

- **TypeScript** - npm/yarn install → tsc build → jest test → synth
- **Python** - pip install in venv → synth (venv cleaned up after)
- **Java** - mvn compile → mvn test → synth
- **Go** - go build → go test → synth
- **C#/.NET** - dotnet build → synth

## What it does

For each CDK project discovered under the target directory:

1. Detects the language from project markers (package.json, requirements.txt, pom.xml, go.mod, *.csproj)
2. Runs the language-appropriate build pipeline
3. Runs programmatic `cdk synth` via `@aws-cdk/toolkit-lib` with a custom `IIoHost` that captures all warnings, deprecations, and errors
4. Projects with a `DO_NOT_AUTOTEST` file are skipped

## Usage

```bash
cd scripts/build-toolkit
npm install

# Build ALL languages from repo root
npx tsx src/index.ts ../..

# Build only one language
npx tsx src/index.ts ../.. --language typescript
npx tsx src/index.ts ../.. --language python

# With JSON report and custom concurrency
npx tsx src/index.ts ../.. --concurrency 4 --output /tmp/build-report.json

# Or point at a specific language directory
npx tsx src/index.ts ../../typescript
```

## CLI Options

| Option | Description | Default |
|--------|-------------|---------|
| `<dir>` | Root directory to scan for CDK projects (required) | - |
| `--language <lang>` | Filter to one language: typescript, python, java, go, csharp | _(all)_ |
| `--concurrency N` | Max parallel builds | `os.cpus().length / 2` |
| `--output <path>` | Write JSON report to file | _(none, console only)_ |

## Output

### Console

Live progress with emoji status per project as they complete:

```
Found 240 projects (230 buildable, 10 skipped)
Languages: typescript: 88, python: 78, java: 31, go: 25, csharp: 18
Concurrency: 8

⏭️  typescript/static-site (DO_NOT_AUTOTEST)
✅ python/lambda-cron
✅ typescript/lambda-cron
✅ go/lambda-cron
✅ typescript/ecs/cluster (1 warning)
❌ java/broken-project (build failed)

==============================
BUILD SUMMARY
==============================
Total: 240 (✅ 225 succeeded, ❌ 5 failed, ⏭️  10 skipped)
Duration: 342.1s

--- Warnings ---
⚠️  [warn at /MyFirstEcsCluster/MyFleet] desiredCapacity has been configured...
   in: typescript/ecs/cluster
```

### JSON Report

When `--output` is specified, writes a structured report with per-project steps, messages, timings, and language metadata.

## How synth works

Instead of shelling out to `cdk synth`, this tool uses the CDK Toolkit Library programmatically:

1. Reads the `app` command from each project's `cdk.json`
2. For Python projects, prepends venv activation to the app command
3. Creates a `Toolkit` instance with a custom `IIoHost` that collects all messages
4. Calls `toolkit.fromCdkApp(appCommand)` then `toolkit.synth(source)`
5. Copies `scripts/fake.context.json` when no `cdk.context.json` exists

The `IIoHost` captures messages at all levels (trace, debug, info, warn, error, result).

## Project structure

```
scripts/build-toolkit/
  src/
    index.ts          # CLI entry point, arg parsing
    types.ts          # TypeScript interfaces (Language, StepResult, etc.)
    discover.ts       # Find CDK projects, detect language, skip flags
    runner.ts         # Spawn child processes with timeout/capture
    build.ts          # Language-specific build pipelines
    synth.ts          # @aws-cdk/toolkit-lib synth with IIoHost
    orchestrator.ts   # Parallel execution with p-limit
    report.ts         # JSON report + console summary
```

## Exit code

Exits `1` if any project fails, `0` if all succeed (skipped projects don't count as failures).
