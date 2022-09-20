from aws_cdk import (
    App,
    Aws,
    CfnOutput,
    Stack,
    aws_iam as iam,
    aws_lambda as _lambda,
    aws_s3 as s3,
    aws_s3objectlambda as s3_object_lambda,
)

# configurable variables
S3_ACCESS_POINT_NAME = "example-test-ap"
OBJECT_LAMBDA_ACCESS_POINT_NAME = "s3-object-lambda-ap"


class S3ObjectLambdaStack(Stack):
    def __init__(self, app: App, id: str) -> None:
        super().__init__(app, id)
        self.access_point = f"arn:aws:s3:{Aws.REGION}:{Aws.ACCOUNT_ID}:accesspoint/" \
                            f"{S3_ACCESS_POINT_NAME}"

        # Set up a bucket
        bucket = s3.Bucket(self, "example-bucket",
                           access_control=s3.BucketAccessControl.BUCKET_OWNER_FULL_CONTROL,
                           encryption=s3.BucketEncryption.S3_MANAGED,
                           block_public_access=s3.BlockPublicAccess.BLOCK_ALL)
        # Delegating access control to access points
        # https://docs.aws.amazon.com/AmazonS3/latest/userguide/access-points-policies.html
        bucket.add_to_resource_policy(iam.PolicyStatement(
            actions=["*"],
            principals=[iam.AnyPrincipal()],
            resources=[
                bucket.bucket_arn,
                bucket.arn_for_objects('*')
            ],
            conditions={
                "StringEquals":
                    {
                        "s3:DataAccessPointAccount": f"{Aws.ACCOUNT_ID}"
                    }
            }
        ))

        # lambda to process our objects during retrieval
        retrieve_transformed_object_lambda = _lambda.Function(
            self, "retrieve_transformed_obj_lambda",
            runtime=_lambda.Runtime.PYTHON_3_8,
            handler="index.handler",
            code=_lambda.Code.from_asset("lambda/retrieve_transformed_object_lambda"))

        # Object lambda s3 access
        retrieve_transformed_object_lambda.add_to_role_policy(iam.PolicyStatement(
            effect=iam.Effect.ALLOW,
            resources=["*"],
            actions=["s3-object-lambda:WriteGetObjectResponse"]
        ))
        # Restrict Lambda to be invoked from own account
        retrieve_transformed_object_lambda.add_permission("invocationRestriction",
                                                          action="lambda:InvokeFunction",
                                                          principal=iam.AccountRootPrincipal(),
                                                          source_account=Aws.ACCOUNT_ID)

        # Associate Bucket's access point with lambda get access
        if retrieve_transformed_object_lambda.role is not None:
            policy_doc = iam.PolicyDocument()
            policy_statement = iam.PolicyStatement(
                effect=iam.Effect.ALLOW,
                actions=["s3:GetObject"],
                principals=[
                    iam.ArnPrincipal(retrieve_transformed_object_lambda.role.role_arn)
                ],
                resources=[
                    f"{self.access_point}/object/*"
                ])
        policy_statement.sid = "AllowLambdaToUseAccessPoint"
        policy_doc.add_statements(policy_statement)

        example_bucket_ap = s3.CfnAccessPoint(
            self, "example-bucket_ap",
            bucket=bucket.bucket_name,
            name=S3_ACCESS_POINT_NAME,
            policy=policy_doc
        )

        # Access point to receive GET request and use lambda to process objects
        object_lambda_ap = s3_object_lambda.CfnAccessPoint(
            self,
            "s3_object_lambda_ap",
            name=OBJECT_LAMBDA_ACCESS_POINT_NAME,
            object_lambda_configuration=
            s3_object_lambda.CfnAccessPoint.ObjectLambdaConfigurationProperty(
                supporting_access_point=self.access_point,
                transformation_configurations=[
                    s3_object_lambda.CfnAccessPoint.TransformationConfigurationProperty(
                        actions=["GetObject"],
                        content_transformation={
                            "AwsLambda": {
                                "FunctionArn": f"{retrieve_transformed_object_lambda.function_arn}"
                            }
                        }
                    )
                ]
            )
        )

        CfnOutput(self, "exampleBucketArn", value=bucket.bucket_arn)
        CfnOutput(self, "objectLambdaArn",
                      value=retrieve_transformed_object_lambda.function_arn)
        CfnOutput(self, "objectLambdaAccessPointArn", value=object_lambda_ap.attr_arn)
        CfnOutput(self, "objectLambdaAccessPointUrl",
                      value=f"https://console.aws.amazon.com/s3/olap/{Aws.ACCOUNT_ID}/"
                            f"{OBJECT_LAMBDA_ACCESS_POINT_NAME}?region={Aws.REGION}")
