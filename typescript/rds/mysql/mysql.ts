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

export interface MysqlProps extends StackProps {

  /**
   * VPC Id
   * @type {string}
   * @memberof MysqlProps
   */
  readonly vpcId?: string;

  /**
   * List of Subnet
   * @type {string[]}
   * @memberof MysqlProps
   */
  readonly subnetIds?: string[];


  /**
   * provide the name of the database
   * @type {string}
   * @memberof MysqlProps
   */
  readonly dbName?: string;

  /**
   *
   * ec2.InstanceType.of(ec2.InstanceClass.BURSTABLE3, ec2.InstanceSize.LARGE)
   * @type {*}
   * @memberof MysqlProps
   * @default ec2.InstanceType.of(ec2.InstanceClass.BURSTABLE3, ec2.InstanceSize.LARGE)
   */
  readonly instanceType?: any;

  /**
   * provide the version of the database
   * @type {*}
   * @memberof MysqlProps
   * @default rds.MysqlEngineVersion.VER_8_0_28
   */
  readonly engineVersion?: any;

  /**
   * user name of the database
   * @type {str}
   * @memberof MysqlProps
   * @default dbadmin
   */
  readonly mysqlUsername?: string;

  /**
   * backup retention days for example 14
   * @type {number}
   * @memberof MysqlProps
   * @default 14
   */
  readonly backupRetentionDays?: number;

  /**
   * backup window time 00:15-01:15
   * @type {string}
   * @memberof MysqlProps
   * @default 00:15-01:15
   */

  readonly backupWindow?: string;

  /**
   *
   * maintenance time Sun:23:45-Mon:00:15
   * @type {string}
   * @memberof MysqlProps
   * @default Sun:23:45-Mon:00:15
   */
  readonly preferredMaintenanceWindow?: string;

  /**
   *
   * list of ingress sources
   * @type {any []}
   * @memberof MysqlProps
   */
  readonly ingressSources?: any[];
}

export class Mysql extends Stack {
  constructor(scope: Construct, id: string, props: MysqlProps) {
    super(scope, id);

    // default database username
    var mysqlUsername = "dbadmin";
    if (typeof props.mysqlUsername !== 'undefined') {
      mysqlUsername = props.mysqlUsername;
    }
    var ingressSources = [];
    if (typeof props.ingressSources !== 'undefined') {
      ingressSources = props.ingressSources;
    }
    var engineVersion = rds.MysqlEngineVersion.VER_8_0_28;
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
    const tcp3306 = ec2.Port.tcpRange(3306, 3306);

    const dbsg = new ec2.SecurityGroup(this, 'DatabaseSecurityGroup', {
      vpc: vpc,
      allowAllOutbound: true,
      description: id + 'Database',
      securityGroupName: id + 'Database',
    });

    dbsg.addIngressRule(dbsg, allAll, 'all from self');
    dbsg.addEgressRule(ec2.Peer.ipv4('0.0.0.0/0'), allAll, 'all out');

    const mysqlConnectionPorts = [
      { port: tcp3306, description: 'tcp3306 Mysql' },
    ];

    for (let ingressSource of ingressSources!) {
      for (let c of mysqlConnectionPorts) {
        dbsg.addIngressRule(ingressSource, c.port, c.description);
      }
    }

    const dbSubnetGroup = new rds.SubnetGroup(this, 'DatabaseSubnetGroup', {
      vpc: vpc,
      description: id + 'subnet group',
      vpcSubnets: vpcSubnets,
      subnetGroupName: id + 'subnet group',
    });

    const mysqlSecret = new secretsmanager.Secret(this, 'MysqlCredentials', {
      secretName: props.dbName + 'MysqlCredentials',
      description: props.dbName + 'Mysql Database Crendetials',
      generateSecretString: {
        excludeCharacters: "\"@/\\ '",
        generateStringKey: 'password',
        passwordLength: 30,
        secretStringTemplate: JSON.stringify({username: mysqlUsername}),
      },
    });

    const mysqlCredentials = rds.Credentials.fromSecret(
      mysqlSecret,
      mysqlUsername,
    );

    const dbParameterGroup = new rds.ParameterGroup(this, 'ParameterGroup', {
      engine: rds.DatabaseInstanceEngine.mysql({
        version: engineVersion,
      }),
    });



    const mysqlInstance = new rds.DatabaseInstance(this, 'MysqlDatabase', {
      databaseName: props.dbName,
      instanceIdentifier: props.dbName,
      credentials: mysqlCredentials,
      engine: rds.DatabaseInstanceEngine.mysql({
        version: engineVersion,
      }),
      backupRetention: Duration.days(7),
      allocatedStorage: 20,
      securityGroups: [dbsg],
      allowMajorVersionUpgrade: true,
      autoMinorVersionUpgrade: true,
      instanceType: props.instanceType,
      vpcSubnets: vpcSubnets,
      vpc: vpc,
      removalPolicy: RemovalPolicy.DESTROY,
      storageEncrypted: true,
      monitoringInterval: Duration.seconds(60),
      enablePerformanceInsights: true,
      parameterGroup: dbParameterGroup,
      subnetGroup: dbSubnetGroup,
      preferredBackupWindow: props.backupWindow,
      preferredMaintenanceWindow: props.preferredMaintenanceWindow,
      publiclyAccessible: false,
    });

    mysqlInstance.addRotationSingleUser();

    // Tags
    Tags.of(mysqlInstance).add('Name', 'MysqlDatabase', {
      priority: 300,
    });


    new CfnOutput(this, 'MysqlEndpoint', {
      exportName: 'MysqlEndPoint',
      value: mysqlInstance.dbInstanceEndpointAddress,
    });

    new CfnOutput(this, 'MysqlUserName', {
      exportName: 'MysqlUserName',
      value: mysqlUsername,
    });

    new CfnOutput(this, 'MysqlDbName', {
      exportName: 'MysqlDbName',
      value: props.dbName!,
    });
  }
}


const app = new App();

new Mysql(app, 'MysqlStack', {
  env:{region:"us-east-2"}, description:"Mysql Stack",
  vpcId:"vpc-aaaaaaaa",
  subnetIds:["subnet-xxxxxxxx", "subnet-yyyyyyyy", "subnet-zzzzzzzz"],
  dbName:"sampledb"
});

