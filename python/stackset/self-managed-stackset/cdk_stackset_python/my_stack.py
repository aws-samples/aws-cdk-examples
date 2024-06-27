from aws_cdk import (
    Duration,
    Stack,
    aws_sqs as sqs
)
from constructs import Construct
from cdk_stacksets import StackSetStack
import os

class MyStackSet(StackSetStack):
    def __init__(self, scope: Construct, id: str, **kwargs):
        super().__init__(scope, id, **kwargs)

        queue = sqs.Queue(self, 'MyQueue',
            visibility_timeout=Duration.seconds(300)
        )