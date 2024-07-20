import * as cdk from 'aws-cdk-lib';
import {
  aws_iam as iam,
  custom_resources as custom_resources,
  aws_logs as logs,
} from 'aws-cdk-lib';
import { Construct } from 'constructs';

/** Properties for EnableInspector2Resource. */
export interface Inspector2EnableResourceProps extends cdk.ResourceProps {
  /**
   * Resource types to enable Amazon Inspector 2 scans for
   *
   * @default - 'ECR', 'EC2', 'LAMBDA'
   */
  readonly resourceTypes?: string[];
  /**
   * The number of days log events of the singleton Lambda function implementing
   * this custom resource are kept in CloudWatch Logs.
   *
   * @default logs.RetentionDays.INFINITE
   */
  readonly logRetention?: logs.RetentionDays;
}

/** A Custom Resource construct for enabling Amazon Inspector 2 in a single AWS account.
 * Please note that update operation is not supported. If you need to change the resource
 * types you need to recreate the resource (it's not a destructive operation).
 * 
 * For more details see https://docs.aws.amazon.com/inspector/latest/user/what-is-inspector.html
 */
export class Inspector2EnableResource extends cdk.Resource {
  constructor(scope: Construct, id: string, props: Inspector2EnableResourceProps) {
    super(scope, id);

    const inspector2Resources = props.resourceTypes ?? ['ECR', 'EC2', 'LAMBDA'];
    const physicalResourceId = custom_resources.PhysicalResourceId.fromResponse('accounts.0.accountId');

    const customResourceRole = new iam.Role(this, 'InspectorRole', {
      assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaBasicExecutionRole'),
        iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonInspector2FullAccess'),
      ],
    });

    new custom_resources.AwsCustomResource(this, 'Inspector2EnableResource', {
      resourceType: 'Custom::Inspector2Enable',
      role: customResourceRole,
      onCreate: {
        service: 'Inspector2',
        action: 'enable',
        parameters: {
          resourceTypes: inspector2Resources,
        },
        physicalResourceId,
      },
      // onUpdate: NOT supported
      onDelete: {
        service: 'Inspector2',
        action: 'disable',
        physicalResourceId,
        parameters: {
          resourceTypes: inspector2Resources,
        },
      },
      installLatestAwsSdk: true,
      logRetention: props.logRetention,
    });
  }
}
