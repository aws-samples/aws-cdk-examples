
from aws_cdk import (
    aws_stepfunctions as _sfn,
    aws_batch as _batch,
    aws_stepfunctions_tasks as _sfn_tasks,
    core,
)



class StepfunctionsENV(core.Construct):
    
    def __init__(self, scope: core.Construct, id: str, QueueDefine="default",TaskDefine="default",LambdaDefine="default", SNSDefine="default",**kwargs):
        super().__init__(scope, id, **kwargs)

        self.Job_String_Split = _sfn.Task(
            self,"String_Split",
            input_path = "$.TaskInfo",
            result_path = "$.JobDetail.String_Split",
            output_path = "$",
            task = _sfn_tasks.RunBatchJob(
                job_name = "String_Split",
                job_definition = TaskDefine.getTaskDefine("String_Split"),
                job_queue = QueueDefine.getComputeQueue("ComputeQueue"),
                container_overrides = _sfn_tasks.ContainerOverrides(
                    environment = {
                        "INPUT_BUCKET":_sfn.Data.string_at("$.BasicParameters.INPUT_BUCKET"),
                        "INPUT_KEY":_sfn.Data.string_at("$.BasicParameters.INPUT_KEY"),
                        "OUTPUT_BUCKET":_sfn.Data.string_at("$.BasicParameters.OUTPUT_BUCKET"),
                        "OUTPUT_KEY":_sfn.Data.string_at("$.JobParameter.String_Split.OUTPUT_KEY"),
                        "SPLIT_NUM":_sfn.Data.string_at("$.JobParameter.String_Split.SPLIT_NUM")
                    }
                )
            )
        )
        
        self.Job_Map = _sfn.Task(
            self,"Job_Map",
            input_path = "$.TaskInfo",
            result_path = "$.TaskInfo.JobDetail.Job_Map",
            output_path = "$",
            task = _sfn_tasks.RunLambdaTask(LambdaDefine.getLambdaFunction("Get_Job_List")),
        )
        
        self.Job_String_Reverse = _sfn.Task(
            self,"String_Reverse",
            input_path = "$",
            result_path = "$",
            output_path = "$",
            task = _sfn_tasks.RunBatchJob(
                job_name = "String_Reverse",
                job_definition = TaskDefine.getTaskDefine("String_Reverse"),
                job_queue = QueueDefine.getComputeQueue("ComputeQueue"),
                container_overrides = _sfn_tasks.ContainerOverrides(
                    environment = {
                        "INDEX":_sfn.Data.string_at("$.INDEX"),
                        "INPUT_BUCKET":_sfn.Data.string_at("$.INPUT_BUCKET"),
                        "INPUT_KEY":_sfn.Data.string_at("$.INPUT_KEY"),
                        "OUTPUT_BUCKET":_sfn.Data.string_at("$.OUTPUT_BUCKET"),
                        "OUTPUT_KEY":_sfn.Data.string_at("$.String_Reverse.OUTPUT_KEY")
                    }
                )
            )
        )
        
        self.Job_String_Repeat = _sfn.Task(
            self,"String_Repeat",
            input_path = "$",
            result_path = "$",
            output_path = "$",
            task = _sfn_tasks.RunBatchJob(
                job_name = "String_Repeat",
                job_definition = TaskDefine.getTaskDefine("String_Repeat"),
                job_queue = QueueDefine.getComputeQueue("ComputeQueue"),
                container_overrides = _sfn_tasks.ContainerOverrides(
                    environment = {
                        "INDEX":_sfn.Data.string_at("$.INDEX"),
                        "INPUT_BUCKET":_sfn.Data.string_at("$.INPUT_BUCKET"),
                        "INPUT_KEY":_sfn.Data.string_at("$.INPUT_KEY"),
                        "OUTPUT_BUCKET":_sfn.Data.string_at("$.OUTPUT_BUCKET"),
                        "OUTPUT_KEY":_sfn.Data.string_at("$.String_Repeat.OUTPUT_KEY")
                    }
                )
            )
        )
        
        self.Job_String_Process_Repeat = _sfn.Map(
            self, "String_Process_Repeat",
            max_concurrency=50,
            input_path = "$.TaskInfo.JobDetail.Job_Map",
            result_path = "DISCARD",
            items_path = "$.Payload",
            output_path = "$",
        ).iterator(self.Job_String_Repeat)
        
        self.Job_String_Repeat_Merge = _sfn.Task(
            self,"String_Repeat_Merge",
            input_path = "$.TaskInfo",
            result_path = "DISCARD",
            output_path = "$",
            task = _sfn_tasks.RunBatchJob(
                job_name = "String_Repeat_Merge",
                job_definition = TaskDefine.getTaskDefine("String_Merge"),
                job_queue = QueueDefine.getComputeQueue("ComputeQueue"),
                container_overrides = _sfn_tasks.ContainerOverrides(
                    environment = {
                        "PERFIX":_sfn.Data.string_at("$.JobParameter.String_Repeat.Prefix"),
                        "FILE_NAME":_sfn.Data.string_at("$.BasicParameters.INPUT_KEY"),
                        "INPUT_BUCKET":_sfn.Data.string_at("$.BasicParameters.INPUT_BUCKET"),
                        "INPUT_KEY":_sfn.Data.string_at("$.JobParameter.String_Repeat.OUTPUT_KEY"),
                        "OUTPUT_BUCKET":_sfn.Data.string_at("$.BasicParameters.OUTPUT_BUCKET"),
                        "OUTPUT_KEY":_sfn.Data.string_at("$.JobParameter.String_Repeat.OUTPUT_KEY")
                    }
                )
            )
        )
        
        self.Job_String_Process_Repeat.next(self.Job_String_Repeat_Merge)
        
        self.Job_String_Process_Reverse = _sfn.Map(
            self, "String_Process_Reverse",
            max_concurrency=50,
            input_path = "$.TaskInfo.JobDetail.Job_Map",
            result_path = "DISCARD",
            items_path = "$.Payload",
            output_path = "$",
        ).iterator(self.Job_String_Reverse)
        
        self.Job_String_Reverse_Merge = _sfn.Task(
            self,"String_Reverse_Merge",
            input_path = "$.TaskInfo",
            result_path = "DISCARD",
            output_path = "$",
            task = _sfn_tasks.RunBatchJob(
                job_name = "String_Reverse_Merge",
                job_definition = TaskDefine.getTaskDefine("String_Merge"),
                job_queue = QueueDefine.getComputeQueue("ComputeQueue"),
                container_overrides = _sfn_tasks.ContainerOverrides(
                    environment = {
                        "PERFIX":_sfn.Data.string_at("$.JobParameter.String_Reverse.Prefix"),
                        "FILE_NAME":_sfn.Data.string_at("$.BasicParameters.INPUT_KEY"),
                        "INPUT_BUCKET":_sfn.Data.string_at("$.BasicParameters.INPUT_BUCKET"),
                        "INPUT_KEY":_sfn.Data.string_at("$.JobParameter.String_Reverse.OUTPUT_KEY"),
                        "OUTPUT_BUCKET":_sfn.Data.string_at("$.BasicParameters.OUTPUT_BUCKET"),
                        "OUTPUT_KEY":_sfn.Data.string_at("$.JobParameter.String_Reverse.OUTPUT_KEY")
                    }
                )
            )
        )
        
        self.Job_String_Process_Reverse.next(self.Job_String_Reverse_Merge)

        self.Job_Parallel_Process = _sfn.Parallel(
            self,
            'Parallel_Process',
            input_path = "$",
            result_path = "DISCARD"
        )
        
        self.Job_Parallel_Process.branch(self.Job_String_Process_Repeat)
        self.Job_Parallel_Process.branch(self.Job_String_Process_Reverse)
        
        self.Job_Check_Output = _sfn.Task(
            self,"Check_Output",
            input_path = "$.TaskInfo",
            
            result_path = "$.JobDetail.Check_Output",
            output_path = "$.JobDetail.Check_Output.Payload",
            task = _sfn_tasks.RunLambdaTask(LambdaDefine.getLambdaFunction("Get_Output_size")),
        )
        
        self.Job_Is_Complete = _sfn.Choice(
            self, "Is_Complete",
            input_path = "$.TaskInfo",
            output_path = "$"
        )
        
        self.Job_Finish = _sfn.Wait(
            self, "Finish",
            time = _sfn.WaitTime.duration(core.Duration.seconds(5))
        )
        
        self.Job_Notification = _sfn.Task(self, "Notification",
            input_path = "$.TaskInfo",
            result_path = "DISCARD",
            output_path = "$",
            task = _sfn_tasks.PublishToTopic(SNSDefine.getSNSTopic("Topic_Batch_Job_Notification"),
                integration_pattern = _sfn.ServiceIntegrationPattern.FIRE_AND_FORGET,
                message = _sfn.TaskInput.from_data_at("$.JobStatus.Job_Comment"),
                subject = _sfn.Data.string_at("$.JobStatus.SNS_Subject")
            )
        )
        
        self.Job_Failed = _sfn.Wait(
            self, "Failed",
            time = _sfn.WaitTime.duration(core.Duration.seconds(5))
        )
        
        self.statemachine = _sfn.StateMachine(
            self, "StateMachine",
            definition = self.Job_String_Split.next(self.Job_Map) \
                .next(self.Job_Parallel_Process) \
                .next(self.Job_Check_Output) \
                .next(self.Job_Notification) \
                .next(self.Job_Is_Complete \
                    .when(_sfn.Condition.string_equals(
                            "$.JobStatus.OutputStatus", "FAILED"
                        ), self.Job_Failed
                            .next(self.Job_Map)
                        )
                    .when(_sfn.Condition.string_equals(
                            "$.JobStatus.OutputStatus", "SUCCEEDED"
                        ), self.Job_Finish)
                    .otherwise(self.Job_Failed)
                ),
            timeout = core.Duration.hours(1),
        )