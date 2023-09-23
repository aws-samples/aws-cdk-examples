import * as cdk from 'aws-cdk-lib';
import { GatewayLambdaAuth } from '../lib/stack/gateway-lambda-auth-stack';

const app = new cdk.App();
new GatewayLambdaAuth(app, 'gateway-lambda-auth-stack', {
    env :{
        account: process.env.CDK_DEFAULT_ACCOUNT, 
        region: process.env.CDK_DEFAULT_REGION
    }
});
