#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from '@aws-cdk/core';
import { CognitoIdpStack, CognitoIdpStackProps } from '../lib/cognito-idp-stack';
import * as util from '../functions/util';

require('dotenv').config();

// TODO - We need a more idiomatic way to handle environment variables, 
// but for now we will at least collect them all here so that the 
// rest of the project does not need to know how we loaded them.

const props: CognitoIdpStackProps = {
    env: {
        account: util.getEnv('AWS_ACCOUNT'),
        region: util.getEnv('AWS_REGION')
    }, 
    webDomainName: util.getEnv('WEB_DOMAIN'),
    webCertificateArn: util.getEnv('WEB_CERTIFICATE_ARN'), 
    facebookSecretArn: util.getEnv('FACEBOOK_SECRET_ARN'),
    facebookAppId: util.getEnv('FACEBOOK_APP_ID'),
    apiDomainName: util.getEnv('API_DOMAIN'),
    apiCertificateArn: util.getEnv('API_CERTIFICATE_ARN'), 
    cognitoRedirectUri: util.getEnv('COGNITO_REDIRECT_URI'),
    facebookApiVersion: util.getEnv('FACEBOOK_VERSION')
};

const app = new cdk.App();
const stack = new CognitoIdpStack(app, 'CognitoIdpStack', props);
