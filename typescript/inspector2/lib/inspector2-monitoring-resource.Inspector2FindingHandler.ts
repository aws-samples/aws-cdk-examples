import {
  Finding
} from '@aws-sdk/client-inspector2';
import { EventBridgeEvent, EventBridgeHandler } from 'aws-lambda';

export const handler: EventBridgeHandler<'Inspector2 Finding', Finding, void> = async (event: EventBridgeEvent<'Inspector2 Finding', Finding>) => {
  console.log('Received Inspector2 Finding');
  const detail = event.detail;
  console.log(`[${detail.severity}] ${detail.awsAccountId} ${detail.title}  ${detail.type}`);
}
