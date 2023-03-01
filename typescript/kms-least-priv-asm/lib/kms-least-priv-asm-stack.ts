import * as cdk from 'aws-cdk-lib';
import { AccountPrincipal, ArnPrincipal, CompositePrincipal, Effect, ManagedPolicy, PolicyStatement, Role, ServicePrincipal } from 'aws-cdk-lib/aws-iam';
import { Key } from 'aws-cdk-lib/aws-kms';
import { Function, InlineCode, Runtime } from 'aws-cdk-lib/aws-lambda';
import { Secret } from 'aws-cdk-lib/aws-secretsmanager';
import { StringParameter } from 'aws-cdk-lib/aws-ssm';
import { Construct } from 'constructs';
import * as fs from "fs";

export class KmsLeastPrivAsmStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // -- 1. Create a KMS for Secrets Manager -- //

    const kmsKey = new Key(this, "SecretsManagerKMS", {
      alias: "kms/app1/secretsmanager" + this.stackName,
      description: "KMS to manage App1 keys in Secrets Manager",
    });
    const SecretsManagerPolicy = new PolicyStatement();
    SecretsManagerPolicy.addAnyPrincipal();
    SecretsManagerPolicy.addActions(
        'kms:Encrypt',
        'kms:Decrypt',
        'kms:ReEncrypt*',  
        'kms:CreateGrant',
        'kms:DescribeKey'
    );
    SecretsManagerPolicy.addResources('*');
    SecretsManagerPolicy.addCondition("StringEquals", {"kms:CallerAccount" : this.account});
    SecretsManagerPolicy.addCondition("StringEquals", {"kms:ViaService" : "secretsmanager." + this.region + ".amazonaws.com"});

    kmsKey.addToResourcePolicy(SecretsManagerPolicy);

    // -- 2. Create a randomly generated secret -- //

    const asmSecret = new Secret(this, "App1Secret", {
      secretName: "secret/for/lambda" + this.stackName,
      encryptionKey: kmsKey,
      generateSecretString: {
        secretStringTemplate: JSON.stringify({ database: "testDatabase", username: "testAppUser" }),
        generateStringKey: "password",
        excludeCharacters: '\"@/\\',
        passwordLength: 22
      },
    });

    // -- 3. Create a SSM parameter with ASM arn -- //

    const ssmParam = new StringParameter(this, "StringParameter", {
      description: "Some user-friendly description for App1 secrets",
      parameterName: "/path/to/asm/secrets/app1" + this.stackName,
      simpleName: false,
      stringValue: asmSecret.secretArn,
    });
    

    // -- 4. Create an IAM role used to fetch secret value via SSM parameter -- //

    const lambdaExeRole = new Role(this, "LambdaExecutionRole", {
      assumedBy: new CompositePrincipal(
        new ServicePrincipal("lambda.amazonaws.com"),
        new AccountPrincipal(this.account)
      ),      
    });

    // Then add the various resources we'll need

    lambdaExeRole.addManagedPolicy(ManagedPolicy.fromManagedPolicyArn(this, "AWSLambdaBasicExecutionRole", "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"));
    asmSecret.grantRead(lambdaExeRole);
    ssmParam.grantRead(lambdaExeRole);

    // Updating ASM resource policy to allow access to the secret

    asmSecret.addToResourcePolicy(
      new PolicyStatement({
        actions: [
          'secretsmanager:GetSecretValue',
          'secretsmanager:DescribeSecret',
          'secretsmanager:ListSecretVersionIds'
        ],
        effect: Effect.ALLOW,
          principals: [new ArnPrincipal(lambdaExeRole.roleArn)],
        resources: ['*']
      })
    );

    // -- 5. Create a lambda to fetch secret and use SSM parameter -- //

    const asmFetchLambda = new Function(this, "asmFetchLambda", {
      functionName: "asmFetchLambda" + this.stackName,
      description: "Sample lambda to check if an IAM role can fetch ASM secret",
      runtime: Runtime.PYTHON_3_9,
      handler: "index.lambda_handler",
      environment: {
          "SSMParaName": ssmParam.parameterName
      },
      code: new InlineCode(fs.readFileSync("./lambda/lambda_function.py", { encoding: "utf-8" })),
      role: lambdaExeRole,
    });

    new cdk.CfnOutput(this, "Sample Lambda Name", {
      value: asmFetchLambda.functionName,
        description: "The name of the Lambda function",
      exportName: "sampleLambdaName",
    });

  }
}
