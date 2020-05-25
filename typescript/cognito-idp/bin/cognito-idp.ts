#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from '@aws-cdk/core';
import { CognitoIdpStack } from '../lib/cognito-idp-stack';
import * as util from '../functions/util';

require('dotenv').config();

const region = util.getEnv('AWS_REGION');
const account = util.getEnv('AWS_ACCOUNT');

const app = new cdk.App();
const stack = new CognitoIdpStack(app, 'CognitoIdpStack', {
    env: {
        account,
        region
    }
});
