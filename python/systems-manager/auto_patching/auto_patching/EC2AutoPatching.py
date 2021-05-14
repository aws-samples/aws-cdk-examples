from aws_cdk import (
    aws_ssm as ssm,
    aws_iam as iam,
    aws_s3 as s3,
    core,
    custom_resources as cr
)


class EC2AutoPatching(core.Construct):
    """
        Deploy Maintenance Window for AutoPatching EC2 Instances with specific tags using standard
        Amazon SSM patch baselines
    """

    def __init__(
            self, scope: core.Construct, id: str,
            patch_group: str,
            patch_cron_schedule: str = None
    ) -> None:
        super().__init__(
            scope=scope,
            id=id
        )

        # Prerequisites: IAM Role for SSM service to use to auto-patch EC2 instances.
        role = iam.Role(
            scope, f'{id}Role',
            assumed_by=iam.CompositePrincipal(*[
                iam.ServicePrincipal(f'ssm.{core.Aws.URL_SUFFIX}'),
                iam.ServicePrincipal(f'ec2.{core.Aws.URL_SUFFIX}')
            ]),
            managed_policies=[iam.ManagedPolicy.from_managed_policy_arn(
                scope, f'{id}AmazonSSMMaintenanceWindowRole',
                managed_policy_arn='arn:aws:iam::aws:policy/service-role/AmazonSSMMaintenanceWindowRole')],
        )

        role.add_to_policy(iam.PolicyStatement(
            actions=[
                'kms:Encrypt',
                'kms:DescribeKey'
            ],
            resources=['*']
        ))

        # Prerequisites: Create auto-patching logs bucket
        account = core.Stack.of(self).account
        region = core.Stack.of(self).region

        log_bucket = s3.Bucket(
            self, f'{id}LogBucket',
            encryption=s3.BucketEncryption.KMS_MANAGED,
            enforce_ssl=True,
            block_public_access=s3.BlockPublicAccess.BLOCK_ALL
        )

        log_bucket.grant_write(role)

        role.add_to_policy(iam.PolicyStatement(
            actions=['iam:PassRole'],
            resources=['*']
        ))

        """
            Auto patching configurations 
        """
        # When to patch? Maintenance Window Schedule
        mw = ssm.CfnMaintenanceWindow(
            scope, f'{id}MW',
            name=f'{id}MaintenanceWindow',
            description='SSM Patching Maintenance Window to automate AWS Patch Manager tasks',
            schedule=patch_cron_schedule or 'cron(00 00 ? * SAT *)',
            schedule_timezone='UTC',
            duration=4,  # hours
            cutoff=0,  # hours
            allow_unassociated_targets=True
        )

        # Which instances to patch? Maintenance Window Targets
        target = ssm.CfnMaintenanceWindowTarget(
            scope, f'{id}Target',
            name=f'{mw.name}Targets',
            description=f"Defines the EC2 Instance Target for Maintenance Window: {mw.name}",
            resource_type='INSTANCE',
            window_id=mw.ref,
            targets=[
                {
                    'key': 'tag:Patch Automatically',
                    'values': ['True', 'Enabled', 'Activated', 'Yes']
                }, {
                    'key': 'tag:Patch Group',
                    'values': [patch_group]
                }
            ],
        )

        # What automation is required for the matched instances? Maintenance Window Task1 (AWS-RunPatchBaseline)
        task = ssm.CfnMaintenanceWindowTask(
            scope, f'{id}Task',
            name=f"{mw.name}Task",
            description=f"Defines the Task for Maintenance Window: {mw.name}",
            service_role_arn=role.role_arn,
            priority=1,
            max_errors='1',
            max_concurrency='1',
            targets=[{
                'key': 'WindowTargetIds',
                'values': [target.ref]
            }],
            task_type='RUN_COMMAND',
            window_id=mw.ref,
            task_arn='AWS-RunPatchBaseline',
            logging_info=ssm.CfnMaintenanceWindowTask.LoggingInfoProperty(
                region=region,
                s3_bucket=log_bucket.bucket_name,
                s3_prefix='AutoPatchingLogs'
            )
        )

        # Pass the parameters to the Patch run command to install patches and reboot the instance if needed.
        task.add_property_override(
            'TaskInvocationParameters',
            {
                "MaintenanceWindowRunCommandParameters": {
                    "Parameters": {
                        "Operation": [
                            "Install"
                        ],
                        "RebootOption": [
                            "RebootIfNeeded"
                        ]
                    },
                    "ServiceRoleArn": role.role_arn
                }
            }
        )

        # Get the patch baseline fod Amazon Linux 2 instances using a custom resource
        describe_patch_baseline = cr.AwsCustomResource(
            scope, f'{id}DescribePatchBaselines',
            on_create=cr.AwsSdkCall(
                service='SSM',
                action='describePatchBaselines',
                parameters={
                    "Filters": [
                        {
                            "Key": "OPERATING_SYSTEM",
                            "Values": ["AMAZON_LINUX_2"]
                        }
                    ],
                },
                physical_resource_id=cr.PhysicalResourceId.of(f'{id}describePatchBaselines')
            ),
            policy=cr.AwsCustomResourcePolicy.from_sdk_calls(resources=['*'])
        )

        baseline_id = describe_patch_baseline.get_response_field('BaselineIdentities.0.BaselineId')

        # Register the patch group with the Patch baseline using a custom resource.
        register_patch_group = cr.AwsCustomResource(
            scope, f'{id}RegisterPatchBaselineForPatchGroup',
            on_create=cr.AwsSdkCall(
                service='SSM',
                action='registerPatchBaselineForPatchGroup',
                parameters={
                    "BaselineId": baseline_id,
                    "PatchGroup": patch_group
                },
                physical_resource_id=cr.PhysicalResourceId.of(f'{id}RegisterPatchBaselineForPatchGroup')
            ),
            policy=cr.AwsCustomResourcePolicy.from_sdk_calls(resources=['*'])
        )
