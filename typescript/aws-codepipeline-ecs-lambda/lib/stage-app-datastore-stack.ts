import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as rds from 'aws-cdk-lib/aws-rds';
import * as kms from 'aws-cdk-lib/aws-kms';

interface vpcStackProps extends cdk.StackProps {
    readonly vpc: ec2.Vpc;
}

export class rdsAuroraStack extends cdk.Stack {
    constructor(scope: Construct, id: string, props: vpcStackProps) {
        super(scope, id, props);

        const kmskey = new kms.Key(this, 'MyKey', {
            enableKeyRotation: true,
            rotationPeriod: cdk.Duration.days(180), // Default is 365 days
          });  

        const cluster = new rds.DatabaseCluster(this, 'Database', {
            engine: rds.DatabaseClusterEngine.auroraMysql({ version: rds.AuroraMysqlEngineVersion.VER_3_03_0 }),
            writer: rds.ClusterInstance.provisioned('writer', {
              instanceType: ec2.InstanceType.of(ec2.InstanceClass.R6G, ec2.InstanceSize.XLARGE4),
            }),
            serverlessV2MinCapacity: 6.5,
            serverlessV2MaxCapacity: 64,
            readers: [
              // will be put in promotion tier 1 and will scale with the writer
              rds.ClusterInstance.serverlessV2('reader1', { scaleWithWriter: true }),
              // will be put in promotion tier 2 and will not scale with the writer
              rds.ClusterInstance.serverlessV2('reader2'),
            ],
            credentials: { username: 'clusteradmin' },
            cloudwatchLogsExports: ["error"],
            vpc: props.vpc,
            storageEncrypted: true,
            storageEncryptionKey: kmskey
          });
}
}