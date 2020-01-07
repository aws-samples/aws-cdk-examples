import setuptools


with open("README.md") as fp:
    long_description = fp.read()


setuptools.setup(
    name="colorteller-appmesh",
    version="0.0.1",

    description="Example of CDK and AppMesh, based off https://github.com/aws/aws-app-mesh-examples",
    long_description=long_description,
    long_description_content_type="text/markdown",

    author="author",

    package_dir={"": "./"},
    packages=setuptools.find_packages(where="colorteller_*"),

    install_requires=[
        "aws-cdk.core",
        "aws-cdk.aws_ec2",
        "aws-cdk.aws_appmesh",
        "aws-cdk.aws_ecs",
        "aws-cdk.aws_elasticloadbalancingv2",
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
