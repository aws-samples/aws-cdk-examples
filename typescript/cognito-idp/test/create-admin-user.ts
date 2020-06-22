import { Database } from '../lambda/database';
import * as aws from 'aws-sdk';
import * as util from '../lambda/util';
import { CognitoIdpStackProps } from '../lib/cognito-idp-stack';

// tslint:disable-next-line: no-var-requires
const config:CognitoIdpStackProps = require('../../config/env-local.json');

process.env.AWS_REGION = config.env?.region;
process.env.AWS_ACCOUNT = config.env?.account;

const db = new Database(new aws.DynamoDB(), config.userTable);

// tslint:disable-next-line: no-floating-promises
db.userSave({
    'username': 'admin', 
    'firstName': 'Admin', 
    'lastName': 'Istrator',
    'emailAddress': 'admin@example.com'
});

