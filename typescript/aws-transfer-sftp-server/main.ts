#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { SftpServerStack, SftpServerStackProps } from './aws-transfer-sftp-server';

// Follow the setup process at https://docs.aws.amazon.com/cdk/v2/guide/environments.html
const props: cdk.StackProps = {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION,
  }
};

const userPublicKeys = [
  'ecdsa-sha2-nistp256 AAAAE2VjZHNhLXNoYTItbmlzdHAyNTYAAAAIbmlzdHAyNTYAAABBBCJlxu5q1M3icgvrvNvCyE4gavDWaB8L7ZyGjnpsp/7GZhczaqY49KmZnZrbsKfoKtKu5bkNN8BXcjrAAwwv0Hk='
];

// Different properties for dev/test environment
const sftpPropsDev: SftpServerStackProps = {
  userName: 'sftp-user-dev',
  userPublicKeys,
  ...props,
};

// In production we want to limit allowed IPs
const sftpProps: SftpServerStackProps = {
  userName: 'sftp-user',
  userPublicKeys,
  allowedIps: ['127.0.0.1/32'],
  ...props,
};

const app = new cdk.App();

new SftpServerStack(app, 'SftpServerStack-dev', sftpPropsDev);

// Enable if needed
// new SftpServerStack(app, 'SftpServerStack-prod', sftpProps);
