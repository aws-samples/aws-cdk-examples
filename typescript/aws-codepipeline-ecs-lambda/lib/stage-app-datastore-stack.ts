import * as cdk from 'aws-cdk-lib';
import { InstanceClass, InstanceSize, InstanceType, Vpc } from 'aws-cdk-lib/aws-ec2';
import { Key } from 'aws-cdk-lib/aws-kms';
import { AuroraMysqlEngineVersion, ClusterInstance, DatabaseCluster, DatabaseClusterEngine } from 'aws-cdk-lib/aws-rds';
import { Construct } from 'constructs';

interface vpcStackProps extends cdk.StackProps {
    readonly vpc: Vpc;
}

export class rdsAuroraStack extends cdk.Stack {
    constructor(scope: Construct, id: string, props: vpcStackProps) {
        super(scope, id, props);

        const kmskey = new Key(this, 'MyKey', {
            enableKeyRotation: true,
            rotationPeriod: cdk.Duration.days(180), // Default is 365 days
          });  

        const cluster = new DatabaseCluster(this, 'Database', {
            engine: DatabaseClusterEngine.auroraMysql({ version: AuroraMysqlEngineVersion.VER_3_03_0 }),
            writer: ClusterInstance.provisioned('writer', {
              instanceType: InstanceType.of(InstanceClass.R6G, InstanceSize.XLARGE4),
            }),
            serverlessV2MinCapacity: 6.5,
            serverlessV2MaxCapacity: 64,
            readers: [
              // will be put in promotion tier 1 and will scale with the writer
              ClusterInstance.serverlessV2('reader1', { scaleWithWriter: true }),
              // will be put in promotion tier 2 and will not scale with the writer
              ClusterInstance.serverlessV2('reader2'),
            ],
            credentials: { username: 'clusteradmin' },
            cloudwatchLogsExports: ["error"],
            vpc: props.vpc,
            storageEncrypted: true,
            storageEncryptionKey: kmskey
          });
}
}