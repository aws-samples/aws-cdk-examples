import { Database } from '../functions/database';
import * as aws from 'aws-sdk';

require('dotenv').config();

const db = new Database(new aws.DynamoDB());

// tslint:disable-next-line: no-floating-promises
db.userSave({
    'username': 'admin', 
    'firstName': 'Admin', 
    'lastName': 'Istrator',
    'emailAddress': 'admin@example.com'
});

