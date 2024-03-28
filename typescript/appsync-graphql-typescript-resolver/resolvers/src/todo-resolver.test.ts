// @ts-nocheck
// TODO do we want strict TS checking ? Find out if we can mock parts of Context
import {request} from "./todo-resolver";
import {Context} from "@aws-appsync/utils";

test('returns get with right ID', () => {
    const id = 1;
    const context: Context = {
        arguments: { id: id },
        identity: null,
        args: null,
        source: null,
        info: null,
        stash: null,
        result: null,
        prev: null,
        request: null
    }
    const result = request(context)
    expect(result).toEqual({
        payload: {
            id: id,
            title: "Buy groceries",
            completed: false,
            createdAt: "2023-08-24T09:12:44.609Z",
            completedAt: null
        }
    });
});
