import * as cdk from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import { SftpServerStack } from '../aws-transfer-sftp-server';

test('SftpServerStack has required resources', () => {
  const app = new cdk.App();
  // WHEN
  const stack = new SftpServerStack(app, 'SftpServerStack', {
    userName: 'sftp-user-dev',
    userPublicKeys: ['ecdsa-sha2-nistp256 AAAAE2VjZHNhLXNoYTItbmlzdHAyNTYAAAAIbmlzdHAyNTYAAABBBCJlxu5q1M3icgvrvNvCyE4gavDWaB8L7ZyGjnpsp/7GZhczaqY49KmZnZrbsKfoKtKu5bkNN8BXcjrAAwwv0Hk=']
  });

  expect(Template.fromStack(stack)).toMatchSnapshot();
});
