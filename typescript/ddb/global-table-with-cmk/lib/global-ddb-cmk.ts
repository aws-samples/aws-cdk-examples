import { Stack, StackProps } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { CMKStack } from './stacks/cmk-stack';
import { DynamoDBStack } from './stacks/dynamo-db-stack';

interface Props extends StackProps {
  tableName: string,
  replicationRegions: string[],
  keyAlias?: string,
}

export class GlobalDDBTableCMK extends Stack {
  constructor(scope: Construct, id: string, props: Props) {
    super(scope, id, props);

    const cmkStack = new CMKStack(this, 'cmk-stack', {
      tableName: props.tableName,
      keyReplicaRegions: props.replicationRegions,
      keyAlias: props.keyAlias
    });

    const ddbStack = new DynamoDBStack(this, 'ddb-stack', {
      tableName: props.tableName,
      tableReplicaRegions: [this.region, ...props.replicationRegions].map((region: string) => (
        {
          region,
          keyExportName: cmkStack.getKeyReplicaExportNames(region),
        }
      )),
    });

    ddbStack.addDependency(cmkStack);
  }
}