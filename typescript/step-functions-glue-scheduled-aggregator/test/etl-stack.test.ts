import * as cdk from 'aws-cdk-lib';
import {Match, Template} from 'aws-cdk-lib/assertions';
import {EtlStack} from '../lib/etl-stack';
import * as s3 from 'aws-cdk-lib/aws-s3';
import {CfnDatabase, CfnTable} from 'aws-cdk-lib/aws-glue';

describe('EtlStack', () => {
  let app: cdk.App;
  let stack: EtlStack;
  let template: Template;

  beforeEach(() => {
    app = new cdk.App();
    const testStack = new cdk.Stack(app, 'TestStack');

    // Create mock resources needed for the ETL stack
    const projectBucket = new s3.Bucket(testStack, 'XXXXXXXXXX');
    const rawDataDatabase = new CfnDatabase(testStack, 'RawDatabase', {
      catalogId: 'test-catalog',
      databaseInput: {
        name: 'raw-database'
      }
    });
    const aggregatedDataDatabase = new CfnDatabase(testStack, 'AggregatedDatabase', {
      catalogId: 'test-catalog',
      databaseInput: {
        name: 'aggregated-database'
      }
    });

    // Create mock tables
    const rawDataTable = new CfnTable(testStack, 'RawTable', {
      databaseName: rawDataDatabase.ref,
      catalogId: 'test-catalog',
      tableInput: {
        name: 'raw_data'
      }
    });

    const hitsByDomainAndGroupIdTable = new CfnTable(testStack, 'DomainGroupTable', {
      databaseName: aggregatedDataDatabase.ref,
      catalogId: 'test-catalog',
      tableInput: {
        name: 'hits_by_domain_and_groupid'
      }
    });

    const hitsByUserAgentTable = new CfnTable(testStack, 'UserAgentTable', {
      databaseName: aggregatedDataDatabase.ref,
      catalogId: 'test-catalog',
      tableInput: {
        name: 'hits_by_useragent'
      }
    });

    const hitsByCountryTable = new CfnTable(testStack, 'CountryTable', {
      databaseName: aggregatedDataDatabase.ref,
      catalogId: 'test-catalog',
      tableInput: {
        name: 'hits_by_country'
      }
    });

    // Create the ETL stack with the mock resources
    stack = new EtlStack(app, 'TestEtlStack', {
      projectBucket,
      rawDataDatabase,
      aggregatedDataDatabase,
      rawDataTable,
      hitsByDomainAndGroupIdTable,
      hitsByUserAgentTable,
      hitsByCountryTable
    });

    template = Template.fromStack(stack);
  });

  test('creates IAM role with correct policies', () => {
    template.hasResourceProperties('AWS::IAM::Role', {
      RoleName: 'EtlJobRole',
      AssumeRolePolicyDocument: {
        Statement: [
          {
            Action: 'sts:AssumeRole',
            Effect: 'Allow',
            Principal: {
              Service: 'glue.amazonaws.com'
            }
          }
        ]
      },
      ManagedPolicyArns: Match.arrayWith([
        'arn:aws:iam::aws:policy/service-role/AWSGlueServiceRole',
        'arn:aws:iam::aws:policy/service-role/AWSGlueServiceNotebookRole'
      ])
    });

    template.hasResourceProperties('AWS::IAM::Policy', {
      PolicyName: Match.stringLikeRegexp('EtlJobRoleDefaultPolicy'),
      Roles: [
        {
          Ref: Match.stringLikeRegexp('EtlJobRole')
        }
      ]
    })
  });

  test('creates Glue job with correct configuration', () => {
    template.hasResourceProperties('AWS::Glue::Job', {
      Name: 'demo-glue-scheduled-aggregators',
      Command: {
        Name: 'glueetl',
        PythonVersion: '3',
        ScriptLocation: {
          "Fn::Join": Match.arrayWith([
            "",
            Match.arrayWith([
              "s3://",
              "/notebooks/glue_scheduled_aggregators.py"
            ])
          ])
        }
      },
      ExecutionClass: "STANDARD",
      ExecutionProperty: {
        MaxConcurrentRuns: 2
      },
      GlueVersion: '4.0',
      NumberOfWorkers: 3,
      WorkerType: 'G.1X',
      Timeout: 60,
      DefaultArguments: Match.objectLike({
        '--mode': 'NOTEBOOK',
        '--enable-metrics': 'true',
        '--enable-spark-ui': 'true',
        '--enable-observability-metrics': 'true',
        '--enable-glue-datacatalog': 'true',
        '--enable-continuous-cloudwatch-log': 'true',
        '--job-bookmark-option': 'job-bookmark-disable',
        '--job-language': 'python',
        '--enable-auto-scaling': 'true',
        '--raw_database_name': Match.anyValue(),
        '--aggregated_database_name': Match.anyValue(),
        '--raw_data_table_name': Match.anyValue(),
        '--hits_by_domain_and_group_id_table_name': Match.anyValue(),
        '--hits_by_domain_and_group_id_table_location': Match.anyValue(),
        '--hits_by_user_agent_table_name': Match.anyValue(),
        '--hits_by_user_agent_table_location': Match.anyValue(),
        '--hits_by_country_table_name': Match.anyValue(),
        '--hits_by_country_table_location': Match.anyValue()
      })
    });
  });

  test('creates S3 deployment for notebooks', () => {
    template.hasResourceProperties('Custom::CDKBucketDeployment', {
      DestinationBucketKeyPrefix: 'notebooks'
    });
  });

  test('creates output for ETL job name', () => {
    template.hasOutput('EtlJobName', {});
  });

});
