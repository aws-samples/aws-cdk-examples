import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as fs from 'fs';
import * as cr from 'aws-cdk-lib/custom-resources';

export class ConnectCdkStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    //generate an aliasID
    const connectInstanceName = this.account + cdk.Names.uniqueResourceName(this, {
      maxLength: 50
    });

    // Create an Amazon Connect instance
    const connectInstance = new cdk.aws_connect.CfnInstance(this, 'ConnectInstance', {
      instanceAlias: connectInstanceName,
      identityManagementType: 'CONNECT_MANAGED',
      attributes: {
        inboundCalls: true,
        outboundCalls: false,
        contactflowLogs: true
      },
    });

    // Lambda function
    const helloLambda = new cdk.aws_lambda.Function(this, 'HelloLambda', {
      runtime: cdk.aws_lambda.Runtime.PYTHON_3_12,
      handler: 'lambda_function.lambda_handler',
      code: cdk.aws_lambda.Code.fromAsset('./hellolambda'),
    });

    // main flow
    const connectContactFlow = new cdk.aws_connect.CfnContactFlow(this, 'ConnectPagerContactFlow', {
      instanceArn: connectInstance.attrArn,
      name: "MainFlow",
      type: "CONTACT_FLOW",
      content: fs.readFileSync('./callFlows/MainFlow.json', 'utf-8').toString()
        .replace("HelloLambdaArnValue", helloLambda.functionArn)
    });


    // map lambda to connect flows
    const connectInstanceFlowLambda = new cdk.aws_connect.CfnIntegrationAssociation(this, 'ConnectInstanceFlowLambda', {
      instanceId: connectInstance.attrArn,
      integrationArn: helloLambda.functionArn,
      integrationType: 'LAMBDA_FUNCTION'
    });

    // claim a number
    const connectNumber = new cdk.aws_connect.CfnPhoneNumber(this, 'ConnectPagerPhoneNumber', {
      targetArn: connectInstance.attrArn,
      countryCode: 'US',
      type: 'DID'
    });

    // associate the number using AwsCustomResource, doesn't appear to be any other way
    const associateNumber = new cr.AwsCustomResource(this, 'AssociateConnectNumber', {
      onUpdate: {
        service: 'Connect',
        action: 'AssociatePhoneNumberContactFlowCommand',
        parameters: {
          InstanceId: connectInstance.attrArn,
          ContactFlowId: connectContactFlow.attrContactFlowArn,
          PhoneNumberId: connectNumber.attrPhoneNumberArn,
        },
        physicalResourceId: cr.PhysicalResourceId.of(connectNumber.attrAddress)
      },
        onDelete: {
          service: 'Connect',
          action: 'DisassociatePhoneNumberContactFlowCommand',
          parameters: {
            InstanceId: connectInstance.attrArn,
            ContactFlowId: connectContactFlow.attrContactFlowArn,
            PhoneNumberId: connectNumber.attrPhoneNumberArn,
          },
          physicalResourceId: cr.PhysicalResourceId.of(connectNumber.attrAddress)
        },
      policy: cr.AwsCustomResourcePolicy.fromSdkCalls({
        resources: [connectContactFlow.attrContactFlowArn, connectNumber.attrPhoneNumberArn]
      })
    });
    
    new cdk.CfnOutput(this, 'connectPhoneNumberOutput', {
      value: connectNumber.attrAddress
    });
  }
}
