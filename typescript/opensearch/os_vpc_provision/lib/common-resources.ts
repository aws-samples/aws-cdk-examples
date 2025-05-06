import * as cdk from 'aws-cdk-lib';
import {Aws, Duration, RemovalPolicy} from 'aws-cdk-lib';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import {CfnIdentityPoolRoleAttachment} from 'aws-cdk-lib/aws-cognito';
import {Construct} from 'constructs';
import * as ec2 from "aws-cdk-lib/aws-ec2";

export interface CommonResourcesConstructProps {

}

export class CommonResources extends Construct {
  public readonly cognitoUserPool: cognito.UserPool;
  public readonly cognitoUserPoolAppClient: cognito.UserPoolClient;
  public readonly cognitoIdentityPool: cognito.CfnIdentityPool;
  public readonly cognitoIdentityPoolPolicy: cognito.CfnIdentityPoolRoleAttachment;
  public readonly cognitoEndpoint: string;
  public readonly vpc: ec2.Vpc;

  constructor(scope: Construct, id: string, props: CommonResourcesConstructProps) {
    super(scope, id);

    // VPC
    const vpc = new ec2.Vpc(this, "Vpc", {
      vpcName: `${Aws.STACK_NAME}-vpc`,
    });
    this.vpc = vpc;

    // Create Cognito User Pool
    const userPool = new cognito.UserPool(this, 'CognitoUserPool', {
      accountRecovery: cognito.AccountRecovery.EMAIL_ONLY,
      advancedSecurityMode: cognito.AdvancedSecurityMode.OFF,
      autoVerify: {
        email: true,
      },
      deletionProtection: false,
      enableSmsRole: false,
      keepOriginal: {
        email: true,
      },
      mfa: cognito.Mfa.OFF,
      passwordPolicy: {
        requireDigits: true,
        minLength: 12,
        requireLowercase: true,
        requireUppercase: true,
        requireSymbols: true,
        tempPasswordValidity: Duration.days(7),
      },
      removalPolicy: RemovalPolicy.DESTROY,
      selfSignUpEnabled: false,
      signInAliases: {
        username: false,
        email: true,
      },
      signInCaseSensitive: false, // Since email address are not case sensitive
      standardAttributes: {
        email: {
          required: true,
          mutable: true,
        },
      },
      userInvitation: {
        // Settings for an admin signing up someone else’s email for an account
        emailSubject: 'Invite to join Opensearch CDK Example',
        emailBody:
          'Hello {username}, you have been invited to join Opensearch CDK Example! Your temporary password is {####}',
        smsMessage:
          'Hello {username}, your temporary password for Opensearch CDK Example is {####}',
      },
      userPoolName: `${Aws.STACK_NAME}-UserPool`,
      userVerification: {
        // Settings for a user signing themselves up
        emailSubject: 'Verify your email for Opensearch CDK Example',
        emailBody:
          'Thanks for signing up for Opensearch CDK Example: Your verification code is {####}',
        emailStyle: cognito.VerificationEmailStyle.CODE,
      },
    });

    this.cognitoUserPool = userPool;

    const appClient = userPool.addClient('AppClient', {
      accessTokenValidity: Duration.hours(1),
      authFlows: {
        userPassword: true,
        userSrp: true,
        custom: true,
      },
      disableOAuth: true,
      enableTokenRevocation: true,
      generateSecret: false,
      idTokenValidity: Duration.hours(1),
      preventUserExistenceErrors: true,
      readAttributes: new cognito.ClientAttributes().withStandardAttributes({
        email: true,
      }),
      refreshTokenValidity: Duration.days(30),
      supportedIdentityProviders: [],
      userPoolClientName: `${Aws.STACK_NAME}-CognitoAppClient`,
    });
    this.cognitoUserPoolAppClient = appClient;

    const domainPrefix = `${Aws.STACK_NAME}-${Aws.ACCOUNT_ID}`;

    userPool.addDomain("CognitoDomain", {
      cognitoDomain: {
        domainPrefix: domainPrefix,
      },
    });

    this.cognitoEndpoint =
        domainPrefix+
        ".auth." +
        cdk.Stack.of(this).region +
        ".amazoncognito.com";

    // Create cognito identitypool
    const identityPool = new cognito.CfnIdentityPool(this, "IdentityPool", {
      allowUnauthenticatedIdentities: true, // Must allow so frontend can log data to cloudfront
      identityPoolName: `${Aws.STACK_NAME}-identitypool`,
      cognitoIdentityProviders: [
        {
          clientId: appClient.userPoolClientId,
          providerName: userPool.userPoolProviderName,
        },
      ],
    });
    this.cognitoIdentityPool = identityPool;

    this.cognitoIdentityPoolPolicy = new CfnIdentityPoolRoleAttachment(
        this,
        'IdentityRoles',
        {
          identityPoolId: identityPool.ref,
          roles: {
            authenticated: "",
            unauthenticated: ""
          }
        },
    );

    // Create output for Cognito Userpool
    const userpool = new cdk.CfnOutput(this, 'CognitoUserPoolId', {
      value: userPool.userPoolId,
      description: 'Cognito Userpool ID',
    });

    userpool.overrideLogicalId('CognitoUserPoolId');

    const userpoolAppClient = new cdk.CfnOutput(this, 'CognitoUserPoolAppClient', {
      value: appClient.userPoolClientId,
      description: 'Cognito UserPool AppClient',
    });

    userpoolAppClient.overrideLogicalId('CognitoUserPoolAppClient');

    const userpoolDomain = new cdk.CfnOutput(this, 'CognitoUserPoolDomain', {
      value: this.cognitoEndpoint,
      description: 'Cognito Userpool Domain',
    });

    userpoolDomain.overrideLogicalId('CognitoUserPoolDomain');


  }
}
