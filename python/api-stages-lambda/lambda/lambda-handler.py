import json

def handler(event, context):

    func_arn = context.invoked_function_arn
    func_alias = func_arn.rsplit(':', 1)[-1]

    try:
        api_stage = event['stageVariables']['lambdaAlias']
    except KeyError:
        return {
            'statusCode': 404,
            'body': json.dumps({
                'msg': "Invalid API path."
            })
        }

    return {
        'statusCode': 200,
        'body': json.dumps({
            'msg': f"Congrats! You've successfully hit the {api_stage} API Stage and the {func_alias} Lambda Alias.",
            "apiStage": api_stage,
            "lambdaAlias": func_alias
        })
    }