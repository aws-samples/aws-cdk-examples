// snippet-comment:[These are tags for the AWS doc team's sample catalog. Do not remove.]
// snippet-comment:[This should be in the lib/ directory]
// snippet-comment:[and only works with my_widget_service.ts in the bin/ directory]
// snippet-comment:[and widgets.js in the resources/ directory.]
// snippet-sourceauthor:[Doug-AWS]
// snippet-sourcedescription:[Creates an S3 bucket, handler for HTTP requests, and API Gateway to Lambda functions.]
// snippet-keyword:[CDK V0.24.1]
// snippet-keyword:[ApiGateway.LambdaIntegration function]
// snippet-keyword:[ApiGateway.RestApi function]
// snippet-keyword:[Bucket.grantReadWrite function]
// snippet-keyword:[Lambda.Function function]
// snippet-keyword:[S3.Bucket function]
// snippet-keyword:[TypeScript]
// snippet-service:[cdk]
// snippet-keyword:[Code Sample]
// snippet-sourcetype:[full-example]
// snippet-sourcedate:[2019-2-8]
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
// snippet-start:[cdk.typescript.widget_service]
import cdk = require("aws-cdk-lib");
import apigateway = require("aws-cdk-lib/aws-apigateway");
import lambda = require("aws-cdk-lib/aws-lambda");
import s3 = require("aws-cdk-lib/aws-s3");
import { Construct } from 'constructs';

export class WidgetService extends Construct {
  constructor(scope: Construct, id: string) {
    super(scope, id);

    const bucket = new s3.Bucket(this, "WidgetStore", {
      // The default removal policy is RETAIN, which means that cdk destroy will not attempt to delete
      // the new bucket, and it will remain in your account until manually deleted. By setting the policy to
      // DESTROY, cdk destroy will attempt to delete the bucket, but will error if the bucket is not empty.
      removalPolicy: cdk.RemovalPolicy.DESTROY, // NOT recommended for production code
    });

    const handler = new lambda.Function(this, "WidgetHandler", {
      runtime: lambda.Runtime.NODEJS_16_X, // So we can use async in widget.js
      code: lambda.AssetCode.fromAsset("resources"),
      handler: "widgets.main",
      environment: {
        BUCKET: bucket.bucketName
      }
    });

    bucket.grantReadWrite(handler); // was: handler.role);

    const api = new apigateway.RestApi(this, "widgets-api", {
      restApiName: "Widget Service",
      description: "This service serves widgets."
    });

    const getWidgetsIntegration = new apigateway.LambdaIntegration(handler, {
      requestTemplates: { "application/json": '{ "statusCode": "200" }' }
    });

    api.root.addMethod("GET", getWidgetsIntegration); // GET /

    // snippet-start:[cdk.typescript.widget_service.wire_up_functions]
    const widget = api.root.addResource("{id}");

    // Add new widget to bucket with: POST /{id}
    const postWidgetIntegration = new apigateway.LambdaIntegration(handler);

    // Get a specific widget from bucket with: GET /{id}
    const getWidgetIntegration = new apigateway.LambdaIntegration(handler);

    // Remove a specific widget from the bucket with: DELETE /{id}
    const deleteWidgetIntegration = new apigateway.LambdaIntegration(handler);

    widget.addMethod("POST", postWidgetIntegration); // POST /{id}
    widget.addMethod("GET", getWidgetIntegration); // GET /{id}
    widget.addMethod("DELETE", deleteWidgetIntegration); // DELETE /{id}
    // snippet-end:[cdk.typescript.widget_service.wire_up_functions]
  }
}
// snippet-end:[cdk.typescript.widget_service]
