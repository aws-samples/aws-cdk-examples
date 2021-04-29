import setuptools


with open("README.md") as fp:
    long_description = fp.read()


setuptools.setup(
    name="empty_s3_bucket",
    version="0.0.1",

    description="A simple empty_s3_bucket created with AWS CDK for Python",
    long_description=long_description,
    long_description_content_type="text/markdown",

    author="elgamala@amazon.de",

    package_dir={"": "empty_s3_bucket"},
    packages=setuptools.find_packages(where="empty_s3_bucket"),

    install_requires=[
        "aws-cdk.core",
        "aws-cdk.aws-stepfunctions",
        "aws-cdk.aws-stepfunctions-tasks",
        "aws-cdk.aws-s3",
        "aws-cdk.aws-lambda-python",
        "aws-cdk.custom-resources"
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
