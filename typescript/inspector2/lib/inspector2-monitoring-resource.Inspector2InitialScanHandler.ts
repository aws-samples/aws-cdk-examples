import * as AWSLambda from 'aws-lambda';

export interface InitialScan {
  'scan-status': string | undefined;
  'repository-name': string | undefined;
  'finding-severity-counts': {
    'CRITICAL': number;
    'HIGH': number;
    'MEDIUM': number;
  };
  'image-digest': string | undefined;
  'image-tags': Array<string> | undefined;
  'instance-id': string | undefined;
  'tags'?: Record<string, string>;
}

export async function handler(event: AWSLambda.EventBridgeEvent<'Inspector2 Scan', InitialScan>) {
  console.log('Received Inspector2 Initial Scan Results');
  console.log(event.detail);
}
