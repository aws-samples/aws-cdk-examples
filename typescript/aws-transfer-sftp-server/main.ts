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

const app = new cdk.App();

// Use CDK Context to get configuration variables
// https://docs.aws.amazon.com/cdk/v2/guide/context.html
const userPublicKeys = (app.node.getContext('userPublicKeys') as string).split(',');
const allowedIps = app.node.tryGetContext('allowedIps') as string | undefined;

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
  allowedIps: allowedIps ? allowedIps.split(',') : undefined,
  ...props,
};

new SftpServerStack(app, 'SftpServerStack-dev', sftpPropsDev);

// Enable if needed
// new SftpServerStack(app, 'SftpServerStack-prod', sftpProps);
