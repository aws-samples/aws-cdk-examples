import { CfnOutput, NestedStack, NestedStackProps } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as kms from 'aws-cdk-lib/aws-kms';
import * as cr from 'aws-cdk-lib/custom-resources';
import * as iam from 'aws-cdk-lib/aws-iam';

export interface Props extends NestedStackProps {
  tableName: string,
  keyReplicaRegions: string[],
  keyAlias?: string,
}

export class CMKStack extends NestedStack {
  private readonly keyArnExportPrefix: string = 'cmk-key-arn-';

  constructor(scope: Construct, id: string, props: Props) {
    super(scope, id, props);

    const keyId = new kms.CfnKey(this, 'multi-region-cmk', {
      keyPolicy: {
        'Version': '2012-10-17',
        'Statement': [
          {
            'Effect': 'Allow',
            'Principal': {
              'AWS': `arn:aws:iam::${this.account}:root`,
            },
            'Action': 'kms:*',
            'Resource': '*',
          },
        ],
      },
      description: `CMK for ${props.tableName} in ${this.region}`,
      enableKeyRotation: true,
      enabled: true,
      multiRegion: true,
    }).attrKeyId;

    new kms.CfnAlias(this, 'multi-region-cmk-alias', {
      aliasName: props.keyAlias ?? `alias/multi-region-cmk-for-ddb-table-${props.tableName}`,
      targetKeyId: keyId,
    })

    this.createKeyArnCFNOutput(this.region, keyId);
    props.keyReplicaRegions.forEach((replicaRegion: string) => this.createKeyReplica(replicaRegion, keyId));
  }

  private createKeyReplica(replicaRegion: string, keyId: string) {
    const awsSdkCall: cr.AwsSdkCall = {
      service: 'KMS',
      action: 'replicateKey',
      physicalResourceId: cr.PhysicalResourceId.of(
        'CustomResource::KeyReplicaCreation',
      ),
      parameters: {
        KeyId: keyId,
        ReplicaRegion: replicaRegion,
      },
    };

    new cr.AwsCustomResource(this, `${replicaRegion}-custom-resource`, {
      onCreate: awsSdkCall,
      onUpdate: awsSdkCall,
      policy: cr.AwsCustomResourcePolicy.fromStatements([
        new iam.PolicyStatement({
          effect: iam.Effect.ALLOW,
          actions: [
            'kms:*',
          ],
          resources: [
            '*',
          ],
        }),
      ]),
    });

    this.createKeyArnCFNOutput(replicaRegion, keyId);
  }

  private createKeyArnCFNOutput(keyRegion: string, keyId: string) {
    new CfnOutput(this, `${keyRegion}-key-arn`, {
      value: `arn:aws:kms:${keyRegion}:${this.account}:key/${keyId}`,
      exportName: `${this.keyArnExportPrefix}${keyRegion}`,
    });
  }

  public getKeyReplicaExportNames(region: string) {
    return `${this.keyArnExportPrefix}${region}`;
  }
}