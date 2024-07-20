import aws_cdk as cdk
from aws_cdk import (
  Stack,
  aws_dynamodb as ddb,
  aws_iam as iam,
  aws_logs as aws_logs,
  aws_opensearchserverless as opss,
  aws_osis as osi,
  aws_s3 as s3
)
from constructs import Construct
import json
import random


class DdbToAossZeroEtlStack(Stack):

  def __init__(self, scope: Construct, construct_id: str, **kwargs) -> None:
    super().__init__(scope, construct_id, **kwargs)

    global network_security_policy, encryption_security_policy, data_access_policy
    global COLLECTION_NAME, PIPELINE_NAME, DYNAMO_TABLE_NAME, S3_EXPORT_BUCKET_FOR_DDB, NETWORK_POLICY_NAME

    random_id = random.randint(0, 100)
    STACK_NAMING_PREFIX = f'ddb-to-aoss-{random_id}'

    STACK_RESOURCE_NAMING_PREFIX = 'DdbAossZetl'

    COLLECTION_NAME = f'{STACK_NAMING_PREFIX}-col'
    PIPELINE_NAME = f'{STACK_NAMING_PREFIX}-pipe'
    DYNAMO_TABLE_NAME = f'{STACK_NAMING_PREFIX}-table'
    S3_EXPORT_BUCKET_FOR_DDB = f'{STACK_NAMING_PREFIX}-buck'
    NETWORK_POLICY_NAME = f'{COLLECTION_NAME}-net-pol'
    ENCRYPTION_POLICY_NAME = f'{COLLECTION_NAME}-encr-pol'
    DATA_ACCESS_POLICY_NAME = f"{COLLECTION_NAME}-data-pol"

    USER_ARN = self.node.try_get_context('iam_user_arn')
    if not USER_ARN:
      print(
        'Specify the IAM role or user that will be used to access OpenSearch Dashboards by adding '
        '"-c iam_user_arn=\'<my-iam-arn>\'" to your cdk commands')

    ################################################################################
    # Create OpenSearch Serverless network access policy

    network_security_policy = json.dumps([{
      "Rules": [
        {
          "Resource": [f"collection/{COLLECTION_NAME}"],
          "ResourceType": "dashboard"
        }
      ],
      "AllowFromPublic": True
    }], indent=2)

    cfn_network_security_policy = opss.CfnSecurityPolicy(self, f'{STACK_RESOURCE_NAMING_PREFIX}NetPolicy',
                                                         policy=network_security_policy,
                                                         name=NETWORK_POLICY_NAME,
                                                         type="network"
                                                         )

    ################################################################################
    # Create OpenSearch Serverless encryption policy

    encryption_security_policy = json.dumps({
      "Rules": [{
        "Resource": [f"collection/{COLLECTION_NAME}"],
        "ResourceType": "collection"
      }],
      "AWSOwnedKey": True
    }, indent=2)

    cfn_encryption_security_policy = opss.CfnSecurityPolicy(self, f'{STACK_RESOURCE_NAMING_PREFIX}EncPolicy',
                                                            policy=encryption_security_policy,
                                                            name=ENCRYPTION_POLICY_NAME,
                                                            type="encryption"
                                                            )

    ################################################################################
    # Create OpenSearch Serverless collection

    cfn_collection = opss.CfnCollection(self, f'{STACK_RESOURCE_NAMING_PREFIX}Collection',
                                        name=COLLECTION_NAME,
                                        description="Collection to be used for search from CDK",
                                        type="SEARCH"
                                        )
    cfn_collection.add_dependency(cfn_network_security_policy)
    cfn_collection.add_dependency(cfn_encryption_security_policy)

    ################################################################################
    # Create IAM role for OpenSearch Ingestion pipeline

    pipeline_role = iam.Role(self, f'{STACK_RESOURCE_NAMING_PREFIX}PipelineRole',
                             role_name=f'{STACK_RESOURCE_NAMING_PREFIX}PipelineRole',
                             assumed_by=iam.ServicePrincipal('osis-pipelines.amazonaws.com'),
                             inline_policies={
                               'collection-pipeline-policy': self.collection_pipeline_policy_doc(
                                 cfn_collection.attr_arn)
                             }
                             )

    ################################################################################
    # Create S3 Bucket for export

    s3_bucket = s3.Bucket(self, f'{STACK_RESOURCE_NAMING_PREFIX}Bucket',
                          block_public_access=s3.BlockPublicAccess.BLOCK_ALL,
                          bucket_name=S3_EXPORT_BUCKET_FOR_DDB,
                          encryption=s3.BucketEncryption.S3_MANAGED,
                          enforce_ssl=True,
                          versioned=True,
                          removal_policy=cdk.RemovalPolicy.DESTROY
                          )

    s3_bucket_policy_statement = iam.PolicyStatement(
      effect=iam.Effect.ALLOW,
      resources=[f'arn:aws:s3:::{S3_EXPORT_BUCKET_FOR_DDB}/*'],
      actions=[
        "s3:GetObject",
        "s3:AbortMultipartUpload",
        "s3:PutObject",
        "s3:PutObjectAcl"
      ],
      principals=[iam.ArnPrincipal(pipeline_role.role_arn)]
    )

    # Add the policy to the bucket
    s3_bucket.add_to_resource_policy(s3_bucket_policy_statement)

    ################################################################################
    # Create DynamoDB Table

    dynamo_db_table = ddb.TableV2(self, f'{STACK_RESOURCE_NAMING_PREFIX}Table',
                                  partition_key=ddb.Attribute(name="id", type=ddb.AttributeType.STRING),
                                  sort_key=ddb.Attribute(name="timestamp", type=ddb.AttributeType.NUMBER),
                                  table_name=DYNAMO_TABLE_NAME,
                                  billing=ddb.Billing.on_demand(),
                                  point_in_time_recovery=True,
                                  dynamo_stream=ddb.StreamViewType.NEW_IMAGE,
                                  removal_policy=cdk.RemovalPolicy.DESTROY
                                  )

    ################################################################################
    # Create OpenSearch Ingestion pipeline

    log_group_name = f"/aws/vendedlogs/OpenSearchIngestion/{PIPELINE_NAME}/audit-logs"
    osis_pipeline_log_group = aws_logs.LogGroup(self, f'{STACK_RESOURCE_NAMING_PREFIX}LogGroup',
                                                log_group_name=log_group_name,
                                                retention=aws_logs.RetentionDays.THREE_DAYS,
                                                removal_policy=cdk.RemovalPolicy.DESTROY
                                                )

    pipeline_configuration_body = self.get_pipeline_configuration(table_arn=dynamo_db_table.table_arn,
                                                             role_arn=pipeline_role.role_arn,
                                                             collection_endpoint=cfn_collection.attr_collection_endpoint)

    cfn_pipeline = osi.CfnPipeline(self, f'{STACK_RESOURCE_NAMING_PREFIX}Pipeline',
                                   max_units=4,
                                   min_units=1,
                                   pipeline_configuration_body=pipeline_configuration_body,
                                   pipeline_name=PIPELINE_NAME,
                                   log_publishing_options=osi.CfnPipeline.LogPublishingOptionsProperty(
                                     cloud_watch_log_destination=osi.CfnPipeline.CloudWatchLogDestinationProperty(
                                       log_group=log_group_name,
                                     ),
                                     is_logging_enabled=True
                                   )
                                   )
    cfn_pipeline.add_dependency(cfn_collection)

    ################################################################################
    # Create OpenSearch Serverless data access policy

    data_access_policy_principals = [pipeline_role.role_arn]
    if USER_ARN:
      data_access_policy_principals.append(USER_ARN)

    data_access_policy = json.dumps([{
      "Rules": [
        {
          "Resource": [f"collection/{COLLECTION_NAME}"],
          "Permission": [
            "aoss:CreateCollectionItems",
            "aoss:DeleteCollectionItems",
            "aoss:UpdateCollectionItems",
            "aoss:DescribeCollectionItems"
          ],
          "ResourceType": "collection"
        },
        {
          "Resource": [f"index/{COLLECTION_NAME}/*"],
          "Permission": [
            "aoss:CreateIndex",
            "aoss:DeleteIndex",
            "aoss:UpdateIndex",
            "aoss:DescribeIndex",
            "aoss:ReadDocument",
            "aoss:WriteDocument"
          ],
          "ResourceType": "index"
        }
      ],
      "Principal": data_access_policy_principals,
      "Description": "data-access-rule"
    }], indent=2)

    cfn_access_policy = opss.CfnAccessPolicy(self, f'{STACK_RESOURCE_NAMING_PREFIX}DataPolicy',
                                             name=DATA_ACCESS_POLICY_NAME,
                                             description="Policy for data access",
                                             policy=data_access_policy,
                                             type="data"
                                             )
    cfn_access_policy.add_dependency(cfn_collection)
    cfn_access_policy.add_dependency(cfn_pipeline)

  def collection_pipeline_policy_doc(self, collection_arn):
    collection_pipeline_policy_doc = iam.PolicyDocument()
    collection_pipeline_policy_doc.add_statements(iam.PolicyStatement(**{
      "effect": iam.Effect.ALLOW,
      "resources": ["*"],
      "actions": [
        "aoss:BatchGetCollection"
      ]
    }))
    collection_pipeline_policy_doc.add_statements(iam.PolicyStatement(**{
      "effect": iam.Effect.ALLOW,
      "resources": [collection_arn],
      "actions": [
        "aoss:APIAccessAll"
      ]
    }))
    collection_pipeline_policy_doc.add_statements(iam.PolicyStatement(**{
      "effect": iam.Effect.ALLOW,
      "resources": ["*"],
      "actions": [
        "aoss:CreateSecurityPolicy",
        "aoss:GetSecurityPolicy",
        "aoss:UpdateSecurityPolicy"
      ],
      "conditions": {
        "StringEquals": {
          "aoss:collection": COLLECTION_NAME
        }
      }
    }))
    collection_pipeline_policy_doc.add_statements(iam.PolicyStatement(**{
      "effect": iam.Effect.ALLOW,
      "resources": [f'arn:aws:dynamodb:{cdk.Aws.REGION}:{cdk.Aws.ACCOUNT_ID}:table/{DYNAMO_TABLE_NAME}/export/*'],
      "actions": [
        "dynamodb:DescribeExport",
      ]
    }))
    collection_pipeline_policy_doc.add_statements(iam.PolicyStatement(**{
      "effect": iam.Effect.ALLOW,
      "resources": [f'arn:aws:dynamodb:{cdk.Aws.REGION}:{cdk.Aws.ACCOUNT_ID}:table/{DYNAMO_TABLE_NAME}/stream/*'],
      "actions": [
        "dynamodb:DescribeStream",
        "dynamodb:GetRecords",
        "dynamodb:GetShardIterator"
      ]
    }))
    collection_pipeline_policy_doc.add_statements(iam.PolicyStatement(**{
      "effect": iam.Effect.ALLOW,
      "resources": [f'arn:aws:dynamodb:{cdk.Aws.REGION}:{cdk.Aws.ACCOUNT_ID}:table/{DYNAMO_TABLE_NAME}'],
      "actions": [
        "dynamodb:DescribeTable",
        "dynamodb:DescribeContinuousBackups",
        "dynamodb:ExportTableToPointInTime"
      ]
    }))
    collection_pipeline_policy_doc.add_statements(iam.PolicyStatement(**{
      "effect": iam.Effect.ALLOW,
      "resources": [f'arn:aws:s3:::{S3_EXPORT_BUCKET_FOR_DDB}/{DYNAMO_TABLE_NAME}/*'],
      "actions": [
        "s3:GetObject",
        "s3:AbortMultipartUpload",
        "s3:PutObject",
        "s3:PutObjectAcl"
      ]
    }))
    return collection_pipeline_policy_doc

  def get_pipeline_configuration(self, table_arn, role_arn, collection_endpoint):

    replacements = [
      lambda x: x.replace("%%%DYNAMODB_TABLE_ARN%%%", table_arn),
      lambda x: x.replace("%%%S3_BUCKET_NAME%%%", S3_EXPORT_BUCKET_FOR_DDB),
      lambda x: x.replace("%%%REGION%%%", cdk.Aws.REGION),
      lambda x: x.replace("%%%DYNAMODB_TABLE_NAME%%%", table_arn),
      lambda x: x.replace("%%%ROLE_ARN%%%", role_arn),
      lambda x: x.replace("%%%COLLECTION_ENDPOINT%%%", collection_endpoint),
      lambda x: x.replace("%%%NETWORK_POLICY_NAME%%%", NETWORK_POLICY_NAME)
    ]

    with open("resources/pipeline_configuration.yaml", 'r') as pipeline_configuration_file:
      pipeline_configuration_format = pipeline_configuration_file.read()
      formatted_pipeline_configuration = pipeline_configuration_format

      for replace in replacements:
        formatted_pipeline_configuration = replace(formatted_pipeline_configuration)

      return formatted_pipeline_configuration
