import { Context, APIGatewayEvent } from "aws-lambda";

export async function handler(
    _event: APIGatewayEvent,
    _context: Context
) {
    return {
        body: 'Healthy',
        statusCode: '200'
    }
}
