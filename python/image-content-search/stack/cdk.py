import yaml

from aws_cdk import (
    aws_s3_notifications as _s3notification,
    aws_lambda_event_sources as _lambda_event_source,
    aws_s3 as _s3,
    aws_cognito as _cognito,
    aws_sqs as _sqs,
    aws_iam as _iam,
    aws_events as _events,
    aws_events_targets as _event_targets,
    aws_rds as _rds,
    aws_secretsmanager as _secrets_manager,
    custom_resources as _custom_resources,
    core
)

from aws_cdk.aws_apigateway import (
    RestApi, 
    LambdaIntegration,
    CfnAuthorizer,
    AuthorizationType,
    MockIntegration,
    PassthroughBehavior
)

from aws_cdk.aws_lambda import (
    Code, 
    Function,
    Runtime
)

from aws_cdk.custom_resources import (
    AwsCustomResource,
    AwsCustomResourcePolicy,
    AwsSdkCall,
    PhysicalResourceId,
    Provider
)

class ImageContentSearchStack(core.Stack):

    def __init__(self, scope: core.Construct, id: str, **kwargs) -> None:
        super().__init__(scope, id, **kwargs)

        with open("stack/config.yml", 'r') as stream:
            configs = yaml.safe_load(stream)

        ### S3 core
        images_S3_bucket = _s3.Bucket(self, "ICS_IMAGES")

        images_S3_bucket.add_cors_rule(
            allowed_methods=[_s3.HttpMethods.POST],
            allowed_origins=["*"] # add API gateway web resource URL
        )

        ### SQS core
        image_deadletter_queue = _sqs.Queue(self, "ICS_IMAGES_DEADLETTER_QUEUE")
        image_queue = _sqs.Queue(self, "ICS_IMAGES_QUEUE",
            dead_letter_queue={
                "max_receive_count": configs["DeadLetterQueue"]["MaxReceiveCount"],
                "queue": image_deadletter_queue
            })

        ### api gateway core
        api_gateway = RestApi(self, 'ICS_API_GATEWAY', rest_api_name='ImageContentSearchApiGateway')
        api_gateway_resource = api_gateway.root.add_resource(configs["ProjectName"])
        api_gateway_landing_page_resource = api_gateway_resource.add_resource('web')
        api_gateway_get_signedurl_resource = api_gateway_resource.add_resource('signedUrl')
        api_gateway_image_search_resource = api_gateway_resource.add_resource('search')

        ### landing page function
        get_landing_page_function = Function(self, "ICS_GET_LANDING_PAGE",
            function_name="ICS_GET_LANDING_PAGE",
            runtime=Runtime.PYTHON_3_7,
            handler="main.handler",
            code=Code.asset("./src/landingPage"))

        get_landing_page_integration = LambdaIntegration(
            get_landing_page_function, 
            proxy=True, 
            integration_responses=[{
                'statusCode': '200',
               'responseParameters': {
                   'method.response.header.Access-Control-Allow-Origin': "'*'",
                }
            }])

        api_gateway_landing_page_resource.add_method('GET', get_landing_page_integration,
            method_responses=[{
                'statusCode': '200',
                'responseParameters': {
                    'method.response.header.Access-Control-Allow-Origin': True,
                }
            }])

        ### cognito
        required_attribute = _cognito.StandardAttribute(required=True)

        users_pool = _cognito.UserPool(self, "ICS_USERS_POOL",
            auto_verify=_cognito.AutoVerifiedAttrs(email=True), #required for self sign-up
            standard_attributes=_cognito.StandardAttributes(email=required_attribute), #required for self sign-up
            self_sign_up_enabled=configs["Cognito"]["SelfSignUp"])

        user_pool_app_client = _cognito.CfnUserPoolClient(self, "ICS_USERS_POOL_APP_CLIENT", 
            supported_identity_providers=["COGNITO"],
            allowed_o_auth_flows=["implicit"],
            allowed_o_auth_scopes=configs["Cognito"]["AllowedOAuthScopes"],
            user_pool_id=users_pool.user_pool_id,
            callback_ur_ls=[api_gateway_landing_page_resource.url],
            allowed_o_auth_flows_user_pool_client=True,
            explicit_auth_flows=["ALLOW_REFRESH_TOKEN_AUTH"])

        user_pool_domain = _cognito.UserPoolDomain(self, "ICS_USERS_POOL_DOMAIN", 
            user_pool=users_pool, 
            cognito_domain=_cognito.CognitoDomainOptions(domain_prefix=configs["Cognito"]["DomainPrefix"]))

        ### get signed URL function
        get_signedurl_function = Function(self, "ICS_GET_SIGNED_URL",
            function_name="ICS_GET_SIGNED_URL",
            environment={
                "ICS_IMAGES_BUCKET": images_S3_bucket.bucket_name,
                "DEFAULT_SIGNEDURL_EXPIRY_SECONDS": configs["Functions"]["DefaultSignedUrlExpirySeconds"]
            },
            runtime=Runtime.PYTHON_3_7,
            handler="main.handler",
            code=Code.asset("./src/getSignedUrl"))

        get_signedurl_integration = LambdaIntegration(
            get_signedurl_function, 
            proxy=True, 
            integration_responses=[{
                'statusCode': '200',
               'responseParameters': {
                   'method.response.header.Access-Control-Allow-Origin': "'*'",
                }
            }])

        api_gateway_get_signedurl_authorizer = CfnAuthorizer(self, "ICS_API_GATEWAY_GET_SIGNED_URL_AUTHORIZER",
            rest_api_id=api_gateway_get_signedurl_resource.rest_api.rest_api_id,
            name="ICS_API_GATEWAY_GET_SIGNED_URL_AUTHORIZER",
            type="COGNITO_USER_POOLS",
            identity_source="method.request.header.Authorization",
            provider_arns=[users_pool.user_pool_arn])

        api_gateway_get_signedurl_resource.add_method('GET', get_signedurl_integration,
            authorization_type=AuthorizationType.COGNITO,
            method_responses=[{
                'statusCode': '200',
                'responseParameters': {
                    'method.response.header.Access-Control-Allow-Origin': True,
                }
            }]
            ).node.find_child('Resource').add_property_override('AuthorizerId', api_gateway_get_signedurl_authorizer.ref)

        images_S3_bucket.grant_put(get_signedurl_function, objects_key_pattern="new/*")

        ### image massage function
        image_massage_function = Function(self, "ICS_IMAGE_MASSAGE",
            function_name="ICS_IMAGE_MASSAGE",
            timeout=core.Duration.seconds(6),
            runtime=Runtime.PYTHON_3_7,
            environment={"ICS_IMAGE_MASSAGE": image_queue.queue_name},
            handler="main.handler",
            code=Code.asset("./src/imageMassage"))

        images_S3_bucket.grant_write(image_massage_function, "processed/*")
        images_S3_bucket.grant_delete(image_massage_function, "new/*")
        images_S3_bucket.grant_read(image_massage_function, "new/*")
        
        new_image_added_notification = _s3notification.LambdaDestination(image_massage_function)

        images_S3_bucket.add_event_notification(_s3.EventType.OBJECT_CREATED, 
            new_image_added_notification, 
            _s3.NotificationKeyFilter(prefix="new/")
            )

        image_queue.grant_send_messages(image_massage_function)

        ### image analyzer function
        image_analyzer_function = Function(self, "ICS_IMAGE_ANALYSIS",
            function_name="ICS_IMAGE_ANALYSIS",
            runtime=Runtime.PYTHON_3_7,
            timeout=core.Duration.seconds(10),
            environment={
                "ICS_IMAGES_BUCKET": images_S3_bucket.bucket_name,
                "DEFAULT_MAX_CALL_ATTEMPTS": configs["Functions"]["DefaultMaxApiCallAttempts"],
                "REGION": core.Aws.REGION,
                },
            handler="main.handler",
            code=Code.asset("./src/imageAnalysis")) 

        image_analyzer_function.add_event_source(_lambda_event_source.SqsEventSource(queue=image_queue, batch_size=10))
        image_queue.grant_consume_messages(image_massage_function)

        lambda_rekognition_access = _iam.PolicyStatement(
            effect=_iam.Effect.ALLOW, 
            actions=["rekognition:DetectLabels", "rekognition:DetectModerationLabels"],
            resources=["*"]                    
        )

        image_analyzer_function.add_to_role_policy(lambda_rekognition_access)
        images_S3_bucket.grant_read(image_analyzer_function, "processed/*")

        ### API gateway finalizing
        self.add_cors_options(api_gateway_get_signedurl_resource)
        self.add_cors_options(api_gateway_landing_page_resource)
        self.add_cors_options(api_gateway_image_search_resource)

        ### database 
        database_secret = _secrets_manager.Secret(self, "ICS_DATABASE_SECRET",
            secret_name="rds-db-credentials/image-content-search-rds-secret",
            generate_secret_string=_secrets_manager.SecretStringGenerator(
                generate_string_key='password',
                secret_string_template='{"username": "dba"}',
                exclude_punctuation=True,
                exclude_characters='/@\" \\\'',
                require_each_included_type=True
            )
        )

        database = _rds.CfnDBCluster(self, "ICS_DATABASE",
            engine=_rds.DatabaseClusterEngine.aurora_mysql(version=_rds.AuroraMysqlEngineVersion.VER_5_7_12).engine_type,
            engine_mode="serverless",
            database_name=configs["Database"]["Name"],
            enable_http_endpoint=True,
            deletion_protection=configs["Database"]["DeletionProtection"],
            master_username=database_secret.secret_value_from_json("username").to_string(),
            master_user_password=database_secret.secret_value_from_json("password").to_string(),
            scaling_configuration=_rds.CfnDBCluster.ScalingConfigurationProperty(
                auto_pause=configs["Database"]["Scaling"]["AutoPause"],
                min_capacity=configs["Database"]["Scaling"]["Min"],
                max_capacity=configs["Database"]["Scaling"]["Max"],
                seconds_until_auto_pause=configs["Database"]["Scaling"]["SecondsToAutoPause"]
            ),
        )

        database_cluster_arn = "arn:aws:rds:{}:{}:cluster:{}".format(core.Aws.REGION, core.Aws.ACCOUNT_ID, database.ref)
   
        secret_target = _secrets_manager.CfnSecretTargetAttachment(self,"ICS_DATABASE_SECRET_TARGET",
            target_type="AWS::RDS::DBCluster",
            target_id=database.ref,
            secret_id=database_secret.secret_arn
        )

        secret_target.node.add_dependency(database)

        ### database function
        image_data_function_role = _iam.Role(self, "ICS_IMAGE_DATA_FUNCTION_ROLE",
            role_name="ICS_IMAGE_DATA_FUNCTION_ROLE",
            assumed_by=_iam.ServicePrincipal("lambda.amazonaws.com"),
            managed_policies=[
                _iam.ManagedPolicy.from_aws_managed_policy_name("service-role/AWSLambdaVPCAccessExecutionRole"),
                _iam.ManagedPolicy.from_aws_managed_policy_name("service-role/AWSLambdaBasicExecutionRole"),
                _iam.ManagedPolicy.from_aws_managed_policy_name("AmazonRDSDataFullAccess")
            ]
        )
        
        image_data_function = Function(self, "ICS_IMAGE_DATA",
            function_name="ICS_IMAGE_DATA",
            runtime=Runtime.PYTHON_3_7,
            timeout=core.Duration.seconds(5),
            role=image_data_function_role,
            environment={
                "DEFAULT_MAX_CALL_ATTEMPTS": configs["Functions"]["DefaultMaxApiCallAttempts"],
                "CLUSTER_ARN": database_cluster_arn,
                "CREDENTIALS_ARN": database_secret.secret_arn,
                "DB_NAME": database.database_name,
                "REGION": core.Aws.REGION
                },
            handler="main.handler",
            code=Code.asset("./src/imageData")
        ) 

        image_search_integration = LambdaIntegration(
            image_data_function, 
            proxy=True, 
            integration_responses=[{
                'statusCode': '200',
               'responseParameters': {
                   'method.response.header.Access-Control-Allow-Origin': "'*'",
                }
            }])

        api_gateway_image_search_authorizer = CfnAuthorizer(self, "ICS_API_GATEWAY_IMAGE_SEARCH_AUTHORIZER",
            rest_api_id=api_gateway_image_search_resource.rest_api.rest_api_id,
            name="ICS_API_GATEWAY_IMAGE_SEARCH_AUTHORIZER",
            type="COGNITO_USER_POOLS", 
            identity_source="method.request.header.Authorization",
            provider_arns=[users_pool.user_pool_arn])

        api_gateway_image_search_resource.add_method('POST', image_search_integration,
            authorization_type=AuthorizationType.COGNITO,
            method_responses=[{
                'statusCode': '200',
                'responseParameters': {
                    'method.response.header.Access-Control-Allow-Origin': True,
                }
            }]
            ).node.find_child('Resource').add_property_override('AuthorizerId', api_gateway_image_search_authorizer.ref)


        lambda_access_search = _iam.PolicyStatement(
            effect=_iam.Effect.ALLOW, 
            actions=["translate:TranslateText"],
            resources=["*"]            
        ) 

        image_data_function.add_to_role_policy(lambda_access_search)

        ### custom resource
        lambda_provider = Provider(self, 'ICS_IMAGE_DATA_PROVIDER', 
            on_event_handler=image_data_function
        )

        core.CustomResource(self, 'ICS_IMAGE_DATA_RESOURCE', 
            service_token=lambda_provider.service_token,
            pascal_case_properties=False,
            resource_type="Custom::SchemaCreation",
            properties={
                "source": "Cloudformation"
            }
        )

        ### event bridge
        event_bus = _events.EventBus(self, "ICS_IMAGE_CONTENT_BUS")

        event_rule = _events.Rule(self, "ICS_IMAGE_CONTENT_RULE",
            rule_name="ICS_IMAGE_CONTENT_RULE",
            description="The event from image analyzer to store the data",
            event_bus=event_bus,
            event_pattern=_events.EventPattern(resources=[image_analyzer_function.function_arn]),
        )

        event_rule.add_target(_event_targets.LambdaFunction(image_data_function))

        event_bus.grant_put_events(image_analyzer_function)
        image_analyzer_function.add_environment("EVENT_BUS", event_bus.event_bus_name)

        ### outputs
        core.CfnOutput(self, 'CognitoHostedUILogin',
            value='https://{}.auth.{}.amazoncognito.com/login?client_id={}&response_type=token&scope={}&redirect_uri={}'.format(user_pool_domain.domain_name, core.Aws.REGION, user_pool_app_client.ref, '+'.join(user_pool_app_client.allowed_o_auth_scopes), api_gateway_landing_page_resource.url),
            description='The Cognito Hosted UI Login Page'
        )

    def add_cors_options(self, apigw_resource):
        apigw_resource.add_method('OPTIONS', MockIntegration(
            integration_responses=[{
                'statusCode': '200',
                'responseParameters': {
                    'method.response.header.Access-Control-Allow-Headers': "'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token'",
                    'method.response.header.Access-Control-Allow-Origin': "'*'",
                    'method.response.header.Access-Control-Allow-Methods': "'GET,OPTIONS'"
                }
            }
            ],
            passthrough_behavior=PassthroughBehavior.WHEN_NO_MATCH,
            request_templates={"application/json":"{\"statusCode\":200}"}
        ),
        method_responses=[{
            'statusCode': '200',
            'responseParameters': {
                'method.response.header.Access-Control-Allow-Headers': True,
                'method.response.header.Access-Control-Allow-Methods': True,
                'method.response.header.Access-Control-Allow-Origin': True,
                }
            }
        ],
    )