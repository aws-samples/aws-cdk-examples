import setuptools


with open("README.md") as fp:
    long_description = fp.read()


setuptools.setup(
    name="dynamodb_lambda",
    version="0.0.1",

    description="An empty CDK Python app",
    long_description=long_description,
    long_description_content_type="text/markdown",

    author="author",

    package_dir={"": "dynamodb_lambda"},
    packages=setuptools.find_packages(where="dynamodb_lambda"),

    install_requires=[
        "aws-cdk.core",
        "aws-cdk.aws_lambda",
        "aws-cdk.aws_dynamodb",
        "boto3",
        "botocore",
        "aws-cdk.aws_events",
        "aws-cdk.aws_lambda_event_sources",
        "aws-cdk.aws_events_targets"
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
