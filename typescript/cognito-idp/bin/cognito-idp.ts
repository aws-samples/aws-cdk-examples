#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from '@aws-cdk/core';
import { CognitoIdpStack } from '../lib/cognito-idp-stack';

const app = new cdk.App();
const stack = new CognitoIdpStack(app, 'CognitoIdpStack');
