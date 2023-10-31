import { util } from "@aws-appsync/utils";

export function request(ctx: any) {
  return {
    method: "DELETE",
    resourcePath: `/posts/${ctx.args.id}`,
    params: {
      headers: {
        "content-type": "Application/json",
      },
    },
  };
}

export function response(ctx: any) {
  const { result } = ctx;

  if (result.statusCode !== 200) {
    return util.appendError(result.body, `${result.statusCode}`);
  }

  const body = JSON.parse(result.body);
  return body;
}
