import { Fn, NestedStack, NestedStackProps } from 'aws-cdk-lib';
import { Construct } from 'constructs/lib/construct';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
 
export interface ReplicaConfig {
  region: string,
  keyExportName: string,
}

interface Props extends NestedStackProps {
  tableName: string,
  tableReplicaRegions: ReplicaConfig[],
}
 
export class DynamoDBStack extends NestedStack {
  constructor(scope: Construct, id: string, props: Props) {
    super(scope, id, props);
 
    new dynamodb.CfnGlobalTable(this, 'global-table', {
      tableName: props.tableName,
      billingMode: 'PAY_PER_REQUEST',
      attributeDefinitions: [{
        attributeName: 'id',
        attributeType: 'S',
      }],
      keySchema: [{
        attributeName: 'id',
        keyType: 'HASH',
      }],
      replicas: props.tableReplicaRegions.map((replicaConfig: ReplicaConfig) => (
        {
          region: replicaConfig.region,
          sseSpecification: {
            kmsMasterKeyId: Fn.importValue(replicaConfig.keyExportName).toString(),
          },
        }
      )),
      sseSpecification: {
        sseEnabled: true,
        sseType: 'KMS',
      },
      streamSpecification: {
        streamViewType: 'KEYS_ONLY',
      },
    });
  }
}

