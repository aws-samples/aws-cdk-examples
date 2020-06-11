#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from '@aws-cdk/core';
import { CognitoIdpStack, CognitoIdpStackProps } from '../lib/cognito-idp-stack';
import * as fs from 'fs-extra';

// Load environment configuration.
//
// For local development, create a copy of config/env.json called config/env-local.json

const localConfigPath = './config/env-local.json';
let configPath = '../config/env.json';
if (fs.existsSync(localConfigPath)) {
    configPath = '.' + localConfigPath; // require and fs resolve paths differently
}

// tslint:disable-next-line: no-var-requires
const props: CognitoIdpStackProps = require(configPath);

const app = new cdk.App();
const stack = new CognitoIdpStack(app, 'CognitoIdpStack', props);
