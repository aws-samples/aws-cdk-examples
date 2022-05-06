import * as cdk from 'aws-cdk-lib';
import { aws_rds as rds, aws_ec2 as ec2, aws_backup as bk } from 'aws-cdk-lib';
import {
  Match,
  Template,
} from 'aws-cdk-lib/assertions';
import { Backup } from '../lib/index';

let testTemplate: Template;


const createRequiredResources = () => {
  const app = new cdk.App();
  const testStack = new cdk.Stack(app, 'testStack', {
    env: { account: '111122223333', region: 'us-east-1' },
  });
  const vpc = new ec2.Vpc(testStack, 'TestVPC');
  const engine = rds.DatabaseInstanceEngine.postgres({ version: rds.PostgresEngineVersion.VER_12_3 });
  const db = new rds.DatabaseInstance(testStack, 'TestInstance', {
    engine,
    vpc,
    credentials: rds.Credentials.fromGeneratedSecret('postgres'), // Creates an admin user of postgres with a generated password
  });
  return { db, stack: testStack };
};

beforeAll(() => {
  const { stack, db } = createRequiredResources();
  new Backup(stack, 'TestBk', {
    backupPlanName: 'TestPkPlan',
    backupRateHour: 2,
    backupCompletionWindow: cdk.Duration.hours(2),
    resources: [bk.BackupResource.fromRdsDatabaseInstance(db)],
  });

  testTemplate = Template.fromStack(stack);
});

test('backup plan is created', () => {
  testTemplate.hasResourceProperties('AWS::Backup::BackupPlan', {
    BackupPlan: {
      BackupPlanName: 'TestPkPlan',
      BackupPlanRule: [
        {
          CompletionWindowMinutes: 120,
          Lifecycle: {
            DeleteAfterDays: 30,
          },
          RuleName: 'BackupPlanRule0',
          ScheduleExpression: 'cron(0 0/2 * * ? *)',
          StartWindowMinutes: 60,
          TargetBackupVault: Match.anyValue(),
        },
      ],
    },
  });
});

test('backup vault is created', () => {
  testTemplate.resourceCountIs('AWS::Backup::BackupVault', 1);
});

test('validate default args', () => {
  const { stack, db } = createRequiredResources();
  new Backup(stack, 'TestBk', {
    backupPlanName: 'TestPkPlan2',
    resources: [bk.BackupResource.fromRdsDatabaseInstance(db)],
  });
  const template = Template.fromStack(stack);
  template.hasResourceProperties('AWS::Backup::BackupPlan', {
    BackupPlan: {
      BackupPlanName: 'TestPkPlan2',
      BackupPlanRule: [
        {
          CompletionWindowMinutes: 180,
          Lifecycle: {
            DeleteAfterDays: 30,
          },
          RuleName: 'BackupPlanRule0',
          ScheduleExpression: 'cron(0 0/24 * * ? *)',
          StartWindowMinutes: 120,
          TargetBackupVault: Match.anyValue(),
        },
      ],
    },
  });
});

test('validate start window must be at least 60 min less than completion window', () => {
  const { stack, db } = createRequiredResources();
  expect(() => (
    new Backup(stack, 'TestBk', {
      backupPlanName: 'TestPkPlan2',
      resources: [bk.BackupResource.fromRdsDatabaseInstance(db)],
      backupCompletionWindow: cdk.Duration.hours(1),
      backupStartWindow: cdk.Duration.hours(2),
    })
  )).toThrow('Backup completion window must be at least 60 minutes greater than backup start window');
});

