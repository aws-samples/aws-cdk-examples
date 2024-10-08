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

    const quicksightDataSourcePermissions: CfnTemplate.ResourcePermissionProperty[] = [
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

    const quicksightDatasetPermissions: CfnTemplate.ResourcePermissionProperty[] = [
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

    const bucketDeployment = this.deployToBucket(bucket);
    const quicksightServiceRole = "aws-quicksight-service-role-v0"; // initial quicksight role
    const managedPolicy = this.createManagedPolicyForQuicksight('quicksightExamplePolicy', 'quicksightExamplePolicy', bucket.bucketName, [quicksightServiceRole]);

    const quicksightS3DataSourceName = "s3DataSourceExample";
    const quicksightS3DataSource = this.createDataSourceS3Type('S3DataSource', quicksightS3DataSourceName, bucket.bucketName, QuicksightExampleStack.MANIFEST_KEY, quicksightDataSourcePermissions);
    quicksightS3DataSource.node.addDependency(bucketDeployment);
    quicksightS3DataSource.node.addDependency(managedPolicy);

    const logicalColumns = readFileSync('logical-columns.json', 'utf-8');
    const logicalColumnsJson = JSON.parse(logicalColumns);
    const transformOperations: CfnDataSet.TransformOperationProperty[] = logicalColumnsJson["Columns"];
    const quicksightLogicalTable: {
      [key: string]: CfnDataSet.LogicalTableProperty
    } = this.createLogicalTableProperties('myLogicalTable', 's3-extract-data-cast', quicksightS3DataSourceName, transformOperations);

    const physicalColumns = readFileSync('physical-columns.json', 'utf-8');
    const physicalColumnsJson = JSON.parse(physicalColumns);
    const physicalTableColumns = physicalColumnsJson["Columns"];
    const quicksightS3DatasetPhysicalTableProperties: CfnDataSet.PhysicalTableProperty = this.createS3PhysicalTableProperties(quicksightS3DataSource.attrArn, physicalTableColumns);

    this.createDataset('quicksightExampleDataset', 'quicksightExampleDataset', 'SPICE', {[quicksightS3DataSourceName]: quicksightS3DatasetPhysicalTableProperties}, {[quicksightS3DataSourceName]: quicksightLogicalTable["myLogicalTable"]}, quicksightDatasetPermissions);
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
    return new BucketDeployment(this, 'BucketDeployment', {
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

  createManagedPolicyForQuicksight(idManagedPolicy: string, namePolicy: string, bucketName: string, quicksightRoles: string[]): CfnManagedPolicy {
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
        roles: quicksightRoles
      }
    );
  }

  createDataSourceS3Type(idDataSource: string, nameSource: string, bucketName: string, manifestKey: string, dataSourcePermissions: CfnTemplate.ResourcePermissionProperty[]): CfnDataSource {
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
        permissions: dataSourcePermissions
      }
    )
  }

  createDataset(idDataset: string, datasetName: string, importMode: string, physicalTable: Record<string, CfnDataSet.PhysicalTableProperty>, logicalTable: Record<string, CfnDataSet.LogicalTableProperty>, datasetPermissions: CfnTemplate.ResourcePermissionProperty[]): CfnDataSet {
    return new CfnDataSet(
      this,
      idDataset,
      {
        awsAccountId: this.account,
        physicalTableMap: physicalTable,
        logicalTableMap: logicalTable,
        name: datasetName,
        dataSetId: datasetName,
        permissions: datasetPermissions,
        importMode: importMode
      }
    );
  }

  createLogicalTableProperties(keyTable: string, aliasLogicalTable: string, physicalTableIdRelated: string, transformOperations: CfnDataSet.TransformOperationProperty[]): {
    [key: string]: CfnDataSet.LogicalTableProperty
  } {
    return {
      [keyTable]: {
        alias: aliasLogicalTable,
        source: {
          physicalTableId: physicalTableIdRelated
        },
        dataTransforms: transformOperations
      }
    }
  }

  createS3PhysicalTableProperties(arnDataSourceCreated: string, inputColumns: CfnDataSet.InputColumnProperty[]): CfnDataSet.PhysicalTableProperty {
    return {
      s3Source: {
        dataSourceArn: arnDataSourceCreated,
        inputColumns: inputColumns,
        uploadSettings: {
          format: 'CSV',
          delimiter: ',',
          containsHeader: true,
          startFromRow: 5
        }
      }
    }
  }

}
