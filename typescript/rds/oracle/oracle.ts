import {
  CfnOutput,
  Stack,
  StackProps,
  Tags,
  App,
  Fn,
  Duration,
  RemovalPolicy,
} from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as rds from 'aws-cdk-lib/aws-rds';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import { Construct } from 'constructs';

export interface OracleProps extends StackProps {

  /**
   * VPC Id
   * @type {string}
   * @memberof OracleProps
   */
  readonly vpcId?: string;

  /**
   * List of Subnet
   * @type {string[]}
   * @memberof OracleProps
   */
  readonly subnetIds?: string[];


  /**
   * provide the name of the database
   * @type {string}
   * @memberof OracleProps
   */
  readonly dbName?: string;

  /**
   *
   * ec2.InstanceType.of(ec2.InstanceClass.BURSTABLE3, ec2.InstanceSize.LARGE)
   * @type {*}
   * @memberof OracleProps
   * @default ec2.InstanceType.of(ec2.InstanceClass.BURSTABLE3, ec2.InstanceSize.LARGE)
   */
  readonly instanceType?: any;

  /**
   * provide the version of the database (rds.OracleEngineVersion.VER_19_0_0_0_2021_04_R1)
   * @type {*}
   * @memberof OracleProps
   * @default rds.OracleEngineVersion.VER_19_0_0_0_2021_04_R1
   */
  readonly engineVersion?: any;

  /**
   * user name of the database
   * @type {str}
   * @memberof OracleProps
   * @default dbadmin
   */
  readonly oracleUsername?: string;

  /**
   * backup retention days for example 14
   * @type {number}
   * @memberof OracleProps
   * @default 14
   */
  readonly backupRetentionDays?: number;

  /**
   * backup window time 00:15-01:15
   * @type {string}
   * @memberof OracleProps
   * @default 00:15-01:15
   */

  readonly backupWindow?: string;

  /**
   *
   * maintenance time Sun:23:45-Mon:00:15
   * @type {string}
   * @memberof OracleProps
   * @default Sun:23:45-Mon:00:15
   */
  readonly preferredMaintenanceWindow?: string;

  /**
   *
   * list of ingress sources
   * @type {any []}
   * @memberof OracleProps
   */
  readonly ingressSources?: any[];
}

export class Oracle extends Stack {
  constructor(scope: Construct, id: string, props: OracleProps) {
    super(scope, id);

    // default database username
    var oracleUsername = "dbadmin";
    if (typeof props.oracleUsername !== 'undefined') {
      oracleUsername = "dbadmin";
    }
    var ingressSources = [];
    if (typeof props.ingressSources !== 'undefined') {
      ingressSources = props.ingressSources;
    }
    var engineVersion = rds.OracleEngineVersion.VER_19_0_0_0_2021_04_R1;
    if (typeof props.engineVersion !== 'undefined') {
      engineVersion = props.engineVersion;
    }

    const azs = Fn.getAzs();

    // vpc
    const vpc = ec2.Vpc.fromVpcAttributes(this, 'ExistingVPC', {
      vpcId: props.vpcId!,
      availabilityZones: azs,
    });

    // Subnets
    const subnets: any[] = [];

    for (let subnetId of props.subnetIds!) {
      const subid = subnetId
        .replace('_', '')
        .replace(' ', '');
      subnets.push(
        ec2.Subnet.fromSubnetAttributes(this, subid, {
          subnetId: subid,
        }),
      );
    }

    const vpcSubnets: ec2.SubnetSelection = {
      subnets: subnets,
    };

    const allAll = ec2.Port.allTraffic();
    const tcp1521 = ec2.Port.tcpRange(1521, 1521);
    const tcp1526 = ec2.Port.tcpRange(1526, 1526);
    const tcp1575 = ec2.Port.tcpRange(1575, 1575);

    const dbsg = new ec2.SecurityGroup(this, 'DatabaseSecurityGroup', {
      vpc: vpc,
      allowAllOutbound: true,
      description: id + 'Database',
      securityGroupName: id + 'Database',
    });

    dbsg.addIngressRule(dbsg, allAll, 'all from self');
    dbsg.addEgressRule(ec2.Peer.ipv4('0.0.0.0/0'), allAll, 'all out');

    const oracleConnectionPorts = [
      { port: tcp1521, description: 'tcp1521 Oracle' },
      { port: tcp1526, description: 'tcp1526 Oracle' },
      { port: tcp1575, description: 'tcp1575 Oracle' },
    ];

    for (let ingressSource of ingressSources!) {
      for (let c of oracleConnectionPorts) {
        dbsg.addIngressRule(ingressSource, c.port, c.description);
      }
    }

    const dbSubnetGroup = new rds.SubnetGroup(this, 'DatabaseSubnetGroup', {
      vpc: vpc,
      description: id + 'subnet group',
      vpcSubnets: vpcSubnets,
      subnetGroupName: id + 'subnet group',
    });

    const oracleSecret = new secretsmanager.Secret(this, 'OracleCredentials', {
      secretName: props.dbName + 'OracleCredentials',
      description: props.dbName + 'Oracle Database Crendetials',
      generateSecretString: {
        excludeCharacters: "\"@/\\ '",
        generateStringKey: 'password',
        passwordLength: 30,
        secretStringTemplate: JSON.stringify({username: oracleUsername}),
      },
    });

    const oracleCredentials = rds.Credentials.fromSecret(
      oracleSecret,
      oracleUsername,
    );

    const dbParameterGroup = new rds.ParameterGroup(this, 'ParameterGroup', {
      engine: rds.DatabaseInstanceEngine.oracleEe({
        version: engineVersion,
      }),
      parameters: { open_cursors: '2500' },
    });

    const oracleInstance = new rds.DatabaseInstance(this, 'OracleDatabase', {
      databaseName: props.dbName,
      instanceIdentifier: props.dbName,
      credentials: oracleCredentials,
      engine: rds.DatabaseInstanceEngine.oracleEe({
        version: engineVersion,
      }),
      backupRetention: Duration.days(7),
      allocatedStorage: 20,
      securityGroups: [dbsg],
      licenseModel: rds.LicenseModel.BRING_YOUR_OWN_LICENSE,
      allowMajorVersionUpgrade: true,
      autoMinorVersionUpgrade: true,
      instanceType: props.instanceType,
      vpcSubnets: vpcSubnets,
      vpc: vpc,
      removalPolicy: RemovalPolicy.RETAIN,
      multiAz: true,
      storageEncrypted: true,
      monitoringInterval: Duration.seconds(60),
      enablePerformanceInsights: true,
      cloudwatchLogsExports: ['trace', 'audit', 'alert', 'listener'],
      cloudwatchLogsRetention: logs.RetentionDays.ONE_MONTH,
      parameterGroup: dbParameterGroup,
      subnetGroup: dbSubnetGroup,
      preferredBackupWindow: props.backupWindow,
      preferredMaintenanceWindow: props.preferredMaintenanceWindow,
      publiclyAccessible: false,
    });

    oracleInstance.addRotationSingleUser();

    // Tags
    Tags.of(oracleInstance).add('Name', 'OracleDatabase', {
      priority: 300,
    });


    new CfnOutput(this, 'OracleEndpoint', {
      exportName: 'OracleEndPoint',
      value: oracleInstance.dbInstanceEndpointAddress,
    });

    new CfnOutput(this, 'OracleUserName', {
      exportName: 'OracleUserName',
      value: oracleUsername,
    });

    new CfnOutput(this, 'OracleDbName', {
      exportName: 'OracleDbName',
      value: props.dbName!,
    });
  }
}

const app = new App();

new Oracle(app, 'OracleStack', {
  env:{region:"us-east-2"}, description:"Oracle Stack",
  vpcId:"vpc-aaaaaaaa",
  subnetIds:["subnet-xxxxxxxx", "subnet-yyyyyyyy", "subnet-zzzzzzzz"],
  dbName:"sampledb"
});
