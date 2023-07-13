import * as cdk from 'aws-cdk-lib';
import {
  aws_iam as iam,
  custom_resources as custom_resources,
  aws_logs as logs,
} from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { Inspector2EnableResource, Inspector2EnableResourceProps } from './inspector2-enable-resource';
import { Inspector2UpdateOrganizationConfigurationResource } from './inspector2-update-org-config-resource';

/** Properties for Inspector2EnableDelegatedAdminAccountResource. */
export interface Inspector2EnableDelegatedAdminAccountResourceProps extends cdk.ResourceProps {
  /**
   * The AWS account ID of the Amazon Inspector delegated administrator.
   */
  readonly delegatedAdminAccountId: string;

  /**
   * The number of days log events of the singleton Lambda function implementing
   * this custom resource are kept in CloudWatch Logs.
   *
   * @default logs.RetentionDays.INFINITE
   */
  readonly logRetention?: logs.RetentionDays;

  /** Properties for enabling Amazon Inspector 2 on the current account. */
  readonly inspector2EnableProps: Inspector2EnableResourceProps;

  /** Defines which scan types are enabled automatically for new members of your Amazon Inspector organization.
   * This is only used if the delegated admin account is the current account.
   */
  readonly autoEnable: {
    ec2: boolean;
    ecr: boolean;
    lambda: boolean;
  };
}

/**
 * A Custom Resource construct for enabling Amazon Inspector delegated administrator for your AWS Organizations organization.
 * 
 * The Custom Resource does three things:
 * - Enables Amazon Inspector
 * - Configures delegated administrator account
 * - If delegated account is current account: Updates organization configuration to auto-enable scan types
 * 
 * Note: Updating the resource (changing properties) is NOT supported due to how underlying APIs are implemented.
 * To change the properties, first delete the stack and then redeploy with new properties.
 * 
 * For more details see https://docs.aws.amazon.com/inspector/latest/user/designating-admin.html
 */
export class Inspector2EnableDelegatedAdminAccountResource extends cdk.Resource {
  constructor(scope: Construct, id: string, props: Inspector2EnableDelegatedAdminAccountResourceProps) {
    super(scope, id);

    const physicalResourceId = custom_resources.PhysicalResourceId.of((Buffer.from(JSON.stringify(props)).toString('base64')));

    // https://docs.aws.amazon.com/inspector/latest/user/designating-admin.html#delegated-admin-permissions
    const adminPolicy = new iam.PolicyDocument({
      statements: [new iam.PolicyStatement({
        sid: 'PermissionsForInspectorAdmin',
        effect: iam.Effect.ALLOW,
        actions: [
          'inspector2:EnableDelegatedAdminAccount',
          'inspector2:DisableDelegatedAdminAccount',
          'organizations:EnableAWSServiceAccess',
          'organizations:RegisterDelegatedAdministrator',
          'organizations:ListDelegatedAdministrators',
          'organizations:ListAWSServiceAccessForOrganization',
          'organizations:DescribeOrganizationalUnit',
          'organizations:DescribeAccount',
          'organizations:DescribeOrganization'
        ],
        resources: ['*']
      })]
    });
    const customResourceRole = new iam.Role(this, 'Inspector2EnableDelegatedAdminResourceRole', {
      assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
      inlinePolicies: {
        'PermissionsForInspectorAdmin': adminPolicy
      },
    });

    const enableInspector2 = new Inspector2EnableResource(this, 'Inspector2EnableResource', props.inspector2EnableProps);

    const enableDelegatedAdminAccountApiCall: custom_resources.AwsSdkCall = {
      service: 'Inspector2',
      action: 'enableDelegatedAdminAccount',
      parameters: {
        delegatedAdminAccountId: props.delegatedAdminAccountId,
      },
      physicalResourceId,
    };

    const delegatedAdminResource = new custom_resources.AwsCustomResource(this, 'Inspector2EnableDelegatedAdminAccountResource', {
      resourceType: 'Custom::Inspector2EnableDelegatedAdminAccount',
      role: customResourceRole,
      onCreate: enableDelegatedAdminAccountApiCall,
      onDelete: {
        service: 'Inspector2',
        action: 'disableDelegatedAdminAccount',
        physicalResourceId,
        parameters: {
          delegatedAdminAccountId: props.delegatedAdminAccountId,
        },
      },
      installLatestAwsSdk: true,
      logRetention: props.logRetention,
    });
    delegatedAdminResource.node.addDependency(enableInspector2);

    if (props.delegatedAdminAccountId === cdk.Stack.of(this).account) {
      new Inspector2UpdateOrganizationConfigurationResource(this, 'Inspector2UpdateOrganizationConfigurationResource', {
        logRetention: props.logRetention,
        autoEnable: {
          ...props.autoEnable,
        }
      }).node.addDependency(delegatedAdminResource);
    }
  }
}
