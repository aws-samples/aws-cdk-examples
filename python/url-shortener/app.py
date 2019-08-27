from aws_cdk.core import App, Construct, Duration, Stack
from aws_cdk import (
    aws_dynamodb,
    aws_lambda,
    aws_apigateway)

from waltersco_common import WaltersCoStack
from gengen import GenGen
from cdk_watchful import Watchful


class UrlShortenerStack(WaltersCoStack):
    def __init__(self, scope: Construct, id: str, **kwarg) -> None:
        super().__init__(scope, id, **kwarg)

        table = aws_dynamodb.Table(self, "Table",
                                   partition_key=aws_dynamodb.Attribute(
                                       name="id",
                                       type=aws_dynamodb.AttributeType.STRING),
                                   read_capacity=10,
                                   write_capacity=5)

        handler = aws_lambda.Function(self, "UrlShortenerFunction",
                                      code=aws_lambda.Code.asset("./lambda"),
                                      handler="handler.main",
                                      timeout=Duration.minutes(5),
                                      runtime=aws_lambda.Runtime.PYTHON_3_7)

        handler.add_environment('TABLE_NAME', table.table_name)
        table.grant_read_write_data(handler)

        api = aws_apigateway.LambdaRestApi(self, "UrlShortenerApi",
                                           handler=handler)

        self.map_waltersco_subdomain('go', api)

        wf = Watchful(self, 'watchful', alarm_email='benisrae@amazon.com')
        wf.watch_scope(self)


class TrafficGeneratorStack(WaltersCoStack):
    def __init__(self, scope: Construct, id: str):
        super().__init__(scope, id)

        GenGen(self, 'generator',
               url='https://go.waltersco.co/75e12779',
               tps=5,
               vpc=self.waltersco_vpc)


app = App()
UrlShortenerStack(app, "UrlShortenerStack")
TrafficGeneratorStack(app, 'traffic')


app.synth()
