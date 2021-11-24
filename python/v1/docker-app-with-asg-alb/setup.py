import setuptools


with open("README.md") as fp:
    long_description = fp.read()


setuptools.setup(
    name="dockerized_app_cdk",
    version="1.0.0",

    description="An AWS CDK app to launch a dockerized app into 3-tier architecture.",
    long_description=long_description,
    long_description_content_type="text/markdown",

    author="Evan Ng",

    package_dir={"": "dockerized_app_cdk"},
    packages=setuptools.find_packages(where="dockerized_app_cdk"),

    install_requires=[
        "aws-cdk.core",
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
