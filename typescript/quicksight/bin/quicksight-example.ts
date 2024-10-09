#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { QuicksightExampleStack } from '../lib/quicksight-example-stack';

const app = new cdk.App();
new QuicksightExampleStack(app, 'QuicksightExampleStack');

// 1. define stack props in QuicksightExampleStack
// 2. pass stack props to QuicksightExampleStack
// 3. make them available in the stack
// 4. name it something along quicksight account arn
// 5. use it getContext here and find out how to pass context with the cli. error out if context is missing
// 6. document how to set up the stack
