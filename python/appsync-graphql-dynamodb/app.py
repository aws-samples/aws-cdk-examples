#!/usr/bin/env python3

from aws_cdk import App

from app_sync_cdk.app_sync_cdk_stack import AppSyncCdkStack


app = App()
AppSyncCdkStack(app, "AppSyncGraphQLDynamoDBExample")

app.synth()
