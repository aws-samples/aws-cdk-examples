import { util } from '@aws-appsync/utils';

/**
 * Queries a DynamoDB table, limits the number of returned items, and paginates with the provided `nextToken`
 * @param {import('@aws-appsync/utils').Context<{id: string; limit?: number; nextToken?:string}>} ctx the context
 * @returns {import('@aws-appsync/utils').DynamoDBQueryRequest} the request
 * defect-by-licenseplate
 */
export function request(ctx) {
    const limit = 20;
    const query = JSON.parse(
        util.transform.toDynamoDBConditionExpression({
            licenseplate: { eq: ctx.source.licenseplate },
        }),
    );

    return { operation: 'Query',  index: 'defect-by-licenseplate', query, limit };
}

/**
 * Returns the query items
 * @param {import('@aws-appsync/utils').Context} ctx the context
 * @returns {[*]} a flat list of result items
 */
export function response(ctx) {
    if (ctx.error) {
        util.error(ctx.error.message, ctx.error.type);
    }
    return ctx.result.items;
}
