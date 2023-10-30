import { Context, APIGatewayTokenAuthorizerEvent, Callback } from "aws-lambda";

export const handler = function (event: APIGatewayTokenAuthorizerEvent, context: Context, callback: Callback) {
    var token = event.authorizationToken;
    switch (token) {
        case 'allow':
            callback(null, generatePolicy('user', 'Allow', event.methodArn));
            break;
        case 'deny':
            callback(null, generatePolicy('user', 'Deny', event.methodArn));
            break;
        case 'unauthorized':
            callback("Unauthorized");   // Return a 401 Unauthorized response
            break;
        default:
            callback("Error: Invalid token"); // Return a 500 Invalid token response
    }
};

var generatePolicy = function (principalId: string, effect: string, resource: string) {
    return {
        principalId: principalId,
        policyDocument: {
            Statement: [{
                Action: 'execute-api:Invoke',
                Effect: effect,
                Resource: resource
            }],
            Version: '2012-10-17'
        }
    };
}
