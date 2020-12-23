from aws_cdk import (
    aws_batch as batch,
    aws_ec2 as ec2,
    aws_ecs as ecs,
    aws_events as events,
    aws_events_targets as targets,
    aws_lambda as func,
    aws_stepfunctions as sfn,
    aws_stepfunctions_tasks as tasks,
    aws_iam as iam,
    core,
)

class CronBatchStack(core.Stack):
    def __init__(self, app: core.App, id: str, stack_name = "yyo") -> None:
        super().__init__(app, id)

        # lambda function
        with open("lambda_handler.py", encoding="utf8") as fp:
            handler_code = fp.read()

        lambda_func = func.Function(
            self, "Singleton",
            code = func.InlineCode(handler_code),
            handler = "index.lambda_handler",
            timeout = core.Duration.seconds(300),
            runtime = func.Runtime.PYTHON_3_7,
        )

        lambda_func_task = tasks.LambdaInvoke(self, "InvokeLambda",
            lambda_function = lambda_func,
            input_path = "$",
            output_path = "$.Payload"
        )

        # batch service role
        batch_service_role = iam.Role(self,'BatchServiceRole',
            assumed_by = iam.ServicePrincipal('batch.amazonaws.com'),
            managed_policies = [
                iam.ManagedPolicy.from_aws_managed_policy_name('service-role/AWSBatchServiceRole')
            ]
        )

        # ec2 role with policy that allow to get object from s3 bucket for batch computing
        batch_compute_role = iam.Role(self, 'BatchComputeRole',
            assumed_by = iam.CompositePrincipal(
                iam.ServicePrincipal('ec2.amazonaws.com'),
                iam.ServicePrincipal('ecs.amazonaws.com')
            ),
            managed_policies = [
                iam.ManagedPolicy.from_aws_managed_policy_name('service-role/AmazonEC2RoleforSSM'),
                iam.ManagedPolicy.from_aws_managed_policy_name("service-role/AmazonEC2ContainerServiceforEC2Role"),
                iam.ManagedPolicy.from_aws_managed_policy_name("CloudWatchLogsFullAccess")
            ]
        )

        batch_compute_instance_profile = iam.CfnInstanceProfile(
            self, 'BatchInstanceProfile' + stack_name,
            instance_profile_name = 'BatchInstanceProfile-' + stack_name,
            roles = [batch_compute_role.role_name]
        )

        batch_compute_environment = batch.ComputeEnvironment(
            self,
            'BatchComputeEnvironment' + stack_name,
            compute_resources = {
                "vpc": ec2.Vpc(self, 'Vpc' + stack_name, max_azs = 2),
                "instance_types": [
                    ec2.InstanceType("c5"),
                    ec2.InstanceType("m5")
                ],
                "maxv_cpus": 128,
                "minv_cpus": 0,
                "type": batch.ComputeResourceType.SPOT,
                "allocation_strategy": batch.AllocationStrategy.BEST_FIT_PROGRESSIVE,
                "instance_role": batch_compute_instance_profile.instance_profile_name
            },
            service_role = batch_service_role,
        )

        batch_job_definition = batch.JobDefinition(
            self, 'BatchJobDefinition' + stack_name,
            job_definition_name = stack_name,
            container = batch.JobDefinitionContainer(
                image = ecs.ContainerImage.from_registry("busybox:latest"),
                memory_limit_mib = 1024,
                vcpus = 1,
            ),
            timeout = core.Duration.hours(1),
            retry_attempts = 3
        )

        batch_job_queue = batch.JobQueue(
            self, 'BatchJobQueue' + stack_name,
            priority = 1,
            compute_environments = [
                batch.JobQueueComputeEnvironment(
                    compute_environment = batch_compute_environment,
                    order = 1
                )
            ]
        )

        batch_submitjob_task = tasks.BatchSubmitJob(
            self, 'BatchSubmitJob',
            job_name = 'BusyBatchJob' + stack_name,
            job_definition = batch_job_definition,
            job_queue = batch_job_queue,
            container_overrides = {
                "command": ['sh', '-c', 'echo \"hello from busybox\"']
            }
        )

        # condition
        is_holiday = sfn.Choice(self, "Holiday?")
        holiday_pass = sfn.Pass(self, "Happy Holiday!")
        workingday = sfn.Pass(self, "Working day")

        # workflow
        flow_definition = lambda_func_task\
            .next(is_holiday
                .when(sfn.Condition.boolean_equals("$.is_holiday", False), workingday.next(batch_submitjob_task))
                .otherwise(holiday_pass)
            )

        workflow = sfn.StateMachine(
            self, 'StateMachine' + stack_name,
            definition = flow_definition,
            timeout = core.Duration.minutes(30),
        )

        # See https://docs.aws.amazon.com/lambda/latest/dg/tutorial-scheduled-events-schedule-expressions.html
        rule = events.Rule(
            self, "Rule",
            schedule = events.Schedule.expression('cron(0 18 ? * MON-FRI *)'),
        )
        rule.add_target(targets.SfnStateMachine(workflow))

app = core.App()
CronBatchStack(app, "CronBatchExample")
app.synth()
