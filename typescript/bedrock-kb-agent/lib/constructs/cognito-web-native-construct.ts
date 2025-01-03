/**
 * Copyright 2023 Amazon.com, Inc. and its affiliates. All Rights Reserved.
 *
 * Licensed under the Amazon Software License (the "License").
 * You may not use this file except in compliance with the License.
 * A copy of the License is located at
 *
 *   http://aws.amazon.com/asl/
 *
 * or in the "license" file accompanying this file. This file is distributed
 * on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either
 * express or implied. See the License for the specific language governing
 * permissions and limitations under the License.
 */

import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";

/* eslint-disable @typescript-eslint/no-empty-interface */
export interface CognitoWebNativeConstructProps extends cdk.StackProps {}

const defaultProps: Partial<CognitoWebNativeConstructProps> = {};

/**
 * Deploys Cognito with an Authenticated & UnAuthenticated Role with a Web and Native client
 */
export class CognitoWebNativeConstruct extends Construct {
  public userPool: cdk.aws_cognito.UserPool;
  public webClientUserPool: cdk.aws_cognito.UserPoolClient;
  public nativeClientUserPool: cdk.aws_cognito.UserPoolClient;
  public userPoolId: string;
  public identityPoolId: string;
  public webClientId: string;
  public nativeClientId: string;
  public authenticatedRole: cdk.aws_iam.Role;
  public unauthenticatedRole: cdk.aws_iam.Role;

  constructor(
    parent: Construct,
    name: string,
    props: CognitoWebNativeConstructProps,
  ) {
    super(parent, name);

    /* eslint-disable @typescript-eslint/no-unused-vars */
    props = { ...defaultProps, ...props };

    const stack = cdk.Stack.of(this);
    const stackName = stack.stackName;

    const userPool = new cdk.aws_cognito.UserPool(this, "UserPool", {
      userPoolName: `UserPool${stackName}`,
      selfSignUpEnabled: false, // Prototype front-ends that are public to the internet should keep this value as false
      autoVerify: { email: true },
      userVerification: {
        emailSubject: "Verify your email the app!",
        emailBody:
          "Hello {username}, Thanks for signing up to the app! Your verification code is {####}",
        emailStyle: cdk.aws_cognito.VerificationEmailStyle.CODE,
        smsMessage:
          "Hello {username}, Thanks for signing up to app! Your verification code is {####}",
      },
      passwordPolicy: {
        minLength: 8,
        requireDigits: true,
        requireUppercase: true,
        requireSymbols: true,
        requireLowercase: true,
      },
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    const userPoolWebClient = new cdk.aws_cognito.UserPoolClient(
      this,
      "UserPoolWebClient",
      {
        generateSecret: false,
        userPool: userPool,
        userPoolClientName: "WebClient",
        authFlows: {
          userPassword: true,
          userSrp: true,
          custom: true,
        },
      },
    );

    const userPoolNativeClient = new cdk.aws_cognito.UserPoolClient(
      this,
      "UserPoolNativeClient",
      {
        generateSecret: true,
        userPool: userPool,
        userPoolClientName: "NativeClient",
      },
    );

    const identityPool = new cdk.aws_cognito.CfnIdentityPool(
      this,
      "IdentityPool",
      {
        allowUnauthenticatedIdentities: false,
        cognitoIdentityProviders: [
          {
            clientId: userPoolWebClient.userPoolClientId,
            providerName: userPool.userPoolProviderName,
          },
          {
            clientId: userPoolNativeClient.userPoolClientId,
            providerName: userPool.userPoolProviderName,
          },
        ],
      },
    );

    const unauthenticatedRole = new cdk.aws_iam.Role(
      this,
      "DefaultUnauthenticatedRole",
      {
        assumedBy: new cdk.aws_iam.FederatedPrincipal(
          "cognito-identity.amazonaws.com",
          {
            StringEquals: {
              "cognito-identity.amazonaws.com:aud": identityPool.ref,
            },
            "ForAnyValue:StringLike": {
              "cognito-identity.amazonaws.com:amr": "unauthenticated",
            },
          },
          "sts:AssumeRoleWithWebIdentity",
        ),
      },
    );

    const authenticatedRole = new cdk.aws_iam.Role(
      this,
      "DefaultAuthenticatedRole",
      {
        assumedBy: new cdk.aws_iam.FederatedPrincipal(
          "cognito-identity.amazonaws.com",
          {
            StringEquals: {
              "cognito-identity.amazonaws.com:aud": identityPool.ref,
            },
            "ForAnyValue:StringLike": {
              "cognito-identity.amazonaws.com:amr": "authenticated",
            },
          },
          "sts:AssumeRoleWithWebIdentity",
        ),
      },
    );

    new cdk.aws_cognito.CfnIdentityPoolRoleAttachment(
      this,
      "IdentityPoolRoleAttachment",
      {
        identityPoolId: identityPool.ref,
        roles: {
          unauthenticated: unauthenticatedRole.roleArn,
          authenticated: authenticatedRole.roleArn,
        },
      },
    );

    // Assign Cfn Outputs
    new cdk.CfnOutput(this, "UserPoolId", {
      value: userPool.userPoolId,
    });
    new cdk.CfnOutput(this, "IdentityPoolId", {
      value: identityPool.ref,
    });
    new cdk.CfnOutput(this, "WebClientId", {
      value: userPoolWebClient.userPoolClientId,
    });
    new cdk.CfnOutput(this, "NativeClientId", {
      value: userPoolNativeClient.userPoolClientId,
    });

    // Add SSM Parameters
    new cdk.aws_ssm.StringParameter(this, "COGNITO_USER_POOL_ID", {
      stringValue: userPool.userPoolId,
    });

    new cdk.aws_ssm.StringParameter(this, "COGNITO_IDENTITY_POOL_ID", {
      stringValue: identityPool.ref,
    });

    new cdk.aws_ssm.StringParameter(this, "COGNITO_WEB_CLIENT_ID", {
      stringValue: userPoolWebClient.userPoolClientId,
    });

    new cdk.aws_ssm.StringParameter(this, "COGNITO_NATIVE_CLIENT_ID", {
      stringValue: userPoolNativeClient.userPoolClientId,
    });

    // assign public properties
    this.userPool = userPool;
    this.webClientUserPool = userPoolWebClient;
    this.nativeClientUserPool = userPoolNativeClient;
    this.authenticatedRole = authenticatedRole;
    this.unauthenticatedRole = unauthenticatedRole;
    this.userPoolId = userPool.userPoolId;
    this.identityPoolId = identityPool.ref;
    this.webClientId = userPoolWebClient.userPoolClientId;
    this.nativeClientId = userPoolNativeClient.userPoolClientId;
  }
}
