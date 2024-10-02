import * as cdk from 'aws-cdk-lib';
import {Construct} from 'constructs';
import {Bucket} from "aws-cdk-lib/aws-s3";
import {BucketDeployment, Source} from "aws-cdk-lib/aws-s3-deployment";
import {aws_s3} from "aws-cdk-lib";
import {CfnDataSet, CfnDataSource, CfnTemplate} from "aws-cdk-lib/aws-quicksight";
import {CfnManagedPolicy} from "aws-cdk-lib/aws-iam";
import {readFileSync} from "node:fs";

export class QuicksightExampleStack extends cdk.Stack {
  public static MANIFEST_KEY =
    'manifests/manifest.json';

  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const bucketName = 'example-bucket';
    const accountQuicksight = "arn:aws:quicksight:<region>:<accountid>:user/<namespace>/<username>"; // replace with your own values here

    // Set up a bucket
    const bucket = new aws_s3.Bucket(this, bucketName, {
      accessControl: aws_s3.BucketAccessControl.BUCKET_OWNER_FULL_CONTROL,
      encryption: aws_s3.BucketEncryption.S3_MANAGED,
      blockPublicAccess: aws_s3.BlockPublicAccess.BLOCK_ALL
    });

    const qs_data_source_permissions : CfnTemplate.ResourcePermissionProperty[] = [
      {
        principal: accountQuicksight,
        actions: [
          "quicksight:DescribeDataSource",
          "quicksight:DescribeDataSourcePermissions",
          "quicksight:PassDataSource",
          "quicksight:UpdateDataSource"
        ],
      }
    ];

    const qs_dataset_permissions : CfnTemplate.ResourcePermissionProperty[] = [
      {
        principal: accountQuicksight,
        actions: [
          "quicksight:DescribeDataSet",
          "quicksight:DescribeDataSetPermissions",
          "quicksight:PassDataSet",
          "quicksight:DescribeIngestion",
          "quicksight:ListIngestions",
          "quicksight:UpdateDataSet",
          "quicksight:DeleteDataSet",
          "quicksight:CreateIngestion",
          "quicksight:CancelIngestion",
          "quicksight:UpdateDataSetPermissions"
        ]
      }
    ];

    const deployment = this.deployToBucket(bucket);
    const quicksightServiceRole = "aws-quicksight-service-role-v0"; // initial quicksight role
    const managedpolicy = this.createManagedPolicyForQuicksight('quicksightexamplepolicy', 'quicksightexamplepolicy', bucket.bucketName, [quicksightServiceRole]);

    const qs_s3_datasource_name = "s3datasourceexample";
    const qs_s3_datasource = this.createDataSourceS3Type('S3DataSource', qs_s3_datasource_name, bucket.bucketName, QuicksightExampleStack.MANIFEST_KEY, qs_data_source_permissions);
    qs_s3_datasource.node.addDependency(deployment);
    qs_s3_datasource.node.addDependency(managedpolicy);
    const physicalColumns = readFileSync('physical-columns.json', 'utf-8');
    const physicalColumnsJson = JSON.parse(physicalColumns);

    const physical_table_columns = physicalColumnsJson["Internal"];
    const qs_s3_dataset_physical_tables_properties : CfnDataSet.PhysicalTableProperty = this.createS3PhysicalTableProperties(qs_s3_datasource.attrArn, physical_table_columns);
    this.createDataset('quicksightexampleDataset', 'quicksightexampleDataset', 'SPICE', {[qs_s3_datasource_name]: qs_s3_dataset_physical_tables_properties}, qs_dataset_permissions);
  }

  public deployToBucket(bucket: Bucket): BucketDeployment {
    const manifest = QuicksightExampleStack.createS3Manifest(
      bucket.bucketName
    );
    // turn manifest JSON and s3 key into source object
    const sourceInternal = Source.jsonData(
      QuicksightExampleStack.MANIFEST_KEY,
      manifest
    );
    // deploy them
    return new BucketDeployment(this, 'Bucketdeployment', {
      sources: [sourceInternal, Source.asset('./data')],
      destinationBucket: bucket,
    });
  }

  // Creates a very simple manifest JSON for the QuickSight S3 data source.
  public static createS3Manifest(s3BucketName: string): object {
    return {
      fileLocations: [
        {
          URIPrefixes: [`s3://${s3BucketName}`]
        },
      ],
      globalUploadSettings: {
        format: 'CSV',
        delimiter: ',',
      }
    };
  }

  createManagedPolicyForQuicksight(idManagedPolicy: string, namePolicy: string, bucketName: string, roles_quicksight: string[]): CfnManagedPolicy {
    return new CfnManagedPolicy(
      this,
      idManagedPolicy,
      {
        managedPolicyName: namePolicy,
        policyDocument: {
          "Statement": [
            {
              "Effect": "Allow",
              "Action": ["s3:ListAllMyBuckets"],
              "Resource": ["arn:aws:s3:::*"]
            },
            {
              "Effect": "Allow",
              "Action": ["s3:*"],
              "Resource": [
                `arn:aws:s3:::${bucketName}`,
                `arn:aws:s3:::${bucketName}/*`
              ]
            }
          ],
          "Version": "2012-10-17"
        },
        roles: roles_quicksight
      }
    );
  }

  createDataSourceS3Type(idDataSource: string, nameSource: string, bucketName: string, manifestKey: string, data_source_permissions: CfnTemplate.ResourcePermissionProperty[]): CfnDataSource {
    return new CfnDataSource(
      this,
      idDataSource,
      {
        awsAccountId: this.account,
        dataSourceId: nameSource,
        name: nameSource,
        dataSourceParameters: {
          s3Parameters: {
            manifestFileLocation: {
              bucket: bucketName,
              key: manifestKey
            }
          }
        },
        type: 'S3',
        sslProperties: {
          disableSsl: false
        },
        permissions: data_source_permissions
      }
    )
  }

  createDataset(idDataset: string, datasetName: string, importMode: string, physical_table: Record<string, CfnDataSet.PhysicalTableProperty>, datasetPermissions: CfnTemplate.ResourcePermissionProperty[]): CfnDataSet {
    return new CfnDataSet(
      this,
      idDataset,
      {
        awsAccountId: this.account,
        physicalTableMap: physical_table,
        name: datasetName,
        dataSetId: datasetName,
        permissions: datasetPermissions,
        importMode: importMode
      }
    );
  }

  createS3PhysicalTableProperties(arnDataSourceCreated: string, inputColumns: CfnDataSet.InputColumnProperty[]) : CfnDataSet.PhysicalTableProperty{
    return {
      s3Source: {
        dataSourceArn: arnDataSourceCreated,
        inputColumns: inputColumns,
        uploadSettings: {
          format: 'CSV',
          delimiter: ',',
          containsHeader: true
        }
      }
    }
  }

}
