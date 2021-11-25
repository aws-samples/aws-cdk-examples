from constructs import Construct
from aws_cdk import (
    aws_lambda as _lambda,
    aws_apigateway as api_gw,
    aws_events as events,
    aws_events_targets as targets,
    aws_kinesisfirehose as _firehose,
    aws_iam as iam,
    aws_s3 as s3,
    Stack
)


class ApiEventBridgeLambdaStack(Stack):

    def __init__(self, scope: Construct, id: str, **kwargs) -> None:
        super().__init__(scope, id, **kwargs)

        #
        # Producer Lambda
        #
        event_producer_lambda = _lambda.Function(self, "eventProducerLambda",
                                                 runtime=_lambda.Runtime.PYTHON_3_8,
                                                 handler="event_producer_lambda.lambda_handler",
                                                 code=_lambda.Code.from_asset("lambda")
                                                 )

        event_policy = iam.PolicyStatement(effect=iam.Effect.ALLOW, resources=['*'], actions=['events:PutEvents'])

        event_producer_lambda.add_to_role_policy(event_policy)

        #
        # Approved Consumer1
        #
        event_consumer1_lambda = _lambda.Function(self, "eventConsumer1Lambda",
                                                  runtime=_lambda.Runtime.PYTHON_3_8,
                                                  handler="event_consumer_lambda.lambda_handler",
                                                  code=_lambda.Code.from_asset("lambda")
                                                  )

        event_consumer1_rule = events.Rule(self, 'eventConsumer1LambdaRule',
                                           description='Approved Transactions',
                                           event_pattern=events.EventPattern(source=['com.mycompany.myapp']
                                                                             ))

        event_consumer1_rule.add_target(targets.LambdaFunction(handler=event_consumer1_lambda))

        #
        # Approved Consumer2
        #
        event_consumer2_lambda = _lambda.Function(self, "eventConsumer2Lambda",
                                                  runtime=_lambda.Runtime.PYTHON_3_8,
                                                  handler="event_consumer_lambda.lambda_handler",
                                                  code=_lambda.Code.from_asset("lambda")
                                                  )

        event_consumer2_rule = events.Rule(self, 'eventConsumer2LambdaRule',
                                           description='Approved Transactions',
                                           event_pattern=events.EventPattern(source=['com.mycompany.myapp']
                                                                             ))
        event_consumer2_rule.add_target(targets.LambdaFunction(handler=event_consumer2_lambda))

        #
        # Approved Consumer3
        #

        # Create S3 bucket for KinesisFirehose destination
        ingest_bucket = s3.Bucket(self, 'test-ngest-bucket')

        # Create a Role for KinesisFirehose
        firehose_role = iam.Role(
            self, 'myRole',
            assumed_by=iam.ServicePrincipal('firehose.amazonaws.com'))

        # Create and attach policy that gives permissions to write in to the S3 bucket.
        iam.Policy(
            self, 's3_attr',
            policy_name='s3kinesis',
            statements=[iam.PolicyStatement(
                actions=['s3:*'],
                resources=['arn:aws:s3:::' + ingest_bucket.bucket_name + '/*'])],
                # resources=['*'])],
            roles=[firehose_role],
        )

        event_consumer3_kinesisfirehose = _firehose.CfnDeliveryStream(self, "consumer3-firehose",
                                                                      s3_destination_configuration=_firehose.CfnDeliveryStream.S3DestinationConfigurationProperty(
                                                                          bucket_arn=ingest_bucket.bucket_arn,
                                                                          buffering_hints=_firehose.CfnDeliveryStream.BufferingHintsProperty(
                                                                              interval_in_seconds=60
                                                                          ),
                                                                          compression_format="UNCOMPRESSED",
                                                                          role_arn=firehose_role.role_arn
                                                                      ))

        event_consumer3_rule = events.Rule(self, 'eventConsumer3KinesisRule',
                                           description='Approved Transactions',
                                           event_pattern=events.EventPattern(source=['com.mycompany.myapp']
                                                                             ))
        event_consumer3_rule.add_target(targets.KinesisFirehoseStream(stream=event_consumer3_kinesisfirehose))

        # defines an API Gateway REST API resource backed by our "atm_producer_lambda" function.
        api = api_gw.LambdaRestApi(self, 'SampleAPI-EventBridge-Multi-Consumer',
                             handler=event_producer_lambda,
                             proxy=False
                             )
        items = api.root.add_resource("items")
        items.add_method("POST")  # POST /items
