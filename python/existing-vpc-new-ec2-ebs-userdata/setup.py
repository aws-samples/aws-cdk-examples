import setuptools


with open("README.md") as fp:
    long_description = fp.read()


setuptools.setup(
    name="Import_VPC_Create_EC2",
    version="1.0.0",

    description="Import VPC and Create EC2 on it with two EBS and EC2 UserData",
    long_description=long_description,
    long_description_content_type="text/markdown",

    author="Huang, Zhuobin (James)",

    package_dir={"": "cdk_vpc_ec2"},
    packages=setuptools.find_packages(where="cdk_vpc_ec2"),

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
