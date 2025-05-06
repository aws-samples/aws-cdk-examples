#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { SsmDocumentAssociationStack } from '../lib/ssm-document-association-stack';

const app = new cdk.App();
new SsmDocumentAssociationStack(app, 'SsmDocumentAssociationStack');