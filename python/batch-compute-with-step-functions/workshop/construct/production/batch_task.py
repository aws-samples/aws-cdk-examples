from aws_cdk import (
    aws_batch as _batch,
    aws_ecs as _ecs,
    aws_ecr as _ecr,
    core,
)

class BatchTASK(core.Construct):
    
    def getTaskDefine(self,taskname):
        return self.taskdefine[taskname]
    
    def __init__(self, scope: core.Construct, id: str,EcrRepo="default",UserName="default",**kwargs):
        super().__init__(scope, id, **kwargs)
        self.taskdefine = {}
        
        self.String_Split = _batch.JobDefinition(self,"String_Split",
            job_definition_name = "String_Split_" + UserName,
            container = _batch.JobDefinitionContainer(
                image = _ecs.ContainerImage.from_registry(name=EcrRepo.getRepositories("string_split").repository_uri),
                # image = _ecs.ContainerImage.from_registry(name="xxx.dkr.ecr.ap-northeast-1.amazonaws.com/example/string_split:latest"),
                memory_limit_mib = 1024,
                vcpus = 1,
                command = [
                    "/bin/bash",
                    "/data/run.sh"
                ],
                environment = {
                    "INPUT_BUCKET":"<INPUT_BUCKET>",
                    "INPUT_KEY":"<INPUT_KEY>",
                    "OUTPUT_BUCKET":"<OUTPUT_BUCKET>",
                    "OUTPUT_KEY":"<OUTPUT_KEY>",
                    "SPLIT_NUM":"<SPLIT_NUM>"
                },   
            ),
            timeout = core.Duration.hours(1),
            retry_attempts = 3
        )
        self.taskdefine['String_Split'] = self.String_Split
        
        self.String_Reverse = _batch.JobDefinition(self,"String_Reverse",
            job_definition_name = "String_Reverse_" + UserName,
            container = _batch.JobDefinitionContainer(
                image = _ecs.ContainerImage.from_registry(name=EcrRepo.getRepositories("string_reverse").repository_uri),
                # image = _ecs.ContainerImage.from_registry(name="xxx.dkr.ecr.ap-northeast-1.amazonaws.com/example/string_reverse:latest"),
                memory_limit_mib = 1024,
                vcpus = 1,
                command = [
                    "/bin/bash",
                    "/data/run.sh"
                ],
                environment = {
                    "INDEX":"<INDEX>",
                    "INPUT_BUCKET":"<INPUT_BUCKET>",
                    "INPUT_KEY":"<INPUT_KEY>",
                    "OUTPUT_BUCKET":"<OUTPUT_BUCKET>",
                    "OUTPUT_KEY":"<OUTPUT_KEY>"
                },   
            ),
            timeout = core.Duration.hours(1),
            retry_attempts = 3
        )
        self.taskdefine['String_Reverse'] = self.String_Reverse
        
        self.String_Repeat = _batch.JobDefinition(self,"String_Repeat",
            job_definition_name = "String_Repeat_" + UserName,
            container = _batch.JobDefinitionContainer(
                image = _ecs.ContainerImage.from_registry(name=EcrRepo.getRepositories("string_repeat").repository_uri),
                # image = _ecs.ContainerImage.from_registry(name="xxx.dkr.ecr.ap-northeast-1.amazonaws.com/example/string_repeat:latest"),
                memory_limit_mib = 1024,
                vcpus = 1,
                command = [
                    "/bin/bash",
                    "/data/run.sh"
                ],
                environment = {
                    "INDEX":"<INDEX>",
                    "INPUT_BUCKET":"<INPUT_BUCKET>",
                    "INPUT_KEY":"<INPUT_KEY>",
                    "OUTPUT_BUCKET":"<OUTPUT_BUCKET>",
                    "OUTPUT_KEY":"<OUTPUT_KEY>"
                },   
            ),
            timeout = core.Duration.hours(1),
            retry_attempts = 3
        )
        self.taskdefine['String_Repeat'] = self.String_Repeat
        
        self.String_Merge = _batch.JobDefinition(self,"String_Merge",
            job_definition_name = "String_Merge_" + UserName,
            container = _batch.JobDefinitionContainer(
                image = _ecs.ContainerImage.from_registry(name=EcrRepo.getRepositories("string_merge").repository_uri),
                # image = _ecs.ContainerImage.from_registry(name="xxx.dkr.ecr.ap-northeast-1.amazonaws.com/example/string_merge:latest"),
                memory_limit_mib = 1024,
                vcpus = 1,
                command = [
                    "/bin/bash",
                    "/data/run.sh"
                ],
                environment = {
                    "INDEX":"<INDEX>",
                    "INPUT_BUCKET":"<INPUT_BUCKET>",
                    "INPUT_KEY":"<INPUT_KEY>",
                    "OUTPUT_BUCKET":"<OUTPUT_BUCKET>",
                    "OUTPUT_KEY":"<OUTPUT_KEY>",
                    "PERFIX":"<PERFIX>"
                },   
            ),
            timeout = core.Duration.hours(1),
            retry_attempts = 3
        )
        self.taskdefine['String_Merge'] = self.String_Merge