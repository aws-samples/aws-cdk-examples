require('dotenv').config();
import { ApiHandlerTests } from './api-handler-tests';

/**
 * REST API Integration Tests.
 * 
 * Calls the deployed REST API using a configured endpoint URL.
 * 
 * You need to create a .env file run this (See Readme).
 * 
 * @group api
 */

const tests = new ApiHandlerTests(false);

test('users', async () => {
    await tests.users();
});
