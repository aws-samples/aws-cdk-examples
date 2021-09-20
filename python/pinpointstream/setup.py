import setuptools


with open("README.md") as fp:
    long_description = fp.read()


setuptools.setup(
    name="pinpointstream",
    version="0.0.1",

    description="Pinpoint events streaming to Kinesis Stream + Lambda + DynamoDB",
    long_description=long_description,
    long_description_content_type="text/markdown",

    author="Arvin Febriyan Yeo",

    package_dir={"": "pinpointstream"},
    packages=setuptools.find_packages(where="pinpointstream"),

    install_requires=[
        "aws-cdk.core",
        "aws-cdk.aws_iam",
        "aws-cdk.aws_s3",
        "aws-cdk.aws-lambda",
        "aws-cdk.aws-dynamodb",
        "aws-cdk.aws-pinpoint",
        "aws-cdk.aws-kinesis",
        "aws-cdk.aws-lambda-event-sources"
    ],

    python_requires=">=3.6",

    classifiers=[
        "Development Status :: 4 - Beta",

        "Intended Audience :: Developers",

        "Programming Language :: Python :: 3 :: Only",

        "Topic :: Software Development :: Code Generators",
        "Topic :: Utilities",

        "Typing :: Typed",
    ],
)
