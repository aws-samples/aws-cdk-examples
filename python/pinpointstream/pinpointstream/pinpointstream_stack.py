from aws_cdk import (
    core,
    aws_iam as iam,
    aws_lambda as _lambda,
    aws_dynamodb as ddb,
    aws_pinpoint as pp,
    aws_kinesis as ks,
)
from aws_cdk.aws_lambda_event_sources import KinesisEventSource


class PinpointstreamStack(core.Stack):

    def __init__(self, scope: core.Construct, construct_id: str, **kwargs) -> None:
        super().__init__(scope, construct_id, **kwargs)

        pinpoint_app = pp.CfnApp(
            self,'PinpointApp',
            name = 'pinpoint_project_name'
        )

        pinpoint_sms_channel = pp.CfnSMSChannel(
            self,'SMSChannel',
            application_id = pinpoint_app.ref,
            enabled = True,
        )

        stream = ks.Stream(
            self,'Stream',
        )

        pinpoint_to_kinesis_role = iam.Role(
            self, 'PinpointToKinesisRole',
            assumed_by = iam.ServicePrincipal('pinpoint.amazonaws.com'),
            inline_policies = [
                iam.PolicyDocument(
                    statements = [
                        iam.PolicyStatement(
                            actions = ['kinesis:*'],
                            effect = iam.Effect.ALLOW,
                            resources = [stream.stream_arn]
                        )
                    ]
                )
            ]
        )

        pinpoint_event_stream = pp.CfnEventStream(
            self, 'pinpoint_stream',
            application_id = pinpoint_app.ref,
            destination_stream_arn = stream.stream_arn,
            role_arn = pinpoint_to_kinesis_role.role_arn
        )

        lambda_to_pinpoint_role = iam.Role(
            self, 'LambdaToPinpointRole',
            assumed_by = iam.ServicePrincipal('lambda.amazonaws.com'),
            managed_policies = [iam.ManagedPolicy.from_aws_managed_policy_name("service-role/AWSLambdaBasicExecutionRole")], 
            inline_policies = [
                iam.PolicyDocument(
                    statements = [
                        iam.PolicyStatement(
                            actions = ['mobiletargeting:*'],
                            effect = iam.Effect.ALLOW,
                            resources = [pinpoint_app.attr_arn + '/*']
                        )
                    ]
                )
            ]
        )
        
        send_sms_lambda = _lambda.Function(
            self, 'SendSMS',
            runtime=_lambda.Runtime.PYTHON_3_7,
            code=_lambda.Code.asset('lambda'),
            handler='send_sms.handler',
            role= lambda_to_pinpoint_role,
            environment ={
                'PINPOINT_APP_NAME':pinpoint_app.ref
            }
        )

        table = ddb.Table(
            self, 'StreamData',
            partition_key={'name':'event_timestamp', 'type': ddb.AttributeType.STRING}
        )

        process_stream_lambda = _lambda.Function(
            self, 'ProcessStream',
            runtime=_lambda.Runtime.PYTHON_3_7,
            code=_lambda.Code.asset('lambda'),
            handler='process_stream.handler',
            environment ={
                'STREAM_TABLE_NAME':table.table_name
            }
        )

        table.grant_read_write_data(process_stream_lambda)

        process_stream_lambda.add_event_source(KinesisEventSource(stream,
        batch_size=100, # default
        starting_position=_lambda.StartingPosition.LATEST
        ))