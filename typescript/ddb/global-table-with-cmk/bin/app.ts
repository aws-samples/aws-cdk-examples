import * as cdk from 'aws-cdk-lib';
import { GlobalDDBTableCMK } from '../lib/global-ddb-cmk';

const TABLE_NAME: string = 'global-ddb-cmk-demo';
const PRIMARY_REGION: string = 'us-east-1';
const REPLICATIONS_REGIONS: string[] = ['us-west-2', 'us-east-2'];
const KEY_ALIAS: string = `alias/CMK-for-global-DDB-table-${TABLE_NAME}`

const app = new cdk.App();
new GlobalDDBTableCMK(app, 'global-ddb-cmk', {
  env: { region: PRIMARY_REGION },
  tableName: TABLE_NAME,
  replicationRegions: REPLICATIONS_REGIONS,
  keyAlias: KEY_ALIAS
});