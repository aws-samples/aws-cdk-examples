from urllib import request
from json import dumps, loads


def main(event, context):
    # Instead of calling the Evidently API to determine the feature variation, we call the AppConfig extension that we
    # added to our Lambda function. This layer is essentially a local server we can call in place of the API.
    # By default, the AppConfig extension runs on port 2772. This is configurable:
    # https://docs.aws.amazon.com/appconfig/latest/userguide/appconfig-integration-lambda-extensions.html#w97aac17b7c21c21
    body = {'entityId': 'someUserId'}
    req = request.Request('http://localhost:2772/projects/EvidentlyExampleProject/evaluations/MyExampleFeature', data=dumps(body).encode())
    evaluation = loads(request.urlopen(req).read())
    return evaluation
