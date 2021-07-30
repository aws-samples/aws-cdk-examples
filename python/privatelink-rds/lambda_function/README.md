# ELB Hostname as Target

This is a trimmed down version of the function published at https://github.com/aws-samples/hostname-as-target-for-elastic-load-balancer/. It removes the S3 and multi-IP portions as this use-case will only ever be one IP (the RDS endpoint) and uses the Lambda's local DNS resolver (which can be overriden as with the original function).

This function requires the PIP module "dns". If you are modifying the code and need to re-package it, ensure requirements.txt modules are installed locally with the function and packaged up as part of the zipfile for deployment.  See for more details: https://docs.aws.amazon.com/lambda/latest/dg/python-package-create.html