/**
 * Utility function to normalize CloudFormation templates for consistent snapshot testing
 * across different environments (local vs CI/CD).
 * 
 * This function normalizes:
 * - Asset hashes in S3Key properties
 * - Any other environment-specific values that might change between runs
 */
export function normalizeTemplate(template: any): any {
  // Create a deep copy of the template to avoid modifying the original
  const templateCopy = JSON.parse(JSON.stringify(template));
  
  // Function to recursively traverse the template and normalize values
  function normalizeValues(obj: any) {
    if (!obj || typeof obj !== 'object') return;
    
    // Process object properties
    for (const key in obj) {
      // Normalize S3Key asset hashes
      if (key === 'S3Key' && typeof obj[key] === 'string' && /^[a-f0-9]{64}\.zip$/.test(obj[key])) {
        obj[key] = 'NORMALIZED_ASSET_HASH.zip';
      } 
      // Normalize S3Key asset hashes with different patterns
      else if (key === 'S3Key' && typeof obj[key] === 'string' && /^[a-f0-9]{64}$/.test(obj[key])) {
        obj[key] = 'NORMALIZED_ASSET_HASH';
      }
      // Normalize Docker image digests
      else if (key === 'ImageDigest' && typeof obj[key] === 'string' && obj[key].startsWith('sha256:')) {
        obj[key] = 'NORMALIZED_IMAGE_DIGEST';
      }
      // Recursively process nested objects and arrays
      else if (typeof obj[key] === 'object') {
        normalizeValues(obj[key]);
      }
    }
  }
  
  normalizeValues(templateCopy);
  return templateCopy;
}
