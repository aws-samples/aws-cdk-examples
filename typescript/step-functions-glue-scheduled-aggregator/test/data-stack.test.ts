import * as cdk from 'aws-cdk-lib';
import {Template} from 'aws-cdk-lib/assertions';
import {DataStack} from '../lib/data-stack';

describe('DataStack', () => {
  let app: cdk.App;
  let stack: DataStack;
  let template: Template;

  beforeEach(() => {
    app = new cdk.App();
    stack = new DataStack(app, 'TestDataStack');
    template = Template.fromStack(stack);
  });

  test('creates S3 bucket with correct configuration', () => {
    template.hasResourceProperties('AWS::S3::Bucket', {
      BucketEncryption: {
        ServerSideEncryptionConfiguration: [
          {
            ServerSideEncryptionByDefault: {
              SSEAlgorithm: 'AES256'
            }
          }
        ]
      },
      BucketName: {
        "Fn::Join": [
          "",
          [
            "demo-glue-scheduled-aggregators-",
            {
              "Ref": "AWS::AccountId"
            }
          ]
        ]
      },
      VersioningConfiguration: {
        Status: 'Enabled'
      },
      PublicAccessBlockConfiguration: {
        BlockPublicAcls: true,
        BlockPublicPolicy: true,
        IgnorePublicAcls: true,
        RestrictPublicBuckets: true
      }
    });
  });

  test('creates raw data database and table', () => {
    // Test database creation
    template.hasResourceProperties('AWS::Glue::Database', {
      DatabaseInput: {
        Name: 'demo-raw-data'
      }
    });

    // Test raw data table creation
    template.hasResourceProperties('AWS::Glue::Table', {
      DatabaseName: 'demo-raw-data',
      TableInput: {
        Name: 'raw_data',
        StorageDescriptor: {
          Columns: [
            {Name: 'groupid', Type: 'int'},
            {Name: 'countrycode', Type: 'string'},
            {Name: 'useragent', Type: 'string'},
            {Name: 'language', Type: 'string'},
            {Name: 'domain', Type: 'string'},
            {Name: 'timestamp', Type: 'string'}
          ],
          InputFormat: 'org.apache.hadoop.mapred.TextInputFormat',
          OutputFormat: 'org.apache.hadoop.hive.ql.io.HiveIgnoreKeyTextOutputFormat',
          SerdeInfo: {
            SerializationLibrary: 'org.openx.data.jsonserde.JsonSerDe'
          }
        },
        PartitionKeys: [
          {Name: 'year', Type: 'string'},
          {Name: 'month', Type: 'string'},
          {Name: 'day', Type: 'string'},
          {Name: 'hour', Type: 'string'},
          {Name: 'minute', Type: 'string'}
        ]
      }
    });
  });

  test('creates aggregated data database and tables', () => {
    // Test database creation
    template.hasResourceProperties('AWS::Glue::Database', {
      DatabaseInput: {
        Name: 'demo-aggregated-data'
      }
    });

    // Test hits by domain and groupid table
    template.hasResourceProperties('AWS::Glue::Table', {
      DatabaseName: 'demo-aggregated-data',
      TableInput: {
        Name: 'hits_by_domain_and_groupid',
        PartitionKeys: [
          {
            Name: "year",
            Type: "string"
          },
          {
            Name: "month",
            Type: "string"
          },
          {
            Name: "day",
            Type: "string"
          },
          {
            Name: "hour",
            Type: "string"
          }
        ],
        StorageDescriptor: {
          InputFormat: "org.apache.hadoop.mapred.TextInputFormat",
          OutputFormat: "org.apache.hadoop.hive.ql.io.HiveIgnoreKeyTextOutputFormat",
          SerdeInfo: {
            SerializationLibrary: "org.openx.data.jsonserde.JsonSerDe"
          },
          Columns: [
            {Name: 'groupid', Type: 'int'},
            {Name: 'domain', Type: 'string'},
            {Name: 'hitcount', Type: 'bigint'}
          ]
        }
      }
    });

    // Test hits by user agent table
    template.hasResourceProperties('AWS::Glue::Table', {
      DatabaseName: 'demo-aggregated-data',
      TableInput: {
        Name: 'hits_by_useragent',
        PartitionKeys: [
          {
            Name: "year",
            Type: "string"
          },
          {
            Name: "month",
            Type: "string"
          },
          {
            Name: "day",
            Type: "string"
          },
          {
            Name: "hour",
            Type: "string"
          }
        ],
        StorageDescriptor: {
          InputFormat: "org.apache.hadoop.hive.ql.io.parquet.MapredParquetInputFormat",
          OutputFormat: "org.apache.hadoop.hive.ql.io.parquet.MapredParquetOutputFormat",
          SerdeInfo: {
            Parameters: {
              "serialization.format": "1"
            },
            SerializationLibrary: "org.apache.hadoop.hive.ql.io.parquet.serde.ParquetHiveSerDe"
          },
          Columns: [
            {Name: 'useragent', Type: 'string'},
            {Name: 'hitcount', Type: 'bigint'}
          ]
        }
      }
    });

    // Test hits by country table
    template.hasResourceProperties('AWS::Glue::Table', {
      DatabaseName: 'demo-aggregated-data',
      TableInput: {
        Name: 'hits_by_country',
        PartitionKeys: [
          {
            Name: "year",
            Type: "string"
          },
          {
            Name: "month",
            Type: "string"
          },
          {
            Name: "day",
            Type: "string"
          },
          {
            Name: "hour",
            Type: "string"
          }
        ],
        StorageDescriptor: {
          InputFormat: "org.apache.hadoop.hive.ql.io.parquet.MapredParquetInputFormat",
          OutputFormat: "org.apache.hadoop.hive.ql.io.parquet.MapredParquetOutputFormat",
          SerdeInfo: {
            Parameters: {
              "serialization.format": "1"
            },
            SerializationLibrary: "org.apache.hadoop.hive.ql.io.parquet.serde.ParquetHiveSerDe"
          },
          Columns: [
            {Name: 'countrycode', Type: 'string'},
            {Name: 'hitcount', Type: 'bigint'}
          ]
        }
      }
    });
  });

  test('creates correct number of resources', () => {
    // Verify the total number of resources
    template.resourceCountIs('AWS::S3::Bucket', 1);
    template.resourceCountIs('AWS::Glue::Database', 2);
    template.resourceCountIs('AWS::Glue::Table', 4);
  });
});
