const { VerifiedPermissions } = require('@aws-sdk/client-verifiedpermissions');
const policyStoreId = process.env.POLICY_STORE_ID;
const namespace = process.env.NAMESPACE;
const tokenType = process.env.TOKEN_TYPE;
const resourceType = `${namespace}::Application`;
const resourceId = namespace;
const actionType = `${namespace}::Action`;

const verifiedpermissions = !!process.env.ENDPOINT
    ? new VerifiedPermissions({
        endpoint: `https://${process.env.ENDPOINT}ford.${process.env.AWS_REGION}.amazonaws.com`,
    })
    : new VerifiedPermissions();

function getContextMap(event) {
    const hasPathParameters = Object.keys(event.pathParameters).length > 0;
    const hasQueryString = Object.keys(event.queryStringParameters).length > 0;
    if (!hasPathParameters && !hasQueryString) {
        return undefined;
    }
    const pathParametersObj = !hasPathParameters ? {} : {
        pathParameters: {
            // transform regular map into smithy format
            record: Object.keys(event.pathParameters).reduce((acc, pathParamKey) => {
                return {
                    ...acc,
                    [pathParamKey]: {
                        string: event.pathParameters[pathParamKey]
                    }
                }
            }, {}),
        }
    };
    const queryStringObj = !hasQueryString ? {} : {
        queryStringParameters: {
            // transform regular map into smithy format
            record: Object.keys(event.queryStringParameters).reduce((acc, queryParamKey) => {
                return {
                    ...acc,
                    [queryParamKey]: {
                        string: event.queryStringParameters[queryParamKey]
                    }
                }
            }, {}),
        }
    };
    return {
        contextMap: {
            ...queryStringObj,
            ...pathParametersObj,
        }
    };
}

async function handler(event, context) {
    // https://docs.aws.amazon.com/apigateway/latest/developerguide/api-gateway-known-issues.html
    // > Header names and query parameters are processed in a case-sensitive way.
    // https://www.rfc-editor.org/rfc/rfc7540#section-8.1.2
    // > header field names MUST be converted to lowercase prior to their encoding in HTTP/2
    // curl defaults to HTTP/2
    let bearerToken =
        event.headers?.Authorization || event.headers?.authorization;
    if (bearerToken?.toLowerCase().startsWith('bearer ')) {
        // per https://www.rfc-editor.org/rfc/rfc6750#section-2.1 "Authorization" header should contain:
        //  "Bearer" 1*SP b64token
        // however, match behavior of COGNITO_USER_POOLS authorizer allowing "Bearer" to be optional
        bearerToken = bearerToken.split(' ')[1];
    }
    try {
        const parsedToken = JSON.parse(Buffer.from(bearerToken.split('.')[1], 'base64').toString());
        const actionId = `${event.requestContext.httpMethod.toLowerCase()} ${event.requestContext.resourcePath}`;

        const input = {
            [tokenType]: bearerToken,
            policyStoreId: policyStoreId,
            action: {
                actionType: actionType,
                actionId: actionId,
            },
            resource: {
                entityType: resourceType,
                entityId: resourceId
            },
            context: getContextMap(event),
        };

        const authResponse = await verifiedpermissions.isAuthorizedWithToken(input);
        console.log('Decision from AVP:', authResponse.decision);
        let principalId = `${parsedToken.iss.split('/')[3]}|${parsedToken.sub}`;
        if (authResponse.principal) {
            const principalEidObj = authResponse.principal;
            principalId = `${principalEidObj.entityType}::"${principalEidObj.entityId}"`;
        }

        return {
            principalId,
            policyDocument: {
                Version: '2012-10-17',
                Statement: [
                    {
                        Action: 'execute-api:Invoke',
                        Effect: authResponse.decision.toUpperCase() === 'ALLOW' ? 'Allow' : 'Deny',
                        Resource: event.methodArn
                    }
                ]
            },
            context: {
                actionId,
            }
        }
    } catch (e) {
        console.log('Error: ', e);
        return {
            principalId: '',
            policyDocument: {
                Version: '2012-10-17',
                Statement: [
                    {
                        Action: 'execute-api:Invoke',
                        Effect: 'Deny',
                        Resource: event.methodArn
                    }
                ]
            },
            context: {}
        }
    }
}

module.exports = {
    handler,
};
