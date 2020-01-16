import setuptools


with open("README.md") as fp:
    long_description = fp.read()


setuptools.setup(
    name="native-objects",
    version="1.0.0",

    description="A python CDK example for passing resources between stacks",
    long_description=long_description,
    long_description_content_type="text/markdown",

    author="Richard Boyd",

    package_dir={"": "native_objects"},
    packages=setuptools.find_packages(where="native_objects"),

    install_requires=[
        "aws-cdk.core",
        "aws-cdk.aws_apigateway",
        "aws-cdk.aws_lambda"
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
