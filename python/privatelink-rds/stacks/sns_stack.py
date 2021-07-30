from aws_cdk import (
    aws_sns as sns,
    core
)

class SnsStack(core.Stack):

    def __init__(self, scope: core.Construct, id: str, **kwargs) -> None:
        super().__init__(scope, id, **kwargs)
        
        self.topic = sns.Topic(self, "PrivatelinkRdsDemoSns",
            display_name = "RdsEventsTopicForSendingNotificationsAndTriggeringLambda"
        )