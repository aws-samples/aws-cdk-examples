import {Context, HTTPRequest, NONERequest, util} from '@aws-appsync/utils'


export function request(ctx: Context<any>): NONERequest {
    const id = ctx.arguments.id
    return {
        payload: {
            id: id,
            title: "Buy groceries",
            completed: false,
            createdAt: "2023-08-24T09:12:44.609Z",
            completedAt: null
        }
    };
}

export function response(ctx: Context<any>) {
    console.log("Context: " + ctx);
    const { error, result } = ctx;
    if (error) {
        console.log("Error detected: " + error.message)
        return util.appendError(error.message, error.type, result);
    }
    return ctx.result;
}
