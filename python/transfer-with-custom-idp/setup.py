import setuptools


with open("README.md") as fp:
    long_description = fp.read()


setuptools.setup(
    name="transfer_with_custom_idp",
    version="0.0.1",

    description="Transfer for SFTp with Custom IdP",
    long_description=long_description,
    long_description_content_type="text/markdown",

    install_requires=[
        "attrs==20.2.0",
        "aws-cdk.assets==1.71.0",
        "aws-cdk.aws-apigateway==1.71.0",
        "aws-cdk.aws-apigatewayv2==1.71.0",
        "aws-cdk.aws-applicationautoscaling==1.71.0",
        "aws-cdk.aws-autoscaling-common==1.71.0",
        "aws-cdk.aws-certificatemanager==1.71.0",
        "aws-cdk.aws-cloudwatch==1.71.0",
        "aws-cdk.aws-codeguruprofiler==1.71.0",
        "aws-cdk.aws-ec2==1.71.0",
        "aws-cdk.aws-efs==1.71.0",
        "aws-cdk.aws-elasticloadbalancingv2==1.71.0",
        "aws-cdk.aws-events==1.71.0",
        "aws-cdk.aws-iam==1.71.0",
        "aws-cdk.aws-kms==1.71.0",
        "aws-cdk.aws-lambda==1.71.0",
        "aws-cdk.aws-logs==1.71.0",
        "aws-cdk.aws-route53==1.71.0",
        "aws-cdk.aws-s3==1.71.0",
        "aws-cdk.aws-s3-assets==1.71.0",
        "aws-cdk.aws-sam==1.71.0",
        "aws-cdk.aws-secretsmanager==1.71.0",
        "aws-cdk.aws-sqs==1.71.0",
        "aws-cdk.aws-ssm==1.71.0",
        "aws-cdk.aws-transfer==1.71.0",
        "aws-cdk.cloud-assembly-schema==1.71.0",
        "aws-cdk.core==1.71.0",
        "aws-cdk.cx-api==1.71.0",
        "aws-cdk.region-info==1.71.0",
        "cattrs==1.1.1",
        "constructs==3.2.8",
        "jsii==1.14.0",
        "publication==0.0.3",
        "python-dateutil==2.8.1",
        "six==1.15.0",
        "typing-extensions==3.7.4.3",
    ],

    python_requires=">=3.6",

    classifiers=[
        "Development Status :: 4 - Beta",

        "Intended Audience :: Developers",

        "License :: OSI Approved :: Apache Software License",

        "Programming Language :: JavaScript",
        "Programming Language :: Python :: 3 :: Only",
        "Programming Language :: Python :: 3.6",
        "Programming Language :: Python :: 3.7",
        "Programming Language :: Python :: 3.8",

        "Topic :: Software Development :: Code Generators",
        "Topic :: Utilities",

        "Typing :: Typed",
    ],
)
