# BackupPlan Construct

<!--BEGIN STABILITY BANNER-->
---

![Stability: Stable](https://img.shields.io/badge/stability-Stable-success.svg?style=for-the-badge)

> **This is a stable example. It should successfully build out of the box**
>
> This example uses the core CDK library, and does not have any infrastructure prerequisites to build.
---
<!--END STABILITY BANNER-->

## Overview

This construct creates a [Backup Plan](https://docs.aws.amazon.com/aws-backup/latest/devguide/about-backup-plans.html) using [AWS Backups](https://docs.aws.amazon.com/aws-backup/latest/devguide/whatisbackup.html). Construct allows to indicate how frequently and what resources to backup.

---

## API

#### Initializers <a name="Initializers" id="backup-plan.Backup.Initializer"></a>

```typescript
import { Backup } from 'backup-plan'

new Backup(scope: Construct, id: string, props: BackupProps)
```

| **Name**                                                                                                     | **Type**                                                                                    | **Description**   |
| ------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------- | ----------------- |
| <code><a href="#backup-plan.Backup.Initializer.parameter.scope">scope</a></code> | <code>constructs.Construct</code>                                                           | *No description.* |
| <code><a href="#backup-plan.Backup.Initializer.parameter.id">id</a></code>       | <code>string</code>                                                                         | *No description.* |
| <code><a href="#backup-plan.Backup.Initializer.parameter.props">props</a></code> | <code><a href="#backup-plan.BackupProps">BackupProps</a></code> | *No description.* |

---

##### `scope`<sup>Required</sup> <a name="scope" id="backup-plan.Backup.Initializer.parameter.scope"></a>

- *Type:* constructs.Construct

---

##### `id`<sup>Required</sup> <a name="id" id="backup-plan.Backup.Initializer.parameter.id"></a>

- *Type:* string

---

##### `props`<sup>Required</sup> <a name="props" id="backup-plan.Backup.Initializer.parameter.props"></a>

- *Type:* <a href="#backup-plan.BackupProps">BackupProps</a>

---


#### Properties <a name="Properties" id="Properties"></a>

| **Name**                                                                                                  | **Type**                                       | **Description** |
| --------------------------------------------------------------------------------------------------------- | ---------------------------------------------- | --------------- |
| <code><a href="#backup-plan.Backup.property.backupPlan">backupPlan</a></code> | <code>aws-cdk-lib.aws_backup.BackupPlan</code> | Backup plan.    |

---

##### `backupPlan`<sup>Required</sup> <a name="backupPlan" id="backup-plan.Backup.property.backupPlan"></a>

```typescript
public readonly backupPlan: BackupPlan;
```

- *Type:* aws-cdk-lib.aws_backup.BackupPlan

---

### BackupProps <a name="BackupProps" id="backup-plan.BackupProps"></a>

#### Initializer <a name="Initializer" id="backup-plan.BackupProps.Initializer"></a>

```typescript
import { BackupProps } from 'backup-plan'

const backupProps: BackupProps = { ... }
```

#### Properties <a name="Properties" id="Properties"></a>

| **Name** | **Type** | **Description** |
| --- | --- | --- |
| <code><a href="#backup-plan.BackupProps.property.backupPlanName">backupPlanName</a></code> | <code>string</code> | The display name of the backup plan. |
| <code><a href="#backup-plan.BackupProps.property.resources">resources</a></code> | <code>aws-cdk-lib.aws_backup.BackupResource[]</code> | Resources to apply backup plan. |
| <code><a href="#backup-plan.BackupProps.property.backupCompletionWindow">backupCompletionWindow</a></code> | <code>aws-cdk-lib.Duration</code> | The duration after a backup job is successfully started before it must be completed or it is canceled by AWS Backup. |
| <code><a href="#backup-plan.BackupProps.property.backupRateHour">backupRateHour</a></code> | <code>number</code> | How frequently backup jobs would be started. |
| <code><a href="#backup-plan.BackupProps.property.backupStartWindow">backupStartWindow</a></code> | <code>aws-cdk-lib.Duration</code> | The duration after a backup is scheduled before a job is canceled if it doesn't start successfully. |
| <code><a href="#backup-plan.BackupProps.property.deleteBackupAfter">deleteBackupAfter</a></code> | <code>aws-cdk-lib.Duration</code> | Specifies the duration after creation that a recovery point is deleted. |
| <code><a href="#backup-plan.BackupProps.property.moveBackupToColdStorageAfter">moveBackupToColdStorageAfter</a></code> | <code>aws-cdk-lib.Duration</code> | Specifies the duration after creation that a recovery point is moved to cold storage. |

---

##### `backupPlanName`<sup>Required</sup> <a name="backupPlanName" id="backup-plan.BackupProps.property.backupPlanName"></a>

```typescript
public readonly backupPlanName: string;
```

- *Type:* string

The display name of the backup plan.

---

##### `resources`<sup>Required</sup> <a name="resources" id="backup-plan.BackupProps.property.resources"></a>

```typescript
public readonly resources: BackupResource[];
```

- *Type:* aws-cdk-lib.aws_backup.BackupResource[]

Resources to apply backup plan.

---

##### `backupCompletionWindow`<sup>Optional</sup> <a name="backupCompletionWindow" id="backup-plan.BackupProps.property.backupCompletionWindow"></a>

```typescript
public readonly backupCompletionWindow: Duration;
```

- *Type:* aws-cdk-lib.Duration
- *Default:* 3 hours

The duration after a backup job is successfully started before it must be completed or it is canceled by AWS Backup.

Note: `backupCompletionWindow` must be at least 60 minutes greater than @backupStartWindows

---

##### `backupRateHour`<sup>Optional</sup> <a name="backupRateHour" id="backup-plan.BackupProps.property.backupRateHour"></a>

```typescript
public readonly backupRateHour: number;
```

- *Type:* number
- *Default:* 24 hours

How frequently backup jobs would be started.

---

##### `backupStartWindow`<sup>Optional</sup> <a name="backupStartWindow" id="backup-plan.BackupProps.property.backupStartWindow"></a>

```typescript
public readonly backupStartWindow: Duration;
```

- *Type:* aws-cdk-lib.Duration
- *Default:* 1 hour less than

The duration after a backup is scheduled before a job is canceled if it doesn't start successfully.

---

##### `deleteBackupAfter`<sup>Optional</sup> <a name="deleteBackupAfter" id="backup-plan.BackupProps.property.deleteBackupAfter"></a>

```typescript
public readonly deleteBackupAfter: Duration;
```

- *Type:* aws-cdk-lib.Duration
- *Default:* 30 days

Specifies the duration after creation that a recovery point is deleted.

Must be greater than moveToColdStorageAfter.

---

##### `moveBackupToColdStorageAfter`<sup>Optional</sup> <a name="moveBackupToColdStorageAfter" id="backup-plan.BackupProps.property.moveBackupToColdStorageAfter"></a>

```typescript
public readonly moveBackupToColdStorageAfter: Duration;
```

- *Type:* aws-cdk-lib.Duration
- *Default:* recovery point is never moved to cold storage

Specifies the duration after creation that a recovery point is moved to cold storage.

---

## Usage

```typescript
const vpc = new ec2.Vpc(testStack, 'TestVPC');
const engine = rds.DatabaseInstanceEngine.postgres({ version: rds.PostgresEngineVersion.VER_12_3 });
// create rds DB
const db = new rds.DatabaseInstance(testStack, 'TestInstance', {
    engine,
    vpc,
    credentials: rds.Credentials.fromGeneratedSecret('postgres'),
});
// create a backup plan for `db`
new Backup(stack, 'TestBk', {
    backupPlanName: 'TestPkPlan',
    backupRateHour: 3,  // backup every 3 hours
    backupCompletionWindow: cdk.Duration.hours(2), // backup should take up to 2 hours
    resources: [bk.BackupResource.fromRdsDatabaseInstance(db)],
});
```

NOTE: [Tagging](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_backup.BackupResource.html#static-fromwbrtagkey-value-operation) and/or [ARN](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_backup.BackupResource.html#static-fromwbrarnarn) can be used to reference resources not directly available in the [static methods section](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_backup.BackupResource.html#methods). 
