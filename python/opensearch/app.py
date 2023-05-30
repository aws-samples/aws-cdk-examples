from aws_cdk import App
from opensearch.opensearch_stack import OpenSearchStack

app = App()
OpenSearchStack(app, "opensearch-stack-demo")
app.synth()
