from aws_cdk.core import App, Construct, Duration
from aws_cdk import aws_dynamodb, aws_lambda, aws_apigateway

from waltersco_common import WaltersCoStack

from gengen import GenGen
from cdk_watchful import Watchful


# our main application stack
class UrlShortenerStack(WaltersCoStack):
    def __init__(self, scope: Construct, id: str, **kwarg) -> None:
        super().__init__(scope, id, **kwarg)

        # define the table that maps short codes to URLs.
        table = aws_dynamodb.Table(self, "Table",
                                   partition_key=aws_dynamodb.Attribute(
                                       name="id",
                                       type=aws_dynamodb.AttributeType.STRING),
                                   read_capacity=10,
                                   write_capacity=5)

        # define the API gateway request handler. all API requests will go to the same function.
        handler = aws_lambda.Function(self, "UrlShortenerFunction",
                                      code=aws_lambda.Code.asset("./lambda"),
                                      handler="handler.main",
                                      timeout=Duration.minutes(5),
                                      runtime=aws_lambda.Runtime.PYTHON_3_7)

        # pass the table name to the handler through an environment variable and grant
        # the handler read/write permissions on the table.
        handler.add_environment('TABLE_NAME', table.table_name)
        table.grant_read_write_data(handler)

        # define the API endpoint and associate the handler
        api = aws_apigateway.LambdaRestApi(self, "UrlShortenerApi",
                                           handler=handler)

        # map go.waltersco.co to this api gateway endpoint
        # the domain name is a shared resource that can be accessed through the API in WaltersCoStack
        # NOTE: you can comment this out if you want to bypass the domain name mapping
        self.map_waltersco_subdomain('go', api)

        # define a Watchful monitoring system and watch the entire scope
        # this will automatically find all watchable resources and add
        # them to our dashboard
        wf = Watchful(self, 'watchful', alarm_email='your@email.com')
        wf.watch_scope(self)


# separate stack that includes the traffic generator
class TrafficGeneratorStack(WaltersCoStack):
    def __init__(self, scope: Construct, id: str):
        super().__init__(scope, id)

        # define a traffic generator instance that hits the URL at 5 TPS
        # and hosted within the shared waltersco VPC
        GenGen(self, 'generator',
               url='https://yourdomain.com/eb4628b6',
               tps=5,
               vpc=self.waltersco_vpc)


app = App()
UrlShortenerStack(app, "urlshort-app")
TrafficGeneratorStack(app, 'urlshort-load-test')

app.synth()
