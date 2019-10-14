from aws_cdk import (
    core,
)

from Base import Base
from Pipeline import Pipeline


# using props to pass in objects between stacks
class Props():
    def __init__(self):
        self.namespace = 'cdk-example-pipeline'
        self.region = 'us-east-1'


props = Props()
app = core.App()

# stack for ecr, bucket, codebuild
base = Base(app, f"{props.namespace}-base", props, )
props = base.outputs

# pipeline stack
pipeline = Pipeline(app, f"{props.namespace}-pipeline", props)
pipeline.add_dependency(base)
app.synth()
