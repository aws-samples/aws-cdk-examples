#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { QuicksightExampleStack } from '../lib/quicksight-example-stack';

const app = new cdk.App();
new QuicksightExampleStack(app, 'QuicksightExampleStack');
