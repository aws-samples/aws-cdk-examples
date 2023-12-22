import { util } from "@aws-appsync/utils";

export function request(_ctx: any) {
  return {
    method: "GET",
    resourcePath: "/posts",
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
