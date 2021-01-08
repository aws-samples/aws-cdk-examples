from aws_cdk import (
    aws_autoscaling as autoscaling,
    aws_autoscaling_hooktargets as hooktarget,
    aws_ec2 as ec2,
    aws_iam as iam,
    aws_lambda,
    core,
)

class Vpc(core.Stack):
    def __init__(self, app: core.App, id: str, props, **kwargs) -> None:
        super().__init__(app, id, **kwargs)

        vpc = ec2.Vpc(self, "vpc", max_azs = 2)

        core.CfnOutput(
            self, "VPCID",
            description = "VPC ID",
            value = vpc.vpc_id
        )

        self.output_props = props.copy()
        self.output_props['vpc']= vpc

    # pass objects to another stack
    @property
    def outputs(self):
        return self.output_props

class Ec2(core.Stack):
    def __init__(self, app: core.App, id: str, props, **kwargs) -> None:
        super().__init__(app, id, **kwargs)

        ec2_role = iam.Role(self, "ec2_role", assumed_by = iam.ServicePrincipal("ec2.amazonaws.com"))
        ec2_role.add_managed_policy(iam.ManagedPolicy.from_aws_managed_policy_name("AWSCloudMapFullAccess"))
        ec2_role.add_managed_policy(iam.ManagedPolicy.from_aws_managed_policy_name("service-role/AmazonEC2RoleforSSM"))

        asg = autoscaling.AutoScalingGroup(self, "autoscaling",
            vpc = props['vpc'],
            role = ec2_role,
            instance_type = ec2.InstanceType("t3.nano"),
            machine_image = ec2.MachineImage.latest_amazon_linux(
                generation = ec2.AmazonLinuxGeneration.AMAZON_LINUX_2,
                edition = ec2.AmazonLinuxEdition.STANDARD,
                virtualization = ec2.AmazonLinuxVirt.HVM,
                storage = ec2.AmazonLinuxStorage.GENERAL_PURPOSE
            ),
            min_capacity = 1,
            max_capacity = 1,
            desired_capacity = 1
        )

        with open('register-instance.sh','r') as file:
            userdata = file.read()

        asg.add_user_data(userdata)
        file.close()

        # lifecycle hook lambda function
        with open('deregister-instance.py', encoding = 'utf8') as pyfile:
            handler_code = pyfile.read()

        lambda_role = iam.Role(self, "lambda_role", assumed_by = iam.ServicePrincipal("lambda.amazonaws.com"))
        lambda_role.add_managed_policy(iam.ManagedPolicy.from_aws_managed_policy_name("AWSCloudMapFullAccess"))
        lambda_role.add_managed_policy(iam.ManagedPolicy.from_aws_managed_policy_name("service-role/AWSLambdaBasicExecutionRole"))
        lambda_role.add_managed_policy(iam.ManagedPolicy.from_aws_managed_policy_name("service-role/AWSLambdaVPCAccessExecutionRole"))

        lambda_func = aws_lambda.Function(
            self, "deregister-instance",
            code = aws_lambda.InlineCode(handler_code),
            handler = "index.lambda_handler",
            timeout = core.Duration.seconds(300),
            runtime = aws_lambda.Runtime.PYTHON_3_7,
            role = lambda_role,
        )
        pyfile.close()

        lc_hook_target = hooktarget.FunctionHook(lambda_func)
        lc_hook = autoscaling.LifecycleHook(self, "lc-hook",
            auto_scaling_group = asg,
            lifecycle_transition = autoscaling.LifecycleTransition.INSTANCE_TERMINATING,
            notification_target = lc_hook_target
        )

        core.CfnOutput(
            self, "ASGNAME",
            description = "Autoscaling Group Name",
            value = asg.auto_scaling_group_name
        )

        self.output_props = props.copy()
        self.output_props['ec2'] = asg

    # pass objects to another stack
    @property
    def outputs(self):
        return self.output_props
