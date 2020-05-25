import { expect as expectCDK, matchTemplate, MatchStyle } from '@aws-cdk/assert';
import * as cdk from '@aws-cdk/core';
import { handler } from '../functions/unit';
import { APIGatewayEvent } from 'aws-lambda';
import * as util from '../functions/util';
import { Log } from '../functions/util';
require('dotenv').config();

/**
 * Unit Tests.
 * 
 * These tests are run locally, before deployment.
 * 
 * These tests should not connect to any external resources.
 * 
 * @group unit
 */

// Suppress console.error from lambda handler code
Log.IsTest = true;

 test('util getEnv', () => {
    expect(() => {util.getEnv('This key does not exist')}).toThrowError();
    expect(util.getEnv('This key also does not exist', 'abc')).toEqual('abc');
 });

test('Lambda handler works', async () => {
    let resp = await handler({ 
        path: 'succeed', 
        httpMethod: 'GET', 
        queryStringParameters: null, 
        body: 'abc'
    } as APIGatewayEvent);
    expect(resp.statusCode).toBe(200);

    resp = await handler({ 
        path: 'fail', 
        httpMethod: 'GET', 
        queryStringParameters: null, 
        body: 'abc'
    } as APIGatewayEvent);
    expect(resp.statusCode).toBeGreaterThanOrEqual(400);
});