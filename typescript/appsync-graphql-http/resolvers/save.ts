import { util } from "@aws-appsync/utils";

export function request(ctx: any) {
  return {
    method: "POST",
    resourcePath: "/posts",
    params: {
      headers: {
        "content-type": "Application/json",
      },
      body: ctx.args.postInput,
    },
  };
}

export function response(ctx: any) {
  const { result } = ctx;

  if (result.statusCode !== 201) {
    return util.appendError(result.body, `${result.statusCode}`);
  }

  const body = JSON.parse(result.body);
  return body;
}
