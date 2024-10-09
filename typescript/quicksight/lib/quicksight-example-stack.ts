import * as cdk from 'aws-cdk-lib';
import {Construct} from 'constructs';
import {Bucket} from 'aws-cdk-lib/aws-s3';
import {BucketDeployment, Source} from 'aws-cdk-lib/aws-s3-deployment';
import {aws_s3} from 'aws-cdk-lib';
import {CfnDataSet, CfnDataSource, CfnTemplate} from 'aws-cdk-lib/aws-quicksight';
import {CfnManagedPolicy} from 'aws-cdk-lib/aws-iam';
import {readFileSync} from 'node:fs';
import {logicalColumns} from './logical-columns';
import {physicalColumns} from './physical-columns';


export class QuicksightExampleStack extends cdk.Stack {
  public static MANIFEST_KEY = 'manifests/manifest.json';

  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const bucket = this.createBucket();
    const accountQuicksight = 'arn:aws:quicksight:<region>:<accountid>:user/<namespace>/<username>';
    this.createQuicksightResources(bucket, accountQuicksight);
  }

  // creates s3 bucket and deploys test data
  public createBucket(): Bucket {
    const bucketName = 'example-bucket';

    // Set up a bucket
    const bucket = new aws_s3.Bucket(this, bucketName, {
      accessControl: aws_s3.BucketAccessControl.BUCKET_OWNER_FULL_CONTROL,
      encryption: aws_s3.BucketEncryption.S3_MANAGED,
      blockPublicAccess: aws_s3.BlockPublicAccess.BLOCK_ALL
    });

    const manifest = {
      fileLocations: [
        {
          URIPrefixes: [`s3://${bucket.bucketName}`]
        },
      ],
      globalUploadSettings: {
        format: 'CSV',
        delimiter: ',',
      }
    };

    // turn manifest JSON and s3 key into source object
    const sourceInternal = Source.jsonData(
      QuicksightExampleStack.MANIFEST_KEY,
      manifest
    );
    // deploy them
    new BucketDeployment(this, 'BucketDeployment', {
      sources: [sourceInternal, Source.asset('./data')],
      destinationBucket: bucket,
    });
    return bucket;
  }

  public createQuicksightResources(bucket: Bucket, quicksightAccountArn: string) {
    const quicksightS3DataSourceName = 's3DataSourceExample';
    // make it a stack parameter so users dont have to change the code
    // make sure here it is clear that the acc cant be created
    // replace with your own values here

    const quicksightDataSourcePermissions: CfnTemplate.ResourcePermissionProperty[] = [
      {
        principal: quicksightAccountArn,
        actions: [
          'quicksight:DescribeDataSource',
          'quicksight:DescribeDataSourcePermissions',
          'quicksight:PassDataSource',
          'quicksight:UpdateDataSource'
        ],
      }
    ];

    const quicksightDatasetPermissions: CfnTemplate.ResourcePermissionProperty[] = [
      {
        principal: quicksightAccountArn,
        actions: [
          'quicksight:DescribeDataSet',
          'quicksight:DescribeDataSetPermissions',
          'quicksight:PassDataSet',
          'quicksight:DescribeIngestion',
          'quicksight:ListIngestions',
          'quicksight:UpdateDataSet',
          'quicksight:DeleteDataSet',
          'quicksight:CreateIngestion',
          'quicksight:CancelIngestion',
          'quicksight:UpdateDataSetPermissions'
        ]
      }
    ];

    // this service role is created automatically when you set up your quicksight account
    const quicksightServiceRole = 'aws-quicksight-service-role-v0';
    // allow quicksight to access the bucket
    const managedPolicy = this.createManagedPolicyForQuicksight(
      'quicksightExamplePolicy',
      'quicksightExamplePolicy',
      bucket.bucketName,
      [ quicksightServiceRole ]);

    const quicksightS3DataSource = new CfnDataSource(
      this,
      'S3DataSource',
      {
        awsAccountId: this.account,
        dataSourceId: quicksightS3DataSourceName,
        name: quicksightS3DataSourceName,
        dataSourceParameters: {
          s3Parameters: {
            manifestFileLocation: {
              bucket: bucket.bucketName,
              key: QuicksightExampleStack.MANIFEST_KEY
            }
          }
        },
        type: 'S3',
        sslProperties: {
          disableSsl: false
        },
        permissions: quicksightDataSourcePermissions
      }
    )

    // quicksight needs these to be created so we waiting for the
    quicksightS3DataSource.node.addDependency(bucket);
    quicksightS3DataSource.node.addDependency(managedPolicy);

    const transformOperations: CfnDataSet.TransformOperationProperty[] = logicalColumns;

    const logicalTableProperties = {
      alias: 's3-extract-data-cast',
      source: {
        physicalTableId: quicksightS3DataSourceName
      },
      dataTransforms: transformOperations
    }

    const physicalTableProperties = {
      s3Source: {
        dataSourceArn: quicksightS3DataSource.attrArn,
        inputColumns: physicalColumns,
        uploadSettings: {
          format: 'CSV',
          delimiter: ',',
          containsHeader: true,
          startFromRow: 5
        }
      }
    }

    new CfnDataSet(
      this,
      'quicksightExampleDataset',
      {
        awsAccountId: this.account,
        physicalTableMap: {[quicksightS3DataSourceName]: physicalTableProperties},
        logicalTableMap: {[quicksightS3DataSourceName]: logicalTableProperties},
        name: 'quicksightExampleDataset',
        dataSetId: 'quicksightExampleDataset',
        permissions: quicksightDatasetPermissions,
        importMode: 'SPICE'
      }
    );
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
          'Statement': [
            {
              'Effect': 'Allow',
              'Action': ['s3:ListAllMyBuckets'],
              'Resource': ['arn:aws:s3:::*']
            },
            {
              'Effect': 'Allow',
              'Action': ['s3:*'],
              'Resource': [
                `arn:aws:s3:::${bucketName}`,
                `arn:aws:s3:::${bucketName}/*`
              ]
            }
          ],
          'Version': '2012-10-17'
        },
        roles: quicksightRoles
      }
    );
  }
}
