#!/usr/bin/env node

import * as cdk from 'aws-cdk-lib';
import { QuicksightCodeStack } from '../lib/quicksight-code-stack';
// import { QuicksightCicdStack } from '../lib/quicksight-cicd-stack';


const app = new cdk.App();
// Creating a new CDK application instance

// new QuicksightCicdStack(app, 'quicksight-cicd-stack');
new QuicksightCodeStack(app, 'quicksight-code-stack'); 
// Instantiating a new stack (QuicksightCicdStack) and adding it to the CDK application
// The stack is given the identifier 'quicksight-cicd-stack'
