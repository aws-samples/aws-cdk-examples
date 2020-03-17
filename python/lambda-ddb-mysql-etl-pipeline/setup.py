import setuptools


with open("README.md") as fp:
    long_description = fp.read()


setuptools.setup(
    name="etl_pipeline_cdk",
    version="0.0.1",

    description="A CDK Python App that defines a .csv & .json file processing pipeline",
    long_description=long_description,
    long_description_content_type="text/markdown",

    author="Benjamin E. Farr",

    package_dir={"": "etl_pipeline_cdk"},
    packages=setuptools.find_packages(where="etl_pipeline_cdk"),

    install_requires=[
        "aws-cdk.core",
        "aws-cdk.aws-s3",
        "aws-cdk.aws-s3-notifications",
        "aws-cdk.aws-lambda",
        "aws-cdk.aws-dynamodb",
        "aws-cdk.aws-events",
        "aws-cdk.aws-events-targets",
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
