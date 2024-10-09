import {Construct} from 'constructs';
import {BlockPublicAccess, Bucket, BucketAccessControl, BucketEncryption} from 'aws-cdk-lib/aws-s3';
import {BucketDeployment, Source} from 'aws-cdk-lib/aws-s3-deployment';
import {CfnDataSet, CfnDataSource, CfnTemplate} from 'aws-cdk-lib/aws-quicksight';
import {CfnManagedPolicy} from 'aws-cdk-lib/aws-iam';
import { Stack, StackProps } from 'aws-cdk-lib';
import {dataTransforms} from './data-transforms';
import {inputColumns} from './input-columns';

export class QuicksightExampleStack extends Stack {
  /**
   * location of the manifest json file in the s3 bucket.
   * Used by quicksight to discover the csv files.
   * */
  public static MANIFEST_KEY = 'manifests/manifest.json';
  /**
   * Name of the datasource in quicksight
   */
  public static QUICKSIGHT_DATASOURCE_NAME = 's3DataSourceExample';
  /**
   * By default, Amazon QuickSight uses a role named aws-quicksight-service-role-v0.
   * @see https://docs.aws.amazon.com/lake-formation/latest/dg/qs-integ-lf.html
   */
  public static QUICKSIGHT_SERVICE_ROLE = 'aws-quicksight-service-role-v0';

  public static QUICKSIGHT_DATASET_NAME = 'quicksightExampleDataset';


  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    const { bucket, deployment } = this.createBucket();
    const accountQuicksight = 'arn:aws:quicksight:<region>:<accountid>:user/<namespace>/<username>';
    this.createQuicksightResources(bucket, deployment, accountQuicksight);
  }

  // creates s3 bucket and deploys test data
  public createBucket(): {bucket: Bucket, deployment: BucketDeployment} {
    const bucketName = 'example-bucket';

    // Set up a bucket
    const bucket = new Bucket(this, bucketName, {
      accessControl: BucketAccessControl.BUCKET_OWNER_FULL_CONTROL,
      encryption: BucketEncryption.S3_MANAGED,
      blockPublicAccess: BlockPublicAccess.BLOCK_ALL
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
    const deployment = new BucketDeployment(this, 'BucketDeployment', {
      sources: [sourceInternal, Source.asset('./data')],
      destinationBucket: bucket,
    });
    return { bucket, deployment };
  }

  public createQuicksightResources(bucket: Bucket, deployment: BucketDeployment, quicksightAccountArn: string) {

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

    const policyName = 'quicksightExamplePolicy'
    const managedPolicy = new CfnManagedPolicy(
        this,
        policyName,
        {
          managedPolicyName: policyName,
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
                  `arn:aws:s3:::${bucket.bucketName}`,
                  `arn:aws:s3:::${bucket.bucketName}/*`
                ]
              }
            ],
            'Version': '2012-10-17'
          },
          roles: [ QuicksightExampleStack.QUICKSIGHT_SERVICE_ROLE ]
        }
      );


    const quicksightS3DataSource = new CfnDataSource(
      this,
      'S3DataSource',
      {
        awsAccountId: this.account,
        dataSourceId: QuicksightExampleStack.QUICKSIGHT_DATASOURCE_NAME,
        name: QuicksightExampleStack.QUICKSIGHT_DATASOURCE_NAME,
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
    quicksightS3DataSource.node.addDependency(managedPolicy);
    quicksightS3DataSource.node.addDependency(deployment);

    const physicalTableProperties: CfnDataSet.PhysicalTableProperty = {
      s3Source: {
        dataSourceArn: quicksightS3DataSource.attrArn,
        inputColumns,
        uploadSettings: {
          format: 'CSV',
          delimiter: ',',
          containsHeader: true,
          startFromRow: 5
        }
      }
    }
    /**
     * @see https://docs.aws.amazon.com/quicksight/latest/APIReference/API_LogicalTable.html
     */
    const logicalTableProperties: CfnDataSet.LogicalTableProperty = {
      alias: 's3-extract-data-cast',
      source: {
        physicalTableId: QuicksightExampleStack.QUICKSIGHT_DATASOURCE_NAME
      },
      dataTransforms
    }


    new CfnDataSet(
      this,
      QuicksightExampleStack.QUICKSIGHT_DATASET_NAME,
      {
        awsAccountId: this.account,
        physicalTableMap: {[QuicksightExampleStack.QUICKSIGHT_DATASOURCE_NAME]: physicalTableProperties},
        logicalTableMap: {[QuicksightExampleStack.QUICKSIGHT_DATASOURCE_NAME]: logicalTableProperties},
        name: QuicksightExampleStack.QUICKSIGHT_DATASET_NAME,
        dataSetId: QuicksightExampleStack.QUICKSIGHT_DATASET_NAME,
        permissions: quicksightDatasetPermissions,
        importMode: 'SPICE'
      }
    );
  }
}
