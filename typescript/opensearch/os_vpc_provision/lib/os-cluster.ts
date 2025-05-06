import { Aws, CfnOutput, Duration, RemovalPolicy } from "aws-cdk-lib";
import * as cognito from "aws-cdk-lib/aws-cognito";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import {
  ManagedPolicy,
  PolicyStatement,
  Role,
  ServicePrincipal,
  WebIdentityPrincipal
} from "aws-cdk-lib/aws-iam";
import { Domain, EngineVersion, TLSSecurityPolicy} from "aws-cdk-lib/aws-opensearchservice";
import { Construct } from "constructs";
import {CfnIdentityPoolRoleAttachment} from "aws-cdk-lib/aws-cognito";

export interface OSClusterConstructProps {
  readonly vpc: ec2.Vpc;
  readonly userPool: cognito.UserPool;
  readonly identityPool: cognito.CfnIdentityPool;
  readonly identityPoolPolicy: CfnIdentityPoolRoleAttachment;
  readonly cognitoEndpoint: string;
}


export class OSCluster extends Construct {
  public os_region: string;
  public os_endpoint: string;
  public os_domain_name: string;
  public os_domain_arn: string;
  constructor(scope: Construct, id: string, props: OSClusterConstructProps) {
    super(scope, id);

    let vpcCidrBlock = props.vpc.vpcCidrBlock;
    let splitVpcCidrBlock = vpcCidrBlock.split("/");
    const baseVpcIPAddress = splitVpcCidrBlock[0];

    const cognitoAuthRole = new Role(this, "cognitoAuthRole", {
      assumedBy: new WebIdentityPrincipal(
        "cognito-identity.amazonaws.com"
      ).withConditions({
        StringEquals: {
          "cognito-identity.amazonaws.com:aud": props.identityPool.ref,
        },
        "ForAnyValue:StringLike": {
          "cognito-identity.amazonaws.com:amr": "authenticated",
        },
      }),
    });

    const cognitoAuthRolePolicy = new PolicyStatement({
      actions: ["cognito-identity:GetCredentialsForIdentity"],
      resources: ["*"],
    });

    cognitoAuthRole.addToPolicy(cognitoAuthRolePolicy);

    const cognitoUnAuthRole = new Role(this, "cognitoUnAuthRole", {
          assumedBy: new WebIdentityPrincipal(
            "cognito-identity.amazonaws.com"
          ).withConditions({
            StringEquals: {
              "cognito-identity.amazonaws.com:aud": props.identityPool.ref,
            },
            "ForAnyValue:StringLike": {
              "cognito-identity.amazonaws.com:amr": "unauthenticated",
            },
          }),
        });

        const cognitoUnAuthRolePolicy = new PolicyStatement({
          actions: ["cognito-identity:GetCredentialsForIdentity"],
          resources: ["*"],
        });

        cognitoUnAuthRole.addToPolicy(cognitoUnAuthRolePolicy);

    props.identityPoolPolicy.roles.authenticated = cognitoAuthRole.roleArn;
      props.identityPoolPolicy.roles.unauthenticated = cognitoUnAuthRole.roleArn;

    const opensearchCognitoRole = new Role(this, "opensearchCognitoRole", {
      assumedBy: new ServicePrincipal("es.amazonaws.com"),
    });
    // Add a managed policy to a role you can use
    opensearchCognitoRole.addManagedPolicy(
      ManagedPolicy.fromAwsManagedPolicyName(
        "AmazonOpenSearchServiceCognitoAccess"
      )
    );

    const securityGroup = new ec2.SecurityGroup(this, "nginxProxyServer-sg", {
      vpc: props.vpc,
      allowAllOutbound: true,
      description: "Nginx and Opensearch Security group",
    });

    // OpenSearch domain
    const domain = new Domain(this, "Domain", {
      version: EngineVersion.openSearch('2.9'),
      domainName: `${Aws.STACK_NAME}-domain`,
      nodeToNodeEncryption: true,
      enforceHttps: true,
      tlsSecurityPolicy: TLSSecurityPolicy.TLS_1_2,
      encryptionAtRest: {
        enabled: true,
      },
      vpc: props.vpc,
      capacity: {
        dataNodes: 2,
        multiAzWithStandbyEnabled: false,
        dataNodeInstanceType: 't3.medium.search'
      },
      removalPolicy: RemovalPolicy.DESTROY,
      zoneAwareness: {
        enabled: true,
        availabilityZoneCount: 2,
      },
      securityGroups: [securityGroup],
      cognitoDashboardsAuth: {
        identityPoolId: props.identityPool.ref,
        userPoolId: props.userPool.userPoolId,
        role: opensearchCognitoRole,
      },
    });

    domain.addAccessPolicies(
      new PolicyStatement({
        principals: [cognitoAuthRole],
        actions: ["es:ESHttp*"],
        resources: [domain.domainArn + "/*"],
      })
    );

    //add EC2 Nginx proxy server
    securityGroup.addIngressRule(
      ec2.Peer.anyIpv4(),
      ec2.Port.tcp(443),
      "HTTPS from anywhere"
    );

    const instance = new ec2.Instance(this, "nginxProxyServer", {
      vpc: props.vpc,
      instanceType: ec2.InstanceType.of(
        ec2.InstanceClass.T3,
        ec2.InstanceSize.MEDIUM
      ),
      machineImage: new ec2.AmazonLinuxImage({
        generation: ec2.AmazonLinuxGeneration.AMAZON_LINUX_2,
      }),
      vpcSubnets: { subnetType: ec2.SubnetType.PUBLIC },
      securityGroup: securityGroup,
      init: ec2.CloudFormationInit.fromConfigSets({
        configSets: {
          default: ["installNginx", "copyConfig", "config"],
        },
        configs: {
          installNginx: new ec2.InitConfig([
            ec2.InitFile.fromFileInline(
              "/etc/install.sh",
              "./lib/install.sh"
            ),
            ec2.InitCommand.shellCommand("chmod +x /etc/install.sh"),
            ec2.InitCommand.shellCommand("/etc/install.sh"),
          ]),
          copyConfig: new ec2.InitConfig([
            ec2.InitFile.fromObject("/etc/config.json", {
              OS_DOMAIN_HOST: domain.domainEndpoint,
              COGNITO_HOST: props.cognitoEndpoint,
              VPC_BASE_IP: baseVpcIPAddress,
            }),
          ]),
          config: new ec2.InitConfig([
            ec2.InitFile.fromFileInline(
              "/etc/nginx/conf.d/default.conf",
              "./lib/default.conf"
            ),
            ec2.InitFile.fromFileInline(
              "/etc/config_nginx.sh",
              "./lib/config_nginx.sh"
            ),
            ec2.InitCommand.shellCommand("chmod +x /etc/config_nginx.sh"),
            ec2.InitCommand.shellCommand("/etc/config_nginx.sh"),
          ]),
        },
      }),
      initOptions: {
        timeout: Duration.minutes(15),
      },
    });

    this.os_region = `${Aws.REGION}`
    this.os_endpoint = "https://" + domain.domainEndpoint
    this.os_domain_name = domain.domainName
    this.os_domain_arn = domain.domainArn

    // Outputs
    const osDomainHost = new CfnOutput(this, "OpenSearchDomainHost", {
      value: domain.domainEndpoint,
    });
    osDomainHost.overrideLogicalId('OpenSearchDomainHost');


    const dashboardUrl = new CfnOutput(this, "NginxOpensearchDashboardUrl", {
      value: "https://" + instance.instancePublicDnsName,
    });
    dashboardUrl.overrideLogicalId('NginxOpensearchDashboardUrl');
  }
}
