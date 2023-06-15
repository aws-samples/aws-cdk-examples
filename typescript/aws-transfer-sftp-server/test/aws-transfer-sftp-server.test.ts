import * as cdk from 'aws-cdk-lib';
import {
  aws_s3 as s3,
} from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import { SftpServerStack } from '../aws-transfer-sftp-server';

test('SftpServerStack has required resources', () => {
  const app = new cdk.App();
  // WHEN
  const bucketStack = new cdk.Stack(app, 'IncomingDataStack-dev', { });
  const bucket = new s3.Bucket(bucketStack, 'IncomingDataBucket', {
    blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
    bucketName: `sftp-server-data-bucket-example`,
    encryption: s3.BucketEncryption.KMS_MANAGED,
    enforceSSL: true,
    // Do not use for production!
    removalPolicy: cdk.RemovalPolicy.DESTROY,
  });
  const stack = new SftpServerStack(app, 'SftpServerStack', {
    userName: 'sftp-user-dev',
    userPublicKeys: ['ecdsa-sha2-nistp256 AAAAE2VjZHNhLXNoYTItbmlzdHAyNTYAAAAIbmlzdHAyNTYAAABBBCJlxu5q1M3icgvrvNvCyE4gavDWaB8L7ZyGjnpsp/7GZhczaqY49KmZnZrbsKfoKtKu5bkNN8BXcjrAAwwv0Hk='],
    dataBucket: bucket,
  });

  expect(Template.fromStack(stack)).toMatchSnapshot();
});
