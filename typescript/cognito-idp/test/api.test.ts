import { ApiHandlerTests } from './api-handler-tests';

/**
 * REST API Integration Tests.
 * 
 * Calls the deployed REST API using a configured endpoint URL.
 * 
 * To run this test, you need to add a JWT idToken to your config/env-local.json
 * 
 * To get the JWT, log in to the web site and view console logs. Also make sure 
 * to manually add is_super_admin=true to the DynamoDB record for your user account.
 * 
 * @group api
 */

const tests = new ApiHandlerTests(false);

test('users', async () => {
    await tests.users();
});
