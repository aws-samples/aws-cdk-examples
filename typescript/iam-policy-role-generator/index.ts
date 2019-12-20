#!/usr/bin/env node

import cdk = require('@aws-cdk/core');
import { IamPolicyGeneratorStack } from './IamPolicyGeneratorStack';
import { IamRoleGeneratorStack } from './IamRoleGeneratorStack';

const app = new cdk.App();
const policyGenerator = new IamPolicyGeneratorStack(app, 'IamPolicyGeneratorStack');

const roleGenerator = new IamRoleGeneratorStack(app, 'IamRoleGeneratorStack');
roleGenerator.addDependency(policyGenerator);
app.synth();
