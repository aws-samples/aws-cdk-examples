from aws_cdk import (
    aws_stepfunctions as sfn,
    aws_stepfunctions_tasks as sfn_tasks,
    core,
)


class JobPollerStack(core.Stack):
    def __init__(self, app: core.App, id: str, **kwargs) -> None:
        super().__init__(app, id, **kwargs)

        submit_job_activity = sfn.Activity(
            self, "SubmitJob"
        )
        check_job_activity = sfn.Activity(
            self, "CheckJob"
        )
        do_mapping_activity1 = sfn.Activity(
            self, "MapJOb1"
        )
        do_mapping_activity2 = sfn.Activity(
            self, "MapJOb2"
        )

        submit_job = sfn.Task(
            self, "Submit Job",
            task=sfn_tasks.InvokeActivity(submit_job_activity),
            result_path="$.guid",
        )

        task1 = sfn.Task(
            self, "Task 1 in Mapping",
            task=sfn_tasks.InvokeActivity(do_mapping_activity1),
            result_path="$.guid",
        )

        task2 = sfn.Task(
            self, "Task 2 in Mapping",
            task=sfn_tasks.InvokeActivity(do_mapping_activity2),
            result_path="$.guid",
        )

        wait_x = sfn.Wait(
            self, "Wait X Seconds",
            time=sfn.WaitTime.seconds_path('$.wait_time'),
        )
        get_status = sfn.Task(
            self, "Get Job Status",
            task=sfn_tasks.InvokeActivity(check_job_activity),
            input_path="$.guid",
            result_path="$.status",
        )
        is_complete = sfn.Choice(
            self, "Job Complete?"
        )
        job_failed = sfn.Fail(
            self, "Job Failed",
            cause="AWS Batch Job Failed",
            error="DescribeJob returned FAILED"
        )
        final_status = sfn.Task(
            self, "Get Final Job Status",
            task=sfn_tasks.InvokeActivity(check_job_activity),
            input_path="$.guid",
        )

        definition_map = task1.next(task2)

        process_map = sfn.Map(
            self, "Process_map",
            max_concurrency=10
        ).iterator(definition_map)

        definition = submit_job \
            .next(process_map) \
            .next(wait_x) \
            .next(get_status) \
            .next(is_complete
                  .when(sfn.Condition.string_equals(
                    "$.status", "FAILED"), job_failed)
                  .when(sfn.Condition.string_equals(
                    "$.status", "SUCCEEDED"), final_status)
                  .otherwise(wait_x))

        sfn.StateMachine(
            self, "StateMachine",
            definition=definition,
            timeout=core.Duration.seconds(30),
        )
