#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import * as widget_service from './widget_service';
export class MyWidgetServiceStack extends cdk.Stack {
    constructor(scope: cdk.App, id: string, props?: cdk.StackProps) {
      super(scope, id, props);
  
      new widget_service.WidgetService(this, 'Widgets');
    }
  }

const app = new cdk.App();
new MyWidgetServiceStack(app, 'MyWidgetServiceStack');
app.synth();
