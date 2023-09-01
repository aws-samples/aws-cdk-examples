import setuptools


with open("README.md") as fp:
    long_description = fp.read()


setuptools.setup(
    name="api_stages_lambda",
    version="0.0.1",

    description="A CDK Python app to create an API Gateway with multiple stages that map to AWS Lambda functions with corresponding stage aliases.",
    long_description=long_description,
    long_description_content_type="text/markdown",

    author="Kim Wendt",

    package_dir={"": "api_stages_lambda"},
    packages=setuptools.find_packages(where="api_stages_lambda"),

    python_requires=">=3.7",

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
