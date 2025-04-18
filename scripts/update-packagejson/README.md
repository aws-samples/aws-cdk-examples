# update-packagejson

A utility for updating package.json files in AWS CDK projects to keep dependencies in sync with the latest versions.

## Prerequisites

- Node.js (LTS version, 18.x or later)
- npm or yarn

## Installation

```bash
npm install
```

## Usage

1. Build the project:

```bash
npm run build
```

2. Run the utility with the repository root path:

```bash
node dist/index.js /path/to/repository
```

For example:

```bash
node dist/index.js ../my-cdk-project
```

The utility will:
- Fetch the latest versions of AWS CDK dependencies from official sources
- Find all package.json files in the specified directory
- Update the dependencies to match the latest versions
- Only update files that need changes

## Development

- `npm run build` - Transpile TypeScript to JavaScript
- `npm run clean` - Remove build artifacts
- `npm run lint` - Run ESLint
- `npm test` - Run tests

## License

ISC
