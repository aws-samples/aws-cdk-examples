import { expect as expectCDK, matchTemplate, MatchStyle } from '@aws-cdk/assert';
import * as cdk from '@aws-cdk/core';
import { handler } from '../lambda/unit';
import { APIGatewayEvent } from 'aws-lambda';
import { Database } from '../lambda/database';
import * as AWS from 'aws-sdk';
import * as uuid from 'uuid';
import { User } from '../lambda/entities/user';
import * as util from '../lambda/util';
import { CognitoIdpStackProps } from '../lib/cognito-idp-stack';

// tslint:disable-next-line: no-var-requires
const config:CognitoIdpStackProps = require('../config/env-local.json');
process.env.AWS_REGION = config.env?.region;
process.env.AWS_ACCOUNT = config.env?.account;

/**
 * Database Tests.
 *
 * These tests use the Database class to make calls directly to 
 * DynamoDB and S3.
 *
 * You need to create a .env file to run this.
 *
 * @group database
 */

const db = new Database(new AWS.DynamoDB(), config.userTable);

// TODO - Ensure admin user

/**
 * This expects the 'admin' user to be created already.
 */
test('user get', async () => {
    const users = await db.usersGet();
    expect(users).toBeDefined();
    expect(users.length).toBeGreaterThan(0);
    expect(users[0].id).toBeDefined();
    expect(users[0].username).toBeDefined();

    const id = users[0].id;

    const user = await db.userGet(id);
    expect(user).toBeDefined();
    expect(user?.emailAddress).toEqual(users[0].emailAddress);
});

test('user save', async () => {

    const testId = uuid.v4();

    const user = new User();
    user.emailAddress = `test-${testId}@example.org`;
    user.firstName = `TestF-${testId}`;
    user.lastName = `TestL-${testId}`;
    user.username = `test-${testId}`;

    const id = await db.userSave(user);
    expect(id).toBeTruthy();
    const userId = id as string;

    const user2 = await db.userGet(id as string);
    expect(user2?.emailAddress).toEqual(user.emailAddress);
    expect(user2?.createdOn).toBeDefined();

    // Try to save a duplicate user
    user.id = '';
    const dupId = await db.userSave(user);
    expect(dupId).toBeFalsy();

    // Make sure updates work
    const newEmail = `test-changed-${testId}@example.org`;
    user.emailAddress = newEmail;
    user.id = userId;
    const newId = await db.userSave(user);
    expect(newId).toEqual(userId);
    const updatedUser = await db.userGet(userId);
    expect(updatedUser?.emailAddress).toEqual(newEmail);
    expect(updatedUser?.updatedOn).toBeDefined();

    // Make sure we can get a user by username
    expect((await db.userGetByUsername(user.username))?.emailAddress).toEqual(user.emailAddress);

    // Clean up
    await db.userDelete(userId);
    const deleted = await db.userGet(userId);
    expect(deleted).toBeFalsy();

});
