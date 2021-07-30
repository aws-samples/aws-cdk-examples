from aws_cdk import (
    aws_lambda as _lambda,
    aws_lambda_event_sources as events,
    aws_iam as iam,
    core
)

class LambdaStack(core.Stack):

    def __init__(self, scope: core.Construct, id: str, 
        rds_endpoint, 
        sns_topic, 
        target_group_arn,
        **kwargs
    ) -> None:
        super().__init__(scope, id, **kwargs)
        
        # The rights we'll need to add to the Lambda function since we're gluing 
        # Privatelink and NLB ourselves and CDK won't know to generate these.
        # Note: Describe doesn't accept resource constraint, see https://docs.aws.amazon.com/elasticloadbalancing/latest/userguide/load-balancer-authentication-access-control.html
        policy_describe_targetgroup = iam.PolicyStatement(
            actions = [
                "elasticloadbalancing:DescribeTargetHealth"
            ],
            resources = ["*"]
        )
        policy_update_targetgroup = iam.PolicyStatement(
            actions = [
                "elasticloadbalancing:RegisterTargets",
                "elasticloadbalancing:DeregisterTargets"
            ],
            resources = [
                target_group_arn
            ]
        )

        # create lambda function
        self.function = _lambda.Function(self, "PrivatelinkRdsDemoLambda",
            runtime = _lambda.Runtime.PYTHON_3_7,
            handler = "elb_hostname_as_target.lambda_handler",
            code = _lambda.AssetCode("./PrivatelinkRdsDemoNlbUpdater.zip"),
            initial_policy = [policy_describe_targetgroup, policy_update_targetgroup],
            timeout = core.Duration.seconds(45),
            environment = {
                'ELB_TG_ARN': target_group_arn,
                'TARGET_FQDN': rds_endpoint
            }
        )

        # add the event source/trigger from SNS
        self.function.add_event_source(events.SnsEventSource(sns_topic))
        
        core.CfnOutput(self, "Output",
            value = "Function ARN: " + self.function.function_arn
        )
