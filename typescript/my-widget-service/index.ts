// Copyright 2010-2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
//
// This file is licensed under the Apache License, Version 2.0 (the "License").
// You may not use this file except in compliance with the License. A copy of the
// License is located at
//
// http://aws.amazon.com/apache2.0/
//
// This file is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS
// OF ANY KIND, either express or implied. See the License for the specific
// language governing permissions and limitations under the License.

import cdk = require('@aws-cdk/cdk');
import widget_service = require('./widget_service');

export class MyWidgetServiceStack extends cdk.Stack {
    constructor(scope: cdk.App, id: string, props?: cdk.StackProps) {
      super(scope, id, props);
  
      new widget_service.WidgetService(this, 'Widgets');
    }
  }

const app = new cdk.App();
new MyWidgetServiceStack(app, 'MyWidgetServiceStack');
app.run();
