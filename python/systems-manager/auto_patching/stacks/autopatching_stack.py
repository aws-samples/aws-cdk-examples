from aws_cdk import (
    aws_ec2 as ec2,
    aws_iam as iam,
    core
)

from auto_patching.EC2AutoPatching import EC2AutoPatching


class AutoPatchingStack(core.Stack):

    def __init__(self,
                 scope: core.Construct,
                 id: str,
                 **kwargs) -> None:
        super().__init__(scope, id, **kwargs)

        patch_group = 'Group1'  # All instances tagged with 'Patch Group=Group1' will be patched together.
        patch_schedule = 'cron(*/10 * ? * * *)'  # every 10 minutes, please use your own patch schedule.

        # Create a VPC
        vpc = ec2.Vpc(self, 'Vpc')

        # Create an EC2 Instance
        instance = ec2.Instance(
            self, 'Instance',
            instance_type=ec2.InstanceType('t3.micro'),
            machine_image=ec2.MachineImage.latest_amazon_linux(),
            vpc=vpc
        )

        instance.role.add_managed_policy(iam.ManagedPolicy.from_aws_managed_policy_name('AmazonSSMManagedInstanceCore'))

        # Configure auto-patching
        EC2AutoPatching(
            self, f'{id}AutoPatching',
            patch_group=patch_group,
            patch_cron_schedule=patch_schedule
        )

        # Activate Auto patching by tagging the instance
        core.Tags.of(instance).add(
            key='Patch Group', value=patch_group
        )
        core.Tags.of(instance).add(
            key='Patch Automatically', value=str(True)
        )
