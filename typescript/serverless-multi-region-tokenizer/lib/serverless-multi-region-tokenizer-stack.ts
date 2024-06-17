/*! 
Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
SPDX-License-Identifier: MIT-0
*/

import { Duration, Stack, StackProps, Tags } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as apigw from 'aws-cdk-lib/aws-apigateway';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as kms from 'aws-cdk-lib/aws-kms';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as route53 from 'aws-cdk-lib/aws-route53';
import * as logs from 'aws-cdk-lib/aws-logs';
import route53targets = require('aws-cdk-lib/aws-route53-targets');
import { Certificate, CertificateValidation } from 'aws-cdk-lib/aws-certificatemanager';
import { AuthorizationType, CfnAuthorizer, LambdaIntegration } from 'aws-cdk-lib/aws-apigateway';
import { UserPool } from 'aws-cdk-lib/aws-cognito';
import { CfnWebACL, CfnWebACLAssociation } from 'aws-cdk-lib/aws-wafv2';

//for importing lambda functions from the repo file system
import fs = require('fs');
import path = require('path');

//default table names etc
import { Constants } from '../lib/constants';
import { NagSuppressions } from 'cdk-nag';


export class VpcStack extends Stack {

  public readonly vpc: ec2.Vpc;
  public readonly kmsSecurityGroup : ec2.SecurityGroup;

  constructor(scope: Construct, id: string, props: StackProps) {
    super(scope, id, props);

    //------------networking-----------
    this.vpc = new ec2.Vpc(this, 'Tokenizer-VPC', {
      // 'cidr' configures the IP range and size of the entire VPC.
      // The IP space will be divided over the configured subnets.
      ipAddresses: ec2.IpAddresses.cidr('10.2.0.0/16'),
    
      // 'maxAzs' configures the maximum number of availability zones to use
      maxAzs: 3,

      // log all VPC traffic to CloudWatch
      flowLogs: { "Tokeniser-FlowLogs": {
        trafficType: ec2.FlowLogTrafficType.ALL 
        }
      },
    
      // 'subnetConfiguration' specifies the "subnet groups" to create.
      // Every subnet group will have a subnet for each AZ, so this
      // configuration will create `3 groups × 3 AZs = 9` subnets.
      subnetConfiguration: [
        {
          // 'subnetType' controls Internet access, as described above.
          subnetType: ec2.SubnetType.PUBLIC,
    
          // 'name' is used to name this particular subnet group. You will have to
          // use the name for subnet selection if you have more than one subnet
          // group of the same type.
          name: 'Ingress',
    
          // 'cidrMask' specifies the IP addresses in the range of of individual
          // subnets in the group. Each of the subnets in this group will contain
          // `2^(32 address bits - 24 subnet bits) - 2 reserved addresses = 254`
          // usable IP addresses.
          //
          // If 'cidrMask' is left out the available address space is evenly
          // divided across the remaining subnet groups.
          cidrMask: 24,
        },
        {
          cidrMask: 24,
          name: 'Application',
          subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
        }
      ],

      //allow all connections to dynamo to be private - using route table
      gatewayEndpoints: {
        DynamoDB: {
          service: ec2.GatewayVpcEndpointAwsService.DYNAMODB
        }
      },
      
    });
    NagSuppressions.addStackSuppressions(this, [
      { id: 'CdkNagValidationFailure', reason: 'Cidr block function.' } ]);


    //---- KMS interface endpoint ---   
    const KMSinterfaceSecurityGroup = new ec2.SecurityGroup(this, 'sg-KMS', {
      vpc: this.vpc,
      description: 'Holds KMS interface endpoint for lambda access',
      allowAllOutbound: true  //was false
    });

    this.kmsSecurityGroup = KMSinterfaceSecurityGroup;

    //add ENIs interface endpoint so that lambda can access KMS. These are placed in Application Subnets where Lambdas can use them
    const KMSEndpoint = this.vpc.addInterfaceEndpoint( 'KMSEndpoint', {
      service: ec2.InterfaceVpcEndpointAwsService.KMS,
      privateDnsEnabled: true,
      open: true,
      securityGroups: [KMSinterfaceSecurityGroup]
    });
    const ECREndpoint = this.vpc.addInterfaceEndpoint( 'ECREndpoint', {
      service: ec2.InterfaceVpcEndpointAwsService.ECR,
      privateDnsEnabled: true,
      open: true,
      securityGroups: [KMSinterfaceSecurityGroup]
    });

  }
}


export class MultiRegionStore extends Stack {

  //so that the table name can be shared to multiple stacks
  public readonly dynamodb: dynamodb.Table;

  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    //ddb - note - changing table name or partitionKey here requires changes to 2 lambdas
    this.dynamodb = new dynamodb.Table(this, id, {
      partitionKey: { name: Constants.ddbPartitionKey, type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,  //this allows the table to scale performance on-demand
      replicationRegions: [Constants.replicaRegion],  //where should the replica be stored?
      encryption: dynamodb.TableEncryption.AWS_MANAGED,  //encryption at rest uses AWS default, you can also use a customer-managed key (CMK)
      tableName: Constants.ddbTokenTable,  //this is the base name, CDK creates a unique one
      timeToLiveAttribute: 'TTL',  //used to expire old data, this specifies the field/column name holding the TTL info
      pointInTimeRecovery: true  //ensure we have 
    });

    Tags.of(this).add('Application', "Tokenizer" );
    Tags.of(this).add('data:classification', "Restricted" );
    Tags.of(this).add('compliance:framework', "PCI-DSS" );
  }
}



interface Stack2Props extends StackProps {
  vpc : ec2.Vpc,
  kmsSecurityGroup: ec2.SecurityGroup,
  tokenStore : dynamodb.Table,
  tokenPrefix : string
}



export class TokenizerStack extends Stack {

  //return api to caller to allow Route53 health checks to be setup
  public readonly api: apigw.RestApi;

  constructor(scope: Construct, id: string, props: Stack2Props) {
    super(scope, id, props);


    const vpc = props.vpc;
    const tokenStore = props.tokenStore;


    //Create a security group for the lambdas
    const lambdaSecurityGroup = new ec2.SecurityGroup(this, 'sg-lambdas', {
      vpc: vpc,
      description: 'Holds all lambdas for controlled access to KMS interface endpoint',
      allowAllOutbound: true
    });

  
    //lambdas for getting and setting
    //we use docker containers for lambda because the python cryptography code is binary
    //docker controls the access point of the functions
    //they are placed in the Application subnets
    const lambdaDecrypt = new lambda.DockerImageFunction(this, "decrypt-item", {
      functionName: "decrypt-item",
      code: lambda.DockerImageCode.fromImageAsset( path.join(__dirname, "lambda/decrypt-item") ),
      timeout: Duration.seconds(30),
      environment: {
        "ddbTokenTable": tokenStore.tableName,  //cdk generates a unique table name, so use it here
        "ddbPartitionKey": Constants.ddbPartitionKey,
        "kmsMultiRegionKeyId": Constants.kmsMultiRegionKeyId
      },
      securityGroups: [lambdaSecurityGroup],
      vpc: vpc,
      deadLetterQueueEnabled: true,
      reservedConcurrentExecutions: 100
    });
    NagSuppressions.addStackSuppressions(this, [
      { id: 'AwsSolutions-SQS3', reason: 'Failed lambda calls should be followed up, and use SSL to send failed messages.' } ]);
    NagSuppressions.addStackSuppressions(this, [
      { id: 'AwsSolutions-SQS4', reason: 'Failed lambda calls should be followed up, and use SSL to send failed messages.' } ]);
    


    const lambdaEncrypt = new lambda.DockerImageFunction(this, "encrypt-item", {
      functionName: "encrypt-item",
      code: lambda.DockerImageCode.fromImageAsset( path.join(__dirname, "lambda/encrypt-item") ),
      timeout: Duration.seconds(30),
      environment: {
        "ddbTokenTable": tokenStore.tableName,  //cdk generates a unique table name, so use it here
        "ddbPartitionKey": Constants.ddbPartitionKey,
        "kmsMultiRegionKeyId": Constants.kmsMultiRegionKeyId,
        "tokenPrefix": props.tokenPrefix
      },
      securityGroups: [lambdaSecurityGroup],
      vpc: vpc,
      deadLetterQueueEnabled: true,
      reservedConcurrentExecutions: 100
    });
    NagSuppressions.addResourceSuppressions(lambdaEncrypt, [
        { id: 'AwsSolutions-SQS3', reason: 'Failed encryption calls should be followed up, and use SSL to send failed messages.' } ]);


    const kmsMultiRegionCMK = kms.Key.fromLookup(this, "kmsMultiRegionCMK", {
      aliasName: 'alias/' + Constants.kmsMultiRegionKeyAlias
    });
    kmsMultiRegionCMK.grantEncrypt( lambdaEncrypt ); 
    kmsMultiRegionCMK.grantDecrypt( lambdaDecrypt );


    //security for DDB - minimum privilege
    tokenStore.grantReadData(lambdaDecrypt);
    tokenStore.grantWriteData(lambdaEncrypt);
  

    // Cognito User Pool with Email Sign-in Type.
    const userPool = new UserPool(this, 'userPool', {
      signInAliases: {
        email: true
      }
    });
    NagSuppressions.addResourceSuppressions(userPool, [
      { id: 'AwsSolutions-COG1', reason: 'A password policy should be considered if Cognito is used in production.' } ]);
    NagSuppressions.addResourceSuppressions(userPool, [
      { id: 'AwsSolutions-COG2', reason: 'MFA should be considered if Cognito is used in production.' } ]);
    NagSuppressions.addResourceSuppressions(userPool, [
      { id: 'AwsSolutions-COG3', reason: 'advancedSecurityMode should be considered if Cognito is used in production.' } ]);


    //ensure all APIGW traffic is logged
    const logGroup = new logs.LogGroup(this, "Tokeniser-ApiGatewayAccessLogs");
    const api = new apigw.RestApi(this, 'tokeniser', {
      deployOptions: {
        accessLogDestination: new apigw.LogGroupLogDestination(logGroup)
      }
    });
    this.api = api;
    NagSuppressions.addStackSuppressions( this, [
      { id: 'AwsSolutions-APIG2', reason: 'APIGW Request validation should be added for production.' } ]);
    NagSuppressions.addStackSuppressions( this, [
      { id: 'AwsSolutions-APIG6', reason: 'Add CloudWatch logging to each stage for production.' } ]);


    // Authorizer for the APIs that uses the
    // Cognito User pool to Authorize users.
    const authorizer = new CfnAuthorizer(this, 'cfnAuth', {
      restApiId: api.restApiId,
      name: 'TokenizerAPIAuthorizer',
      type: 'COGNITO_USER_POOLS',
      identitySource: 'method.request.header.Authorization',
      providerArns: [userPool.userPoolArn],
    });


    //    api.root.addMethod('ANY');
    //connect APIGW to Lambda and give access
    const tokens = api.root.addResource('tokens');
    tokens.addMethod('POST', new LambdaIntegration(lambdaEncrypt), {
      authorizationType: AuthorizationType.COGNITO,
      authorizer: {
        authorizerId: authorizer.ref
      }
    });
    
    const token = tokens.addResource('{tokenId}');
    token.addMethod('GET', new LambdaIntegration(lambdaDecrypt), {
      authorizationType: AuthorizationType.COGNITO,
      authorizer: {
        authorizerId: authorizer.ref
      }
    });
   

    //attach a WAF to the APIGW to provide DDoS protection, rate limiting etc
    //Web ACL
    const APIGatewayWebACL = new CfnWebACL(this, "APIGatewayWebACL", {
      name: "Tokeniser-api-gateway-webacl",
      description: "This is WebACL for Tokeniser Auth APi Gateway",
      scope: "REGIONAL",
      defaultAction: { block: {} },
      visibilityConfig: {
          metricName: "tokeniser-APIWebACL",
          cloudWatchMetricsEnabled: true,
          sampledRequestsEnabled: true
      },
      rules: [

          {
              name: "tokeniser-rateLimitRule",
              priority: 20,
              action: { block: {} },
              visibilityConfig: {
                  metricName: "tokeniser-rateLimitRule",
                  cloudWatchMetricsEnabled: true,
                  sampledRequestsEnabled: false
              },
              statement: {
                  rateBasedStatement: {
                      aggregateKeyType: "IP",
                      limit: 100
                  }
              }
          },
          {
              name: `tokeniser-api-auth-gateway-geolocation-rule`,
              priority: 30,
              action: { allow: {} },
              visibilityConfig: {
                  metricName: `tokeniser-AuthAPIGeoLocation`,
                  cloudWatchMetricsEnabled: true,
                  sampledRequestsEnabled: false
              },
              statement: {
                  geoMatchStatement: {
                      countryCodes: ['AU']
                  }
              }
          }      
          
      ]
    });


    
/*
  // Web ACL Association
  const APIGatewayWebACLAssociation = new CfnWebACLAssociation(this, "APIGatewayWebACLAssociation", {
      webAclArn: APIGatewayWebACL.attrArn,
      resourceArn: //arn:{partition}:apigateway:{region}::/restapis/{api-id}/stages/{stage-name}
        "arn:"+ props.env?.account +
        ":apigateway:" +
        props.env?.region + 
        "::/restapis/" +
        this.api.restApiId + 
        "/stages/prod" 
    });    
*/


    //attach APIGW to a DNS name with a https cert
    const myHostedZone = new route53.HostedZone(this, 'HostedZone', {
      zoneName: Constants.myApiSubdomain + '.' + Constants.myDomainName,
    });

    const certificate = new Certificate(this, 'api-certificate', {
      domainName: Constants.myApiSubdomain + '.' + Constants.myDomainName,
      validation: CertificateValidation.fromDns(myHostedZone)
    });
    
    api.addDomainName( Constants.myApiSubdomain + '.' + Constants.myDomainName, {
      domainName: Constants.myApiSubdomain + '.' + Constants.myDomainName,
      certificate
    });


    Tags.of(this).add('Application', "Tokenizer" );
  
  }  //end constructor

} //end class


//--------------------------------------------------------------------------------------------------------

interface DNSStackProps extends StackProps {
  api1: apigw.RestApi;
  api2: apigw.RestApi;
}


export class TokenizerStackDNSStack extends Stack {

  constructor(scope: Construct, id: string, props: DNSStackProps) {
    super(scope, id, props);

    const api1 = props.api1;
    const api2 = props.api2;
  
    //add latency-based routing to DNS

    //define the hosted zone first
    const zone = route53.HostedZone.fromLookup(this, 'zone', {domainName: Constants.myDomainName});

    const record = new route53.ARecord(this, 'A', {
        zone,
        recordName: Constants.myApiSubdomain,
        target: route53.RecordTarget.fromAlias(new route53targets.ApiGateway(api1))     
    });
    
    //const recordSet = (record.node.defaultChild as CfnRecordSet);
   // recordSet.failover = 'PRIMARY';

    
    Tags.of(this).add('Application', "Tokenizer" );
    
  }
}




