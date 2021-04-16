# create private bucket

    aws s3api create-bucket --acl private --bucket john-mitchell-lambda-code-bucket --create-bucket-configuration LocationConstraint=us-west-2

    
# enabling X-Ray tracing

	aws lambda update-function-configuration --function-name my-function \
--tracing-config Mode=Active

