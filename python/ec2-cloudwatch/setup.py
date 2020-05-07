import setuptools


with open("README.md") as fp:
    long_description = fp.read()


setuptools.setup(
    name="ec2_cloudwatch",
    version="0.0.1",

    description="An example CDK Python app. The code shows how to create VPC, s3_endpoint, bastion host, EC2, EBS, Cloudwatch event rule stop EC2, Backup for EC2",
    long_description=long_description,
    long_description_content_type="text/markdown",

    author="Zhang Xinyuan",

    package_dir={"": "ec2_cloudwatch"},
    packages=setuptools.find_packages(where="ec2_cloudwatch"),

    install_requires=[
        "aws-cdk.core==1.36.1",
        "aws-cdk.aws-ec2==1.36.1",
        "autopep8",
        "aws-cdk.aws-backup==1.36.1",
        "aws-cdk.aws-cloudwatch==1.36.1",
        "aws-cdk.aws-events==1.36.1",
        "aws-cdk.aws-events-targets==1.36.1",
        "aws-cdk.aws-lambda==1.36.1",
        "aws-cdk.aws-logs==1.36.1",
        "aws-cdk.aws-iam==1.36.1"
    ],

    python_requires=">=3.6",

    classifiers=[
        "Development Status :: 4 - Beta",

        "Intended Audience :: Developers",

        "License :: OSI Approved :: Apache Software License",

        "Programming Language :: Python",
        "Programming Language :: Python :: 3 :: Only",
        "Programming Language :: Python :: 3.6",
        "Programming Language :: Python :: 3.7",
        "Programming Language :: Python :: 3.8",

        "Topic :: Software Development :: Code Generators",
        "Topic :: Utilities",

        "Typing :: Typed",
    ],
)
