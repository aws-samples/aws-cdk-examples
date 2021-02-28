#!/usr/bin/env node
import * as cdk from '@aws-cdk/core';
import { SecretsManagerCustomRotationStack } from '../lib/secrets-manager-custom-rotation-stack';

const app = new cdk.App();
new SecretsManagerCustomRotationStack(app, 'SecretsManagerCustomRotationStack');
