import * as cdk from "aws-cdk-lib";
import {RemovalPolicy} from "aws-cdk-lib";
import {Construct} from "constructs";
import {BlockPublicAccess, Bucket, BucketEncryption, IBucket} from "aws-cdk-lib/aws-s3";
import {BucketDeployment, Source} from "aws-cdk-lib/aws-s3-deployment";
import {CfnDatabase, CfnTable} from "aws-cdk-lib/aws-glue";

export class DataStack extends cdk.Stack {

  private readonly RAW_DATA_DATABASE_NAME = 'demo-raw-data';
  private readonly AGGREGATED_DATA_DATABASE_NAME = 'demo-aggregated-data';

  public readonly projectBucket: IBucket;

  public readonly rawDataDatabase: CfnDatabase;
  public readonly aggregatedDataDatabase: CfnDatabase;

  public readonly rawDataTable: CfnTable;
  public readonly hitsByDomainAndGroupIdTable: CfnTable;
  public readonly hitsByUserAgentTable: CfnTable;
  public readonly hitsByCountryTable: CfnTable;

  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Data bucket and raw data deployment
    this.projectBucket = new Bucket(this, 'DemoBucket', {
      bucketName: `demo-glue-scheduled-aggregators-${this.account}`,
      encryption: BucketEncryption.S3_MANAGED,
      versioned: true,
      enforceSSL: true,
      blockPublicAccess: BlockPublicAccess.BLOCK_ALL,
      removalPolicy: RemovalPolicy.DESTROY,
      autoDeleteObjects: true
    });

    new BucketDeployment(this, 'RawDataDeployment', {
      destinationBucket: this.projectBucket,
      destinationKeyPrefix: 'raw_data',
      sources: [Source.asset('./job/raw_data')],
      retainOnDelete: false,
    });


    // Raw Data Catalog
    this.rawDataDatabase = new CfnDatabase(this, 'RawDataDatabase', {
      catalogId: this.account,
      databaseInput: {
        name: this.RAW_DATA_DATABASE_NAME
      }
    });

    this.rawDataTable = new CfnTable(this, 'RawDataTable', {
      catalogId: this.account,
      databaseName: this.RAW_DATA_DATABASE_NAME,
      tableInput: {
        name: 'raw_data',
        storageDescriptor: {
          columns: [
            {name: "groupid", type: "int"},
            {name: "countrycode", type: "string"},
            {name: "useragent", type: "string"},
            {name: "language", type: "string"},
            {name: "domain", type: "string"},
            {name: "timestamp", type: "string"},
          ],
          location: `s3://${this.projectBucket.bucketName}/raw_data/`,
          inputFormat: 'org.apache.hadoop.mapred.TextInputFormat',
          outputFormat: 'org.apache.hadoop.hive.ql.io.HiveIgnoreKeyTextOutputFormat',
          serdeInfo: {serializationLibrary: 'org.openx.data.jsonserde.JsonSerDe'},
        },
        partitionKeys: [
          {name: "year", type: "string"},
          {name: "month", type: "string"},
          {name: "day", type: "string"},
          {name: "hour", type: "string"},
          {name: "minute", type: "string"}
        ],
      }
    });


    // Aggregated Data Catalogs
    this.aggregatedDataDatabase = new CfnDatabase(this, 'AggregatedDataDatabase', {
      catalogId: this.account,
      databaseInput: {
        name: this.AGGREGATED_DATA_DATABASE_NAME
      }
    });

    this.hitsByDomainAndGroupIdTable = new CfnTable(this, 'HitsByDomainAndGroupIdTable', {
      catalogId: this.account,
      databaseName: this.AGGREGATED_DATA_DATABASE_NAME,
      tableInput: {
        name: 'hits_by_domain_and_groupid',
        storageDescriptor: {
          columns: [
            {name: "groupid", type: "int"},
            {name: "domain", type: "string"},
            {name: "hitcount", type: "bigint"},
          ],
          location: `s3://${this.projectBucket.bucketName}/aggregated_data/hits_by_domain_and_groupid/`,
          inputFormat: 'org.apache.hadoop.mapred.TextInputFormat',
          outputFormat: 'org.apache.hadoop.hive.ql.io.HiveIgnoreKeyTextOutputFormat',
          serdeInfo: {serializationLibrary: 'org.openx.data.jsonserde.JsonSerDe'}
        },
        partitionKeys: [
          {name: "year", type: "string"},
          {name: "month", type: "string"},
          {name: "day", type: "string"},
          {name: "hour", type: "string"},
        ],
      }
    });

    this.hitsByUserAgentTable = new CfnTable(this, 'HitsByUserAgentTable', {
      catalogId: this.account,
      databaseName: this.AGGREGATED_DATA_DATABASE_NAME,
      tableInput: {
        name: 'hits_by_useragent',
        storageDescriptor: {
          columns: [
            {name: "useragent", type: "string"},
            {name: "hitcount", type: "bigint"},
          ],
          location: `s3://${this.projectBucket.bucketName}/aggregated_data/hits_by_useragent/`,
          inputFormat: 'org.apache.hadoop.hive.ql.io.parquet.MapredParquetInputFormat',
          outputFormat: 'org.apache.hadoop.hive.ql.io.parquet.MapredParquetOutputFormat',
          serdeInfo: {
            serializationLibrary: 'org.apache.hadoop.hive.ql.io.parquet.serde.ParquetHiveSerDe',
            parameters: {
              "serialization.format": "1"
            }
          }
        },
        partitionKeys: [
          {name: "year", type: "string"},
          {name: "month", type: "string"},
          {name: "day", type: "string"},
          {name: "hour", type: "string"},
        ],
      }
    });

    this.hitsByCountryTable = new CfnTable(this, 'HitsByCountryTable', {
      catalogId: this.account,
      databaseName: this.AGGREGATED_DATA_DATABASE_NAME,
      tableInput: {
        name: 'hits_by_country',
        storageDescriptor: {
          columns: [
            {name: "countrycode", type: "string"},
            {name: "hitcount", type: "bigint"},
          ],
          location: `s3://${this.projectBucket.bucketName}/aggregated_data/hits_by_country/`,
          inputFormat: 'org.apache.hadoop.hive.ql.io.parquet.MapredParquetInputFormat',
          outputFormat: 'org.apache.hadoop.hive.ql.io.parquet.MapredParquetOutputFormat',
          serdeInfo: {
            serializationLibrary: 'org.apache.hadoop.hive.ql.io.parquet.serde.ParquetHiveSerDe',
            parameters: {
              "serialization.format": "1"
            }
          }
        },
        partitionKeys: [
          {name: "year", type: "string"},
          {name: "month", type: "string"},
          {name: "day", type: "string"},
          {name: "hour", type: "string"},
        ],
      }
    });


    // Outputs
    new cdk.CfnOutput(this, 'ProjectBucketName', {value: this.projectBucket.bucketName});
  }
}
