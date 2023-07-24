import * as cdk from 'aws-cdk-lib';
import {
  aws_iam as iam,
  custom_resources as custom_resources,
  aws_logs as logs,
} from 'aws-cdk-lib';
import { Construct } from 'constructs';

/** Properties for EnableInspector2Resource. */
export interface Inspector2UpdateOrganizationConfigurationResourceProps extends cdk.ResourceProps {
  /** Defines which scan types are enabled automatically for new members of your Amazon Inspector organization. */
  readonly autoEnable: {
    ec2: boolean;
    ecr: boolean;
    lambda: boolean;
  };

  /**
   * The number of days log events of the singleton Lambda function implementing
   * this custom resource are kept in CloudWatch Logs.
   *
   * @default logs.RetentionDays.INFINITE
   */
  readonly logRetention?: logs.RetentionDays;
}

/** A Custom Resource construct for updating organization configuration for Amazon Inspector.
 * 
 * The organization configuration can only be changed on the delegated admin account.
 * 
 * For more details see https://docs.aws.amazon.com/inspector/latest/user/adding-member-accounts.html
 */
export class Inspector2UpdateOrganizationConfigurationResource extends cdk.Resource {
  constructor(scope: Construct, id: string, props: Inspector2UpdateOrganizationConfigurationResourceProps) {
    super(scope, id);
    const physicalResourceId = custom_resources.PhysicalResourceId.of((Buffer.from(JSON.stringify(props)).toString('base64')));
    const autoEnableSdkCall: custom_resources.AwsSdkCall = {
      service: 'Inspector2',
      action: 'updateOrganizationConfiguration',
      parameters: {
        autoEnable: {
          ...props.autoEnable,
        },
      },
      physicalResourceId,
    };

    new custom_resources.AwsCustomResource(this, 'Inspector2UpdateOrganizationConfigurationResource', {
      resourceType: 'Custom::Inspector2OrganizationConfiguration',
      policy: custom_resources.AwsCustomResourcePolicy.fromSdkCalls({
        resources: custom_resources.AwsCustomResourcePolicy.ANY_RESOURCE,
      }),
      onCreate: autoEnableSdkCall,
      onUpdate: autoEnableSdkCall,
       // onDelete: Not needed,
      logRetention: props.logRetention,
      installLatestAwsSdk: true,
    });
  }
}
