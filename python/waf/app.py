from aws_cdk import App

from waf_regional   import WafRegionalStack
from waf_cloudfront import WafCloudFrontStack

app = App()
env = {'region': 'us-east-1'}

WafRegionalStack(app,   "WafRegionalStack",   env=env)
WafCloudFrontStack(app, "WafCloudFrontStack", env=env)

app.synth()
