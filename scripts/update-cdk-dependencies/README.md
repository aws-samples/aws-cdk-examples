# update-cdk-dependencies

Updates AWS CDK application dependencies to the versions and ranges recommended by the released `cdk init` templates.

The new CLI supports Python, Java, Go, and C#. It is a dry run by default and only discovers manifests that directly contain CDK application dependencies. Generated output and nested runtime projects are excluded.

## Target versions

The tool reads `lib/init-templates/.init-version.json` from its exact-pinned `aws-cdk` dependency and converts the recommended versions using the same ecosystem conventions as `cdk init`:

- Python: bounded PEP 440 ranges
- Java: bounded Maven ranges
- Go: exact CDK module version followed by Go module resolution
- C#: bounded `Amazon.CDK.Lib` range and Constructs major wildcard

Updating the pinned `aws-cdk` dependency updates the source template policy without hard-coding library versions in the adapters.

## Installation and validation

```bash
npm install
npm run lint
npm test
npm run build
```

## Usage

Build the tool, then pass the repository root:

```bash
node dist/index.js ../..
```

The default command scans every supported language without changing files.

```bash
# Scan selected languages
node dist/index.js ../.. --language python,java

# Apply Python updates
node dist/index.js ../.. --language python --write

# Fail when Java projects do not match the target policy
node dist/index.js ../.. --language java --check

# Produce machine-readable output
node dist/index.js ../.. --json
```

Options:

- `--language <name>` selects `python`, `java`, `go`, `csharp`, or `all`. It can be repeated or comma-separated.
- `--write` applies planned changes.
- `--check` exits with code 2 when updates or manual migrations are pending.
- `--json` emits the structured report.

`--write` and `--check` cannot be combined.

## Language behavior

### Python

Updates `aws-cdk-lib` and `constructs` in CDK application `requirements.txt` files. If the same application has a `pyproject.toml`, its project dependency strings are kept synchronized. Comments, environment markers, extras, and unrelated dependencies are preserved.

### Java

Updates `software.amazon.awscdk:aws-cdk-lib` and `software.constructs:constructs`. Property-backed and direct dependency versions are supported. The updater changes only version text and does not reserialize the POM.

### Go

Runs the equivalent of:

```bash
go get github.com/aws/aws-cdk-go/awscdk/v2@<target>
go mod tidy
```

The selected CDK module determines the compatible Constructs and jsii versions through Go module resolution. Both `go.mod` and `go.sum` are restored if either command fails. Go may also update other transitive dependencies or the module's Go directive.

### C#

Updates `Amazon.CDK.Lib` and `Constructs` PackageReferences without reformatting the project file. CDK v1 package references are reported as `manual-migration-required` because they require source and namespace changes.

## Discovery exclusions

The recursive scanner ignores `.git`, `.venv`, `bin`, `build`, `cdk.out`, `coverage`, `dist`, `node_modules`, `obj`, and `target` directories. A manifest without the language's CDK dependency is not treated as a CDK application.

## Legacy TypeScript updater

The previous TypeScript package migration behavior remains available through the compatibility executable after building:

```bash
node dist/legacy-index.js ../..
```

This compatibility path retains the original write behavior and upstream version lookup. It is intentionally separate from the new dry-run CLI.

## Development

- `npm run build` compiles production TypeScript.
- `npm run clean` removes build artifacts.
- `npm run lint` runs ESLint, including tests.
- `npm test` runs unit and fixture tests with coverage.

## License

ISC
