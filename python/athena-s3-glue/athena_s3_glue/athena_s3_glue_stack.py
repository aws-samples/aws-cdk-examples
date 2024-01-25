from aws_cdk import (
    Stack,
    RemovalPolicy,
    aws_s3 as s3,
    aws_s3_deployment as s3_deployment,
    aws_glue as glue,
    aws_iam as iam,
    aws_athena as athena
)
from constructs import Construct


class AthenaS3GlueStack(Stack):

    def __init__(self, scope: Construct, construct_id: str, **kwargs) -> None:
        super().__init__(scope, construct_id, **kwargs)

        logs_bucket = s3.Bucket(self, 'logs-bucket',
                                bucket_name=f"auditing-logs-{self.account}",
                                removal_policy=RemovalPolicy.DESTROY,
                                auto_delete_objects=True
                                )

        query_output_bucket = s3.Bucket(self, 'query-output-bucket',
                                        bucket_name=f"auditing-analysis-output-{self.account}",
                                        removal_policy=RemovalPolicy.DESTROY,
                                        auto_delete_objects=True
                                        )

        s3_deployment.BucketDeployment(self, 'sample-files',
                                       destination_bucket=logs_bucket,
                                       sources=[s3_deployment.Source.asset('./log-samples')],
                                       content_type='application/json',
                                       retain_on_delete=False
                                       )

        glue_database = glue.CfnDatabase(self, 'log-database',
                                         catalog_id=self.account,
                                         database_input=glue.CfnDatabase.DatabaseInputProperty(
                                             name="log-database"
                                         ))

        glue_crawler_role = iam.Role(self, 'glue-crawler-role',
                                     role_name='glue-crawler-role',
                                     assumed_by=iam.ServicePrincipal(service='glue.amazonaws.com'),
                                     managed_policies=[
                                         # Remember to apply the Least Privilege Principle and provide only the permissions needed to the crawler
                                         iam.ManagedPolicy.from_managed_policy_arn(self, 'AmazonS3FullAccess',
                                                                                   'arn:aws:iam::aws:policy/AmazonS3FullAccess'),
                                         iam.ManagedPolicy.from_managed_policy_arn(self, 'AWSGlueServiceRole',
                                                                                   'arn:aws:iam::aws:policy/service-role/AWSGlueServiceRole')
                                     ])

        glue.CfnCrawler(self, 'logs-crawler',
                        name='logs-crawler',
                        database_name=glue_database.database_input.name,
                        role=glue_crawler_role.role_name,
                        targets={
                            "s3Targets": [
                                {"path": f's3://{logs_bucket.bucket_name}/products'},
                                {"path": f's3://{logs_bucket.bucket_name}/users'}
                            ]
                        })

        work_group = athena.CfnWorkGroup(self, 'log-auditing-work-group',
                                         name='log-auditing',
                                         work_group_configuration=athena.CfnWorkGroup.WorkGroupConfigurationProperty(
                                             result_configuration=athena.CfnWorkGroup.ResultConfigurationProperty(
                                                 output_location=f"s3://{query_output_bucket.bucket_name}",
                                                 encryption_configuration=athena.CfnWorkGroup.EncryptionConfigurationProperty(
                                                     encryption_option="SSE_S3"
                                                 ))))

        product_events_by_date_query = athena.CfnNamedQuery(self, 'product-events-by-date-query',
                                                            database=glue_database.database_input.name,
                                                            work_group=work_group.name,
                                                            name="product-events-by-date",
                                                            query_string="SELECT * FROM \"log-database\".\"products\" WHERE \"date\" = '2024-01-19'")

        user_events_by_date_query = athena.CfnNamedQuery(self, 'user-events-by-date-query',
                                                         database=glue_database.database_input.name,
                                                         work_group=work_group.name,
                                                         name="user-events-by-date",
                                                         query_string="SELECT * FROM \"log-database\".\"users\" WHERE \"date\" = '2024-01-22'")

        all_events_by_userid_query = athena.CfnNamedQuery(self, 'all-events-by-userId-query',
                                                          database=glue_database.database_input.name,
                                                          work_group=work_group.name,
                                                          name="all-events-by-userId",
                                                          query_string="SELECT * FROM (\n"
                                                                       "    SELECT transactionid, userid, username, domain, datetime, action FROM \"log-database\".\"products\" \n"
                                                                       "UNION \n"
                                                                       "    SELECT transactionid, userid, username, domain, datetime, action FROM \"log-database\".\"users\" \n"
                                                                       ") WHERE \"userid\" = '123'")

        product_events_by_date_query.add_dependency(work_group)
        user_events_by_date_query.add_dependency(work_group)
        all_events_by_userid_query.add_dependency(work_group)
