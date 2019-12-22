#!/usr/bin/env node
import cdk = require('@aws-cdk/core');
import { ApplicationStack } from '../lib/application-stack';
import { InfrastructureStack } from '../lib/infrastructure-stack';

const app = new cdk.App();
const infra = new InfrastructureStack(app, "InfrastructureStack");

// We can now reference the myMainLambda property of the infra object.

const myApp = new ApplicationStack(app, 'ApplicationStack', {
    baseFunction: infra.myMainLambda
});