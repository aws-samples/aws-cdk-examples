import { App } from "aws-cdk-lib";
import { GatewayLambdaAuth } from "../../lib/stack/gateway-lambda-auth-stack";
import { Template } from "aws-cdk-lib/assertions";

/**
 * Normalizes asset hashes in CloudFormation templates to ensure consistent snapshots
 * across different environments (local vs CI/CD).
 */
function normalizeAssetHashes(template: any): any {
  // Create a deep copy of the template to avoid modifying the original
  const templateCopy = JSON.parse(JSON.stringify(template));
  
  // Function to recursively traverse the template and replace asset hashes
  function replaceAssetHashes(obj: any) {
    if (!obj || typeof obj !== 'object') return;
    
    // Process object properties
    for (const key in obj) {
      if (key === 'S3Key' && typeof obj[key] === 'string' && /^[a-f0-9]{64}\.zip$/.test(obj[key])) {
        // Replace asset hash with a constant placeholder
        obj[key] = 'NORMALIZED_ASSET_HASH.zip';
      } else if (typeof obj[key] === 'object') {
        // Recursively process nested objects and arrays
        replaceAssetHashes(obj[key]);
      }
    }
  }
  
  replaceAssetHashes(templateCopy);
  return templateCopy;
}

describe('Snapshot', () => {
    it('Stack', () => {
        const app = new App();
        const stack = new GatewayLambdaAuth(app, 'test-api-gateway-lambda-auth');
        const template = Template.fromStack(stack);
        
        // Normalize asset hashes before snapshot comparison
        const normalizedTemplate = normalizeAssetHashes(template.toJSON());
        expect(normalizedTemplate).toMatchSnapshot();
    });
})

