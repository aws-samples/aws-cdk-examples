import boto3
import platform
import cdk_nag
from aws_cdk import (
    aws_dynamodb as ddb,
    aws_ecr_assets,
    aws_iam as iam,
    aws_lambda as lambda_,
    aws_lambda_event_sources as event_sources,
    aws_logs as logs,
    aws_sqs as sqs,
    CfnOutput,
    CfnParameter,
    Duration,
    RemovalPolicy,
    Stack
)
from constructs import Construct


class MessageRouter(Construct):
    def __init__(self,
                 scope: Stack,
                 construct_id: str,
                 wa_notification_handler_lambda: lambda_.Function,
                 consent_table: ddb.TableV2,
                 message_tracking_table: ddb.TableV2,
                 configuration_set_arn: CfnParameter,
                 message_type: CfnParameter,
                 origination_entity: CfnParameter,
                 default_whatsapp_template: CfnParameter,
                 default_whatsapp_phone_arn: CfnParameter,
                 dlq: sqs.Queue) -> None:
        super().__init__(scope, construct_id)

        # Create the queues where the REST API will put the requests for sending the messages
        self.sms_queue = sqs.Queue(scope=self,
                                   id='SMSMessagingQueue',
                                   removal_policy=RemovalPolicy.DESTROY,
                                   retention_period=Duration.hours(2),
                                   dead_letter_queue=sqs.DeadLetterQueue(max_receive_count=2 * 3600 // 30,
                                                                         queue=dlq))
        self.sms_queue.add_to_resource_policy(iam.PolicyStatement(effect=iam.Effect.DENY,
                                                                  principals=[iam.AnyPrincipal()],
                                                                  actions=['sqs:*'],
                                                                  resources=[self.sms_queue.queue_arn],
                                                                  conditions={'Bool': {
                                                                      'aws:SecureTransport': 'false'}}))

        self.wa_queue = sqs.Queue(scope=self,
                                  id='WhatsAppMessagingQueue',
                                  removal_policy=RemovalPolicy.DESTROY,
                                  retention_period=Duration.hours(2),
                                  dead_letter_queue=sqs.DeadLetterQueue(max_receive_count=2 * 3600 // 30,
                                                                        queue=dlq))
        self.wa_queue.add_to_resource_policy(iam.PolicyStatement(effect=iam.Effect.DENY,
                                                                 principals=[iam.AnyPrincipal()],
                                                                 actions=['sqs:*'],
                                                                 resources=[self.wa_queue.queue_arn],
                                                                 conditions={'Bool': {
                                                                     'aws:SecureTransport': 'false'}}))

        # DynamoDB table to keep track of open communication windows
        consent_table.grant_read_write_data(wa_notification_handler_lambda)

        # Create a lambda for sending the SMS & WhatsApp messages
        # Determine the lambda platform architecture
        if platform.machine() == 'arm64':
            lambda_architecture = lambda_.Architecture.ARM_64
            lambda_platform = aws_ecr_assets.Platform.LINUX_ARM64
        else:
            lambda_architecture = lambda_.Architecture.X86_64
            lambda_platform = aws_ecr_assets.Platform.LINUX_AMD64

        base_lambda_policy = iam.ManagedPolicy.from_aws_managed_policy_name(
            managed_policy_name='service-role/AWSLambdaBasicExecutionRole')
        sms_sender_lambda_role = iam.Role(scope=self,
                                          id='SQS2SMSLambdaRole',
                                          assumed_by=iam.ServicePrincipal('lambda.amazonaws.com'),
                                          managed_policies=[base_lambda_policy])
        sms_sender_lambda_role.add_to_policy(iam.PolicyStatement(sid='SMSMessagingStatement',
                                                                 effect=iam.Effect.ALLOW,
                                                                 resources=[origination_entity.value_as_string],
                                                                 actions=['sms-voice:SendTextMessage']))
        self.sms_sender_lambda = lambda_.Function(scope=self,
                                                  id='SMSSender',
                                                  code=lambda_.Code.from_asset('lambda/send_sms'),
                                                  runtime=lambda_.Runtime.PYTHON_3_13,
                                                  handler='main.handler',
                                                  environment={'CONFIGURATION_SET':
                                                                   configuration_set_arn.value_as_string,
                                                               'MESSAGE_TYPE': message_type.value_as_string,
                                                               'ORIGINATION_ENTITY': origination_entity.value_as_string,
                                                               'MESSAGE_TRACKING_TABLE_NAME':
                                                                   message_tracking_table.table_name},
                                                  timeout=Duration.seconds(5),
                                                  memory_size=256,
                                                  role=sms_sender_lambda_role,
                                                  architecture=lambda_architecture,
                                                  log_group=logs.LogGroup(scope=self,
                                                                          id='SMSSenderLogGroup',
                                                                          retention=logs.RetentionDays.THREE_DAYS,
                                                                          removal_policy=RemovalPolicy.DESTROY))
        self.sms_sender_lambda.add_event_source(event_sources.SqsEventSource(self.sms_queue))
        message_tracking_table.grant_read_write_data(self.sms_sender_lambda)

        # Lambda that sends the SQS messagges to WhatsApp
        default_whatsapp_phone_arn = default_whatsapp_phone_arn.value_as_string
        if len(default_whatsapp_phone_arn) == 0:
            default_whatsapp_phone_arn = self.get_waba_phone_number_arn()
        wa_sender_lambda_role = iam.Role(scope=self,
                                         id='SQS2WhatsAppLambdaRole',
                                         assumed_by=iam.ServicePrincipal('lambda.amazonaws.com'),
                                         managed_policies=[base_lambda_policy])
        wa_sender_lambda_role.add_to_policy(iam.PolicyStatement(sid='SocialMessagingStatement',
                                                                effect=iam.Effect.ALLOW,
                                                                resources=[default_whatsapp_phone_arn],
                                                                actions=['social-messaging:SendWhatsAppMessage']))
        image = lambda_.DockerImageCode.from_image_asset('lambda/send_whatsapp',
                                                         platform=lambda_platform)
        self.wa_sender_lambda = lambda_.DockerImageFunction(scope=self,
                                                            id='WASender',
                                                            code=image,
                                                            environment={'CONSENT_TABLE_NAME':
                                                                             consent_table.table_name,
                                                                         'MESSAGE_TRACKING_TABLE_NAME':
                                                                             message_tracking_table.table_name,
                                                                         'WA_TEMPLATE_NAME':
                                                                             default_whatsapp_template.value_as_string,
                                                                         'WHATSAPP_PHONE_ID':
                                                                             default_whatsapp_phone_arn},
                                                            timeout=Duration.seconds(5),
                                                            memory_size=256,
                                                            architecture=lambda_architecture,
                                                            role=wa_sender_lambda_role,
                                                            log_group=logs.LogGroup(scope=self,
                                                                                    id='WASenderLogGroup',
                                                                                    retention=logs.RetentionDays.THREE_DAYS,
                                                                                    removal_policy=RemovalPolicy.DESTROY))
        self.wa_sender_lambda.add_environment(key='WHATSAPP_PHONE_ID', value=default_whatsapp_phone_arn)
        self.wa_sender_lambda.add_event_source(event_sources.SqsEventSource(self.wa_queue))
        message_tracking_table.grant_read_write_data(self.wa_sender_lambda)
        consent_table.grant_read_write_data(self.wa_sender_lambda)

        # Stack outputs
        CfnOutput(self, "WABAPhoneARN",
                  description="WhatsApp Business Applications configured phone number ARN",
                  value=default_whatsapp_phone_arn)

        # Add cdk-nag suppresions for lambdas using the base lambda policy
        for path in ('/MessagingRESTAPI/MessageRouter/SQS2SMSLambdaRole/Resource',
                     '/MessagingRESTAPI/MessageRouter/SQS2WhatsAppLambdaRole/Resource'):
            cdk_nag.NagSuppressions.add_resource_suppressions_by_path(stack=scope,
                                                                      path=path,
                                                                      suppressions=[
                                                                          {
                                                                              "id": "AwsSolutions-IAM4",
                                                                              "reason": 'Using the AWS Lambda base '
                                                                                        'policy as starting point for the '
                                                                                        'Lambda roles',
                                                                          }
                                                                      ])
        for path in ('/MessagingRESTAPI/MessageRouter/SQS2SMSLambdaRole/DefaultPolicy/Resource',
                     '/MessagingRESTAPI/MessageRouter/SQS2WhatsAppLambdaRole/DefaultPolicy/Resource'):
            cdk_nag.NagSuppressions.add_resource_suppressions_by_path(stack=scope,
                                                                      path=path,
                                                                      suppressions=[
                                                                          {
                                                                              "id": "AwsSolutions-IAM5",
                                                                              "reason": 'Using the AWS Lambda base '
                                                                                        'policy as starting point for the '
                                                                                        'Lambda roles, as well as policies '
                                                                                        'created automatically by CDK when '
                                                                                        'granting read-write permissions '
                                                                                        'to the DynamoDB table',
                                                                          }
                                                                      ])

    @staticmethod
    def get_waba_phone_number_arn() -> str:
        """
        Try to automatically determine the sender phone number ARN

        The method will query the social messaging service. If there is only one account
        linked with a single phone number, the code will use that.
        """
        # If no phone id was provided, try to find it
        whatsapp = boto3.client('socialmessaging')
        try:
            response = whatsapp.list_linked_whatsapp_business_accounts(maxResults=1)
            if len(response['linkedAccounts']) != 1:
                raise RuntimeError('Could not automatically determine the WhatsApp phone number and none was defined')

            waba_id = response['linkedAccounts'][0]['id']
            response = whatsapp.get_linked_whatsapp_business_account(id=waba_id)
            if response['account']['registrationStatus'] != 'COMPLETE':
                raise RuntimeError('Business account is not fully registered')
            if len(response['account']['phoneNumbers']) != 1:
                raise RuntimeError('Cannot determine automatically what WhatsApp phone number to use')
            phone_arn = response['account']['phoneNumbers'][0]['arn']
        except whatsapp.exceptions.ClientError:
            phone_arn = ''

        return phone_arn
