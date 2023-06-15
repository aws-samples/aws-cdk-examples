#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import {
  aws_s3 as s3,
} from 'aws-cdk-lib';
import { SftpServerStack, SftpServerStackProps } from './aws-transfer-sftp-server';

// Follow the setup process at https://docs.aws.amazon.com/cdk/v2/guide/environments.html
const props: cdk.StackProps = {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION,
  }
};

const app = new cdk.App();

// Use CDK Context to get configuration variables
// https://docs.aws.amazon.com/cdk/v2/guide/context.html
const publicKeysContext = app.node.tryGetContext('userPublicKeys') as string | undefined;
if (!publicKeysContext) {
  console.error('Parameter userPublicKeys missing');
}
const allowedIps = app.node.tryGetContext('allowedIps') as string | undefined;

const bucketStack = new cdk.Stack(app, 'IncomingDataStack-dev', props);
const bucket = new s3.Bucket(bucketStack, 'IncomingDataBucket', {
  blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
  bucketName: `sftp-server-data-bucket-${props.env?.account}-${props.env?.region}`,
  encryption: s3.BucketEncryption.KMS_MANAGED,
  enforceSSL: true,
  // Do not use for production!
  removalPolicy: cdk.RemovalPolicy.DESTROY,
});

const userPublicKeys = publicKeysContext ? publicKeysContext.split(',') : [];

// Different properties for dev/test environment
const sftpPropsDev: SftpServerStackProps = {
  userName: 'sftp-user-dev',
  userPublicKeys,
  dataBucket: bucket,
  ...props,
};

// In production we want to limit allowed IPs
const sftpProps: SftpServerStackProps = {
  userName: 'sftp-user',
  userPublicKeys,
  allowedIps: allowedIps ? allowedIps.split(',') : undefined,
  dataBucket: bucket,
  ...props,
};

new SftpServerStack(app, 'SftpServerStack-dev', sftpPropsDev);

new SftpServerStack(app, 'SftpServerStack-prod', sftpProps);
