# CDK Snapshot Testing Guide

This guide explains how to use the asset hash normalization utility for consistent CDK snapshot testing across different environments.

## Problem

CDK snapshot tests often fail in CI/CD environments because asset hashes change between different environments. This happens because:

- Asset hashes are generated based on content and environment variables
- Different machines or CI/CD environments produce different hashes
- This causes snapshot tests to fail even when there are no actual changes to the infrastructure

## Solution

We've created a utility function that normalizes asset hashes and other environment-specific values in CloudFormation templates before comparing them with snapshots.

## How to Use the Normalization Utility

### 1. Import the Utility

```typescript
import { normalizeTemplate } from '../../test-utils/normalize-template';
```

### 2. Apply Normalization Before Snapshot Comparison

```typescript
import { App } from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import { YourStack } from '../lib/your-stack';
import { normalizeTemplate } from '../../test-utils/normalize-template';

test('YourStack creates the expected resources', () => {
  const app = new App();
  const stack = new YourStack(app, 'TestStack');
  
  // Get the CloudFormation template
  const template = Template.fromStack(stack);
  
  // Normalize the template before snapshot comparison
  const normalizedTemplate = normalizeTemplate(template.toJSON());
  
  // Compare with snapshot
  expect(normalizedTemplate).toMatchSnapshot();
});
```

### 3. Update Existing Snapshots

After adding the normalization to your tests, update your snapshots:

```bash
npm test -- -u
```

### 4. TypeScript Configuration for External Utilities

When referencing the normalize-template utility from outside your project directory, you may need to update your `tsconfig.json` file:

```json
{
  "compilerOptions": {
    // Other options...
    "rootDir": "../..",
    "baseUrl": ".",
    "paths": {
      "../../test-utils/*": ["../../test-utils/*"]
    }
  },
  "exclude": [
    "node_modules",
    "cdk.out",
    "lib"
  ],
  "include": [
    "**/*.ts",
    "../../test-utils/**/*.ts"
  ]
}
```

Key changes:
- Set `rootDir` to include parent directories containing shared utilities
- Add `paths` mapping to resolve imports correctly
- Include the external utility files in the `include` section

This configuration allows TypeScript to compile files that reference utilities outside your project directory.

## What Gets Normalized

The utility currently normalizes:

1. **S3 Asset Keys**: Replaces asset hashes in S3Key properties
   - Pattern with extension: `[64 hex chars].zip` → `NORMALIZED_ASSET_HASH.zip`
   - Pattern without extension: `[64 hex chars]` → `NORMALIZED_ASSET_HASH`

2. **Docker Image Digests**: Replaces image digests
   - Pattern: `sha256:[digest]` → `NORMALIZED_IMAGE_DIGEST`

## Adding New Test Files

When creating new test files that use snapshot testing:

1. Import the normalization utility
2. Apply it to your template before comparing with snapshots
3. Update your snapshots with the `-u` flag

## Extending the Utility

If you encounter other environment-specific values that need normalization, you can extend the utility at `typescript/test-utils/normalize-template.ts`.

Example of adding a new normalization rule:

```typescript
// Inside the normalizeValues function
if (key === 'NewPropertyToNormalize' && typeof obj[key] === 'string' && /pattern-to-match/.test(obj[key])) {
  obj[key] = 'NORMALIZED_VALUE';
}
```

## Troubleshooting

If you're still seeing snapshot test failures:

1. **Check for new patterns**: There might be new types of asset hashes or environment-specific values that need normalization
2. **Verify imports**: Make sure you're importing and using the utility correctly
3. **Check snapshot updates**: Ensure you've updated your snapshots after adding normalization
4. **TypeScript configuration**: If you're getting compilation errors about files outside your project directory, check your tsconfig.json settings

## Best Practices

1. **Always normalize before snapshot comparison**: This ensures consistent results
2. **Update snapshots deliberately**: Only use the `-u` flag when you expect changes
3. **Review snapshot diffs**: When updating snapshots, review the changes to ensure they're expected
4. **Keep the utility updated**: As new patterns emerge, add them to the normalization utility

## Additional Resources

- [Jest Snapshot Testing Documentation](https://jestjs.io/docs/snapshot-testing)
- [AWS CDK Testing Documentation](https://docs.aws.amazon.com/cdk/v2/guide/testing.html)

## What Gets Normalized

The utility currently normalizes:

1. **S3 Asset Keys**: Replaces asset hashes in S3Key properties
   - Pattern with extension: `[64 hex chars].zip` → `NORMALIZED_ASSET_HASH.zip`
   - Pattern without extension: `[64 hex chars]` → `NORMALIZED_ASSET_HASH`

2. **Docker Image Digests**: Replaces image digests
   - Pattern: `sha256:[digest]` → `NORMALIZED_IMAGE_DIGEST`

## Adding New Test Files

When creating new test files that use snapshot testing:

1. Import the normalization utility
2. Apply it to your template before comparing with snapshots
3. Update your snapshots with the `-u` flag

## Extending the Utility

If you encounter other environment-specific values that need normalization, you can extend the utility at `typescript/test-utils/normalize-template.ts`.

Example of adding a new normalization rule:

```typescript
// Inside the normalizeValues function
if (key === 'NewPropertyToNormalize' && typeof obj[key] === 'string' && /pattern-to-match/.test(obj[key])) {
  obj[key] = 'NORMALIZED_VALUE';
}
```

## Troubleshooting

If you're still seeing snapshot test failures:

1. **Check for new patterns**: There might be new types of asset hashes or environment-specific values that need normalization
2. **Verify imports**: Make sure you're importing and using the utility correctly
3. **Check snapshot updates**: Ensure you've updated your snapshots after adding normalization

## Best Practices

1. **Always normalize before snapshot comparison**: This ensures consistent results
2. **Update snapshots deliberately**: Only use the `-u` flag when you expect changes
3. **Review snapshot diffs**: When updating snapshots, review the changes to ensure they're expected
4. **Keep the utility updated**: As new patterns emerge, add them to the normalization utility

## Additional Resources

- [Jest Snapshot Testing Documentation](https://jestjs.io/docs/snapshot-testing)
- [AWS CDK Testing Documentation](https://docs.aws.amazon.com/cdk/v2/guide/testing.html)
