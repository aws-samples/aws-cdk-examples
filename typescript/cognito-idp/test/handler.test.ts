import { ApiHandlerTests } from './api-handler-tests';

/**
 * Lambda Handler Tests.
 * 
 * Calls the local handler code to test lambda functions without 
 * actually making REST API calls to API Gateway.
 * 
 * @group handler
 */

const tests = new ApiHandlerTests(true);

test('users', async () => {
    await tests.users();
});
