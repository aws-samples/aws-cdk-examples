import aws_cdk as cdk

from athena_s3_glue.athena_s3_glue_stack import AthenaS3GlueStack

app = cdk.App()

demo_stack = AthenaS3GlueStack(app, "DemoAthenaS3GlueStack")

cdk.Tags.of(demo_stack).add(key='project', value='demo-athena-s3-glue')

app.synth()
