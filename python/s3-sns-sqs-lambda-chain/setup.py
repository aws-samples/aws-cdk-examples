import setuptools


with open("README.md") as fp:
    long_description = fp.read()


setuptools.setup(
    name="s3_sns_sqs_lambda_chain",
    version="0.0.1",

    description="CDK Stack to demonstrate S3 to SNS to SQS to Lambda",
    long_description=long_description,
    long_description_content_type="text/markdown",

    author="author",

    package_dir={"": "s3_sns_sqs_lambda_chain"},
    packages=setuptools.find_packages(where="s3_sns_sqs_lambda_chain"),

    install_requires=[
        "aws-cdk.core==1.126.0",
        "aws-cdk.aws-sqs==1.126.0",
        "aws-cdk.aws-sns==1.126.0",
        "aws-cdk.aws-s3==1.126.0",
        "aws-cdk.aws-s3-notifications==1.126.0",
        "aws-cdk.aws-lambda==1.126.0",
        "aws-cdk.aws-lambda-event-sources==1.126.0",
        "aws-cdk.assertions==1.126.0",
        "pytest"
    ],

    python_requires=">=3.6",

    classifiers=[
        "Development Status :: 4 - Beta",

        "Intended Audience :: Developers",

        "Programming Language :: JavaScript",
        "Programming Language :: Python :: 3 :: Only",
        "Programming Language :: Python :: 3.6",
        "Programming Language :: Python :: 3.7",
        "Programming Language :: Python :: 3.8",
        "Programming Language :: Python :: 3.9",

        "Topic :: Software Development :: Code Generators",
        "Topic :: Utilities",

        "Typing :: Typed",
    ],
)
