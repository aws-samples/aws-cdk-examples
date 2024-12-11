import * as cdk from "aws-cdk-lib";
import {Construct} from "constructs";
import {IBucket} from "aws-cdk-lib/aws-s3";
import {CfnDatabase, CfnJob, CfnTable} from "aws-cdk-lib/aws-glue";
import {ManagedPolicy, Role, ServicePrincipal} from "aws-cdk-lib/aws-iam";
import {BucketDeployment, Source} from "aws-cdk-lib/aws-s3-deployment";

interface EtlStackProps {

  readonly projectBucket: IBucket;
  readonly rawDataDatabase: CfnDatabase;
  readonly aggregatedDataDatabase: CfnDatabase;
  readonly rawDataTable: CfnTable;
  readonly hitsByDomainAndGroupIdTable: CfnTable;
  readonly hitsByUserAgentTable: CfnTable;
  readonly hitsByCountryTable: CfnTable;

}

export class EtlStack extends cdk.Stack {

  public readonly etlJob: CfnJob;

  constructor(scope: Construct, id: string, props: EtlStackProps) {
    super(scope, id);

    // Notebook deployment
    new BucketDeployment(this, 'NotebookDeployment', {
      destinationBucket: props.projectBucket,
      destinationKeyPrefix: 'notebooks',
      sources: [Source.asset('./job/notebooks')],
      retainOnDelete: false,
    });


    // ETL Job configuration
    const etlJobRole = new Role(this, 'EtlJobRole', {
      roleName: 'EtlJobRole',
      assumedBy: new ServicePrincipal('glue.amazonaws.com'),
    });

    etlJobRole.addManagedPolicy(ManagedPolicy.fromManagedPolicyArn(this, 'AWSGlueServiceRole', 'arn:aws:iam::aws:policy/service-role/AWSGlueServiceRole'))
    etlJobRole.addManagedPolicy(ManagedPolicy.fromManagedPolicyArn(this, 'AWSGlueServiceNotebookRole', 'arn:aws:iam::aws:policy/service-role/AWSGlueServiceNotebookRole'))
    props.projectBucket.grantReadWrite(etlJobRole);

    this.etlJob = new CfnJob(this, 'AggregatorsJob', {
      name: 'demo-glue-scheduled-aggregators',
      role: etlJobRole.roleArn,
      command: {
        name: 'glueetl',
        scriptLocation: props.projectBucket.s3UrlForObject('/notebooks/glue_scheduled_aggregators.py'),
        pythonVersion: '3'
      },
      executionProperty: {
        maxConcurrentRuns: 2
      },
      defaultArguments: {
        "--mode": "NOTEBOOK",
        "--enable-metrics": "true",
        "--enable-spark-ui": "true",
        "--spark-event-logs-path": props.projectBucket.s3UrlForObject('/jobs/sparkHistoryLogs/'),
        "--enable-job-insights": "false",
        "--enable-observability-metrics": "true",
        "--enable-glue-datacatalog": "true",
        "--enable-continuous-cloudwatch-log": "true",
        "--job-bookmark-option": "job-bookmark-disable",
        "--job-language": "python",
        "--TempDir": props.projectBucket.s3UrlForObject('/jobs/temp'),
        "--enable-auto-scaling": "true",

        '--raw_database_name': props.rawDataDatabase.ref,
        '--aggregated_database_name': props.aggregatedDataDatabase.ref,

        '--raw_data_table_name': props.rawDataTable.ref,
        '--hits_by_domain_and_group_id_table_name': props.hitsByDomainAndGroupIdTable.ref,
        '--hits_by_domain_and_group_id_table_location': `s3://${props.projectBucket.bucketName}/aggregated_data/hits_by_domain_and_groupid/`,
        '--hits_by_user_agent_table_name': props.hitsByUserAgentTable.ref,
        '--hits_by_user_agent_table_location': `s3://${props.projectBucket.bucketName}/aggregated_data/hits_by_useragent/`,
        '--hits_by_country_table_name': props.hitsByCountryTable.ref,
        '--hits_by_country_table_location': `s3://${props.projectBucket.bucketName}/aggregated_data/hits_by_country/`,
      },
      maxRetries: 0,
      workerType: 'G.1X',
      numberOfWorkers: 3,
      glueVersion: '4.0',
      timeout: 60,
      executionClass: 'STANDARD'
    });


    // Outputs
    new cdk.CfnOutput(this, 'EtlJobName', {value: this.etlJob.ref});
  }

}
