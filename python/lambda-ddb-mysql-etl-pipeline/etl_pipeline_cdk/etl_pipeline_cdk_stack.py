from aws_cdk import (
    core,
    aws_s3 as s3,
    aws_s3_notifications as s3n,
    aws_lambda as _lambda,
    aws_dynamodb as ddb,
    aws_events as events,
    aws_events_targets as targets,
)

class EtlPipelineCdkStack(core.Stack):
    """Define the custom CDK stack construct class that inherits from the cdk.Construct base class.

    Notes:
        This is the meat of our stack that will be built in app.py of the CDK application.

         Lambda inline code ex. => You can use the following in lieu of AssetCode() for inline code:
            with open("lambda/dbwrite.py", encoding="utf8") as fp:
                handler_code = fp.read()
            ...code=_lambda.InlineCode(handler_code)...
        *Please consider char limits for inline code write.
    """

    def __init__(self, scope: core.Construct, id: str, **kwargs) -> None:
        """Invoke the base class constructor via super with the received scope, id, and props

        Args:
            scope: Defines scope in which this custom construct stack is created.
            id (str): Defines local identity of the construct. Must be unique amongst constructs
                within the same scope, as it's used to formulate the cF logical id for each resource
                defined in this scope.
            kwargs: Lots of possibilities
        """

        # example of passing app.py level params to stack class
        self.stage=kwargs['stage']
        kwargs={}

        super().__init__(scope, id, **kwargs)

        # Resources to create
        s3_bucket = s3.Bucket(
            self, "Bucket",
            bucket_name=f"asteroids-{self.stage}",
            versioned=False,
            removal_policy=core.RemovalPolicy.DESTROY # NOT recommended for production code
        )

        ddb_asteroids_table = ddb.Table(
            self, "Table",
            table_name="asteroids_table",
            partition_key={
                "name": "id",
                "type": ddb.AttributeType.STRING
            },
            removal_policy=core.RemovalPolicy.DESTROY # NOT recommended for production code
        )

        # Lambdas and layers
        requests_layer = _lambda.LayerVersion(
            self, "requests",
            code=_lambda.AssetCode('layers/requests.zip'))
        pandas_layer = _lambda.LayerVersion(
            self, "pandas",
            code=_lambda.AssetCode('layers/pandas.zip'))
        pymysql_layer = _lambda.LayerVersion(
            self, "pymysql",
            code=_lambda.AssetCode('layers/pymysql.zip'))

        process_asteroid_data = _lambda.Function(
            self, "ProcessAsteroidsLambda",
            runtime=_lambda.Runtime.PYTHON_3_7,
            code=_lambda.AssetCode("lambda"),
            handler="asteroids.handler",
            layers=[requests_layer],
            environment={
                "S3_BUCKET": s3_bucket.bucket_name,
                "NASA_KEY": self.node.try_get_context("NASA_KEY"),
            }
        )

        db_write = _lambda.Function(
            self, "DbWriteLambda",
            runtime=_lambda.Runtime.PYTHON_3_7,
            handler="dbwrite.handler",
            layers=[pandas_layer, pymysql_layer],
            code=_lambda.Code.asset('lambda'),
            environment={
                "ASTEROIDS_TABLE": ddb_asteroids_table.table_name,
                "S3_BUCKET": s3_bucket.bucket_name,
                "SCHEMA": self.node.try_get_context("SCHEMA"),
                "REGION": self.node.try_get_context("REGION"),
                "DB_SECRETS": self.node.try_get_context("DB_SECRETS_REF"),
                "TOPIC_ARN": self.node.try_get_context("TOPIC_ARN")
            }
        )

        # Rules and Events
        json_rule = events.Rule(
            self, "JSONRule",
            schedule=events.Schedule.cron(
                minute="15",
                hour="*",
                month="*",
                week_day="*",
                year="*"
                )
        )

        csv_rule = events.Rule(
            self, "CSVRule",
            schedule=events.Schedule.cron(
                minute="30",
                hour="*",
                month="*",
                week_day="*",
                year="*"
                )
        )

        # add lambda function target as well as custom trigger input to rules
        json_rule.add_target(
            targets.LambdaFunction(
                process_asteroid_data,
                event=events.RuleTargetInput.from_text("json")
                )
            )
        csv_rule.add_target(
            targets.LambdaFunction(
                process_asteroid_data,
                event=events.RuleTargetInput.from_text("csv")
                )
            )
        # create s3 notification for the db_write function
        notify_lambda = s3n.LambdaDestination(db_write)
        # assign 'notify_lambda' notification for 'OBJECT_CREATED' event type
        s3_bucket.add_event_notification(s3.EventType.OBJECT_CREATED, notify_lambda)

        # Permissions
        s3_bucket.grant_read_write(process_asteroid_data)
        s3_bucket.grant_read_write(db_write)
        ddb_asteroids_table.grant_read_write_data(db_write)
