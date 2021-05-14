import setuptools


with open("README.md") as fp:
    long_description = fp.read()

setuptools.setup(
    name="ssm-auto-patching",
    version="0.0.1",

    description="A simple Systems Manager - Auto Patching created with AWS CDK for Python",
    long_description=long_description,
    long_description_content_type="text/markdown",

    author="author",

    package_dir={"": "auto_patching"},
    packages=setuptools.find_packages(where="auto_patching"),

    install_requires=[
        f"aws-cdk.core",
        f"aws-cdk.aws-ssm",
        f"aws-cdk.aws-ec2",
        f"aws-cdk.aws-iam",
        f"aws-cdk.custom-resources",
        f"aws-cdk.aws-s3"
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
