import aws_cdk as cdk
import pytest

from athena_s3_glue.athena_s3_glue_stack import AthenaS3GlueStack


@pytest.fixture
def template():
    """
      Generate a mock stack that embeds the orchestrator construct for testing
      """
    app = cdk.App()
    stack = AthenaS3GlueStack(app, "demo-athena-s3-glue")

    return cdk.assertions.Template.from_stack(stack)


def test_s3_buckets_created(template):
    template.resource_count_is(type="AWS::S3::Bucket", count=2)

    template.has_resource_properties(type="AWS::S3::Bucket",
                                     props={
                                         "BucketName": {
                                             "Fn::Join": [
                                                 "",
                                                 [
                                                     "auditing-logs-",
                                                     {"Ref": "AWS::AccountId"}
                                                 ]
                                             ]
                                         }
                                     })

    template.has_resource_properties(type="AWS::S3::Bucket",
                                     props={
                                         "BucketName": {
                                             "Fn::Join": [
                                                 "",
                                                 [
                                                     "auditing-analysis-output-",
                                                     {"Ref": "AWS::AccountId"}
                                                 ]
                                             ]
                                         }
                                     })


def test_glue_database_created(template):
    template.resource_count_is(type="AWS::Glue::Database", count=1)

    template.has_resource_properties(type="AWS::Glue::Database",
                                     props={
                                         "CatalogId": {
                                             "Ref": "AWS::AccountId"
                                         },
                                         "DatabaseInput": {
                                             "Name": "log-database"
                                         }
                                     })


def test_glue_crawler_created(template):
    template.resource_count_is(type="AWS::Glue::Crawler", count=1)

    template.has_resource_properties(type="AWS::IAM::Role",
                                     props={
                                         "RoleName": "glue-crawler-role",
                                         "AssumeRolePolicyDocument": {
                                             "Statement": [{
                                                 "Action": "sts:AssumeRole",
                                                 "Effect": "Allow",
                                                 "Principal": {
                                                     "Service": "glue.amazonaws.com"
                                                 }
                                             }]
                                         },
                                         "ManagedPolicyArns": [
                                             "arn:aws:iam::aws:policy/AmazonS3FullAccess",
                                             "arn:aws:iam::aws:policy/service-role/AWSGlueServiceRole",
                                         ]
                                     })

    template.has_resource_properties(type="AWS::Glue::Crawler",
                                     props={
                                         "DatabaseName": "log-database",
                                         "Name": "logs-crawler",
                                         "Targets": {
                                             "S3Targets": [
                                                 {
                                                     "Path": {
                                                         "Fn::Join": [
                                                             "",
                                                             [
                                                                 "s3://",
                                                                 {"Ref": "logsbucketE18563D9"},
                                                                 "/products"
                                                             ]
                                                         ]
                                                     }
                                                 },
                                                 {
                                                     "Path": {
                                                         "Fn::Join": [
                                                             "",
                                                             [
                                                                 "s3://",
                                                                 {"Ref": "logsbucketE18563D9"},
                                                                 "/users"
                                                             ]
                                                         ]
                                                     }
                                                 }
                                             ]
                                         }
                                     })


def test_athena_workgroup_created(template):
    template.resource_count_is(type="AWS::Athena::WorkGroup", count=1)

    template.has_resource_properties(type="AWS::Athena::WorkGroup",
                                     props={
                                         "Name": "log-auditing",
                                         "WorkGroupConfiguration": {
                                             "ResultConfiguration": {
                                                 "EncryptionConfiguration": {
                                                     "EncryptionOption": "SSE_S3"
                                                 },
                                                 "OutputLocation": {
                                                     "Fn::Join": [
                                                         "",
                                                         [
                                                             "s3://",
                                                             {"Ref": "queryoutputbucket3DDDB997"}
                                                         ]
                                                     ]
                                                 }
                                             }
                                         }
                                     })


def test_athena_queries_created(template):
    template.resource_count_is(type="AWS::Athena::NamedQuery", count=3)

    template.has_resource_properties(type="AWS::Athena::NamedQuery",
                                     props={
                                         "Database": "log-database",
                                         "Name": "product-events-by-date",
                                         "QueryString": "SELECT * FROM \"log-database\".\"products\" WHERE \"date\" = '2024-01-19'",
                                         "WorkGroup": "log-auditing"
                                     })

    template.has_resource_properties(type="AWS::Athena::NamedQuery",
                                     props={
                                         "Database": "log-database",
                                         "Name": "user-events-by-date",
                                         "QueryString": "SELECT * FROM \"log-database\".\"users\" WHERE \"date\" = '2024-01-22'",
                                         "WorkGroup": "log-auditing"
                                     })

    template.has_resource_properties(type="AWS::Athena::NamedQuery",
                                     props={
                                         "Database": "log-database",
                                         "Name": "all-events-by-userId",
                                         "QueryString": "SELECT * FROM (\n"
                                                        "    SELECT transactionid, userid, username, domain, datetime, action FROM \"log-database\".\"products\" \n"
                                                        "UNION \n"
                                                        "    SELECT transactionid, userid, username, domain, datetime, action FROM \"log-database\".\"users\" \n"
                                                        ") WHERE \"userid\" = '123'",
                                         "WorkGroup": "log-auditing"
                                     })
