from aws_cdk import aws_events as events, aws_lambda as lambda_, cdk


class LambdaCronStack(cdk.Stack):
    def __init__(self, app: cdk.App, id: str) -> None:
        super().__init__(app, id)

        with open("lambda-handler.py", encoding="utf8") as fp:
            handler_code = fp.read()

        lambdaFn = lambda_.Function(
            self,
            "Singleton",
            code=lambda_.InlineCode(handler_code),
            handler="index.main",
            timeout=300,
            runtime=lambda_.Runtime.PYTHON27,
        )

        # Run every day at 6PM UTC
        # See https://docs.aws.amazon.com/lambda/latest/dg/tutorial-scheduled-events-schedule-expressions.html
        rule = events.EventRule(
            self, "Rule", schedule_expression="cron(0 18 ? * MON-FRI *)"
        )
        rule.add_target(lambdaFn)


app = cdk.App()
LambdaCronStack(app, "LambdaCronExample")
app.run()
