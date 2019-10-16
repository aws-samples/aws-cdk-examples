#!/usr/bin/env bash


export account_id=$(aws sts get-caller-identity | jq -r .Account)
export source_bucket=$(aws ssm get-parameter --name 'cdk-example-pipeline-bucket' | jq -r .Parameter.Value)
export pipeline_name=$(aws ssm get-parameter --name 'cdk-example-pipeline-pipeline' | jq -r .Parameter.Value)
export REGION='us-east-1'

zip -r source.zip .
aws s3 cp source.zip s3://${source_bucket}/source.zip
#aws codepipeline start-pipeline-execution --name ${pipeline_name}
