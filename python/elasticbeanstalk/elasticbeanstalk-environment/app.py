#!/usr/bin/env python3

from aws_cdk import core

from elasticbeanstalk_environment.elasticbeanstalk_environment_stack import(
    ElasticbeanstalkEnvironmentStack
)


app = core.App()
ElasticbeanstalkEnvironmentStack(app, "ElasticBeanstalk")

app.synth()
