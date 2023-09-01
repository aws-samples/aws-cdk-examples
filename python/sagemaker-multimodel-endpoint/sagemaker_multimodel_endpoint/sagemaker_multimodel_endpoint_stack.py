from aws_cdk import aws_ecr_assets, aws_s3, aws_iam, aws_s3_deployment, aws_sagemaker as sagemaker, Stack
from constructs import Construct


class SagemakerMultimodelEndpointStack(Stack):
    def __init__(self, scope: Construct, construct_id: str, **kwargs) -> None:

        super().__init__(scope, construct_id, **kwargs)

        # ECR asset for our Docker image
        asset = aws_ecr_assets.DockerImageAsset(
            self, "EndpointImage", directory="./docker"
        )

        # Bucket used for storing models
        models_bucket = aws_s3.Bucket(self, "ModelsBucket")

        # Deployment that uploads content of models directory to the S3 bucket
        models_deployment = aws_s3_deployment.BucketDeployment(
            self,
            "Models",
            sources=[aws_s3_deployment.Source.asset("./models")],
            destination_bucket=models_bucket,
            destination_key_prefix="models",
            memory_limit=512,
        )

        # Role used by SageMaker to deploy models from S3
        sagemaker_role = aws_iam.Role(
            self,
            "automodeldeploy-sagemaker-role",
            assumed_by=aws_iam.ServicePrincipal("sagemaker.amazonaws.com"),
        )
        sagemaker_role.add_managed_policy(
            aws_iam.ManagedPolicy.from_aws_managed_policy_name(
                "AmazonSageMakerFullAccess"
            )
        )
        sagemaker_role.add_to_policy(
            aws_iam.PolicyStatement(
                resources=["arn:aws:s3:::*"],
                actions=[
                    "s3:GetObject",
                    "s3:PutObject",
                    "s3:DeleteObject",
                    "s3:ListBucket",
                ],
            )
        )

        model_name = f"MultiModel"
        endpoint_config_name = f"MultiModel"
        endpoint_name = "MultiModelEndpoint"
        cfn_model = sagemaker.CfnModel(
            self,
            "MultiModel",
            execution_role_arn=sagemaker_role.role_arn,
            containers=[
                sagemaker.CfnModel.ContainerDefinitionProperty(
                    image=asset.image_uri,
                    mode="MultiModel",
                    model_data_url=models_bucket.url_for_object("models"),
                )
            ],
            enable_network_isolation=False,
            model_name=model_name,
        )
        cfn_endpoint_config = sagemaker.CfnEndpointConfig(
            self,
            "MultiModelEndpointConfig",
            production_variants=[
                sagemaker.CfnEndpointConfig.ProductionVariantProperty(
                    instance_type="ml.m5.xlarge",
                    initial_instance_count=2,
                    initial_variant_weight=1,
                    model_name=cfn_model.model_name,
                    variant_name="all",
                )
            ],
            endpoint_config_name=endpoint_config_name,
        )
        # Ensure that the Model is provisioned before the EndpointConfig is provisioned
        cfn_endpoint_config.add_depends_on(cfn_model)
        cfn_endpoint = sagemaker.CfnEndpoint(
            self,
            "MultiModelEndpoint",
            endpoint_config_name=cfn_endpoint_config.endpoint_config_name,
            endpoint_name=endpoint_name,
        )
        # Ensure that the EndpointConfig is provisioned before the Endpoint is provisioned
        cfn_endpoint.add_depends_on(cfn_endpoint_config)
