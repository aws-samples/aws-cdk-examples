# CDK - Global DynamoBD (DDB) Table with customer managed key (CMK) encryption
As of today, CDK does not support a native construct for DDB global table with CMK. \
This repository serves as a prebuilt solution built around the L1 constructs `dynamodb.CfnGlobalTable` and `kms.CfnKey`.

Before creation of the global DDB table, the primary region and each replica region require their own CMK to be created.
`cmk-stack.ts` uses `kms.CfnKey` to create a CMK in the primary region.
Key replicas are then created in each of the replica regions through use of a custom resource.

## Setup and Deployment
#### Setup CDK variables
```js
const TABLE_NAME: string = // name of the ddb table
const PRIMARY_REGION: string = // primary deployment region of the ddb table
const REPLICATIONS_REGIONS: string[] = // list of replica regions of the ddb table
const KEY_ALIAS: str = // OPTIONAL: key alias for the CMK
```
#### Deployment
Before initial deployment, bootstrap the account with
```
npx cdk bootstrap
```
Afterwards, deploy the solution with
```
npx cdk deploy
```