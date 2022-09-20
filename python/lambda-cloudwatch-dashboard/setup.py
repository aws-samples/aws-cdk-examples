import setuptools


with open("README.md") as fp:
    long_description = fp.read()


setuptools.setup(
    name="lambda_cloudwatch_dashboard",
    version="0.0.1",

    description="CloudWatch Dashboard Sample",
    long_description=long_description,
    long_description_content_type="text/markdown",

    author="author",

    package_dir={"": "lambda_cloudwatch_dashboard"},
    packages=setuptools.find_packages(where="lambda_cloudwatch_dashboard"),

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
