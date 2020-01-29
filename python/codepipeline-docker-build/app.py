from aws_cdk import (
    core,
)

from Base import Base
from Pipeline import Pipeline

props = {'namespace': 'cdk-example-pipeline'}
app = core.App()

# stack for ecr, bucket, codebuild
base = Base(app, f"{props['namespace']}-base", props)

# pipeline stack
pipeline = Pipeline(app, f"{props['namespace']}-pipeline", base.outputs)
pipeline.add_dependency(base)
app.synth()
