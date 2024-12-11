#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import {DataStack} from "../lib/data-stack";
import {EtlStack} from "../lib/etl-stack";
import {RunnerStack} from "../lib/runner-stack";
import {OrchestrationStack} from "../lib/orchestration-stack";

const app = new cdk.App();

const dataStack = new DataStack(app, 'DataStack', {});
const etlStack = new EtlStack(app, 'EtlStack', dataStack);
const orchestrationStack = new OrchestrationStack(app, 'OrchestrationStack', etlStack);
orchestrationStack.addDependency(etlStack)

// Runs the DataCatalog Crawler to fill out the raw-data table's partitions
const runnerStack = new RunnerStack(app, 'RunnerStack', {
  projectBucket: dataStack.projectBucket,
  databaseName: dataStack.rawDataDatabase,
  etlJob: etlStack.etlJob,
  stateMachine: orchestrationStack.stateMachine
});
runnerStack.addDependency(dataStack);
runnerStack.addDependency(etlStack);
runnerStack.addDependency(orchestrationStack);
