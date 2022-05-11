import os
import typing
from aws_cdk import (
    aws_lambda,
    aws_ecr,
    App, Aws, Duration, Stack
)
from constructs import Construct


class LambdaContainerFunctionStack(Stack):
    def __init__(self, scope: Construct, id: str, **kwargs) -> None:
        super().__init__(scope, id, **kwargs)


        image_name    = "lambdaContainerFunction"

        ##
        ## If use_pre_existing_image is True
        ## then use an image that already exists in ECR.
        ## Otherwise, build a new image
        ##
        use_pre_existing_image = False



        ##
        ## ECR
        ##
        if (use_pre_existing_image):

            ##
            ## Container was build previously, or elsewhere.
            ## Use the pre-existing container
            ##
            ecr_repository = aws_ecr.Repository.from_repository_attributes(self,
                id              = "ECR",
                repository_arn  ='arn:aws:ecr:{0}:{1}'.format(Aws.REGION, Aws.ACCOUNT_ID),
                repository_name = image_name
            ) ## aws_ecr.Repository.from_repository_attributes

            ##
            ## Container Image.
            ## Pulled from the ECR repository.
            ##
            # ecr_image is expecting a `Code` type, so casting `EcrImageCode` to `Code` resolves mypy error
            ecr_image = typing.cast("aws_lambda.Code", aws_lambda.EcrImageCode(
                repository = ecr_repository
            )) ## aws_lambda.EcrImageCode

        else:
            ##
            ## Create new Container Image.
            ##
            ecr_image = aws_lambda.EcrImageCode.from_asset_image(
                directory = os.path.join(os.getcwd(), "lambda-image")
            )




        ##
        ## Lambda Function
        ##
        aws_lambda.Function(self,
          id            = "lambdaContainerFunction",
          description   = "Sample Lambda Container Function",
          code          = ecr_image,
          ##
          ## Handler and Runtime must be *FROM_IMAGE*
          ## when provisioning Lambda from Container.
          ##
          handler       = aws_lambda.Handler.FROM_IMAGE,
          runtime       = aws_lambda.Runtime.FROM_IMAGE,
          environment   = {"hello":"world"},
          function_name = "sampleContainerFunction",
          memory_size   = 128,
          reserved_concurrent_executions = 10,
          timeout       = Duration.seconds(10),
        ) ## aws_lambda.Function






app = App()
env = {'region': 'us-east-1'}

LambdaContainerFunctionStack(app, "LambdaContainerFunctionStack", env=env)

app.synth()

