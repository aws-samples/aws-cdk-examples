from aws_cdk import core

from waf_regional   import WafRegionalStack
from waf_cloudfront import WafCloudFrontStack

app = core.App()
env = {'region': 'us-east-1'}

WafRegionalStack(app,   "WafRegionalStack",   env=env)
WafCloudFrontStack(app, "WafCloudFrontStack", env=env)

app.synth()
