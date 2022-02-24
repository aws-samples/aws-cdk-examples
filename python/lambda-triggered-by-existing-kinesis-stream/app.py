from aws_cdk import (
    aws_lambda as lambda_,
    aws_kinesis as kinesis,
    aws_lambda_event_sources as event_sources,
    App, Arn, ArnComponents, Duration, Stack
)


class LambdaWithKinesisTrigger(Stack):
    def __init__(self, app: App, id: str) -> None:
        super().__init__(app, id)

        with open("lambda-handler.py", encoding="utf8") as fp:
            handler_code = fp.read()

        # Creates reference to already existing kinesis stream
        kinesis_stream = kinesis.Stream.from_stream_arn(
            self, 'KinesisStream',
            Arn.format(
                ArnComponents(
                    resource='stream',
                    service='kinesis',
                    resource_name='my-stream'
                ),
                self
            )
        )

        lambdaFn = lambda_.Function(
            self, 'Singleton',
            handler='index.main',
            code=lambda_.InlineCode(handler_code),
            runtime=lambda_.Runtime.PYTHON_3_7,
            timeout=Duration.seconds(300)
        )

        # Update Lambda Permissions To Use Stream
        kinesis_stream.grant_read(lambdaFn)

        # Create New Kinesis Event Source
        kinesis_event_source = event_sources.KinesisEventSource(
            stream=kinesis_stream,
            starting_position=lambda_.StartingPosition.LATEST,
            batch_size=1
        )

        # Attach New Event Source To Lambda
        lambdaFn.add_event_source(kinesis_event_source)


app = App()
LambdaWithKinesisTrigger(app, "LambdaWithKinesisTrigger")
app.synth()
