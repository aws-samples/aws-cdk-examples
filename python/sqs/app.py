#!/usr/bin/env python3

from aws_cdk import (
    aws_sqs as sqs,
    core,
)


class SQSStack(core.Stack):
    def __init__(self, app: core.App, id: str, **kwargs) -> None:
        super().__init__(app, id, **kwargs)

        queue = sqs.Queue(
            self, "samplequeue",  # add .fifo to name if fifo=True no provided
            fifo=True,
            visibility_timeout=core.Duration.seconds(300),
            retention_period=core.Duration.seconds(1800),
            receive_message_wait_time=core.Duration.seconds(20)
        )


app = core.App()
RDSStack(app, "SQSStack")
app.synth()
