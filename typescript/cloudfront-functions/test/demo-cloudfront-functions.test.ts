import {Match, Template} from "aws-cdk-lib/assertions";
import * as cdk from "aws-cdk-lib";
import {DemoCloudfrontFunctionsStack} from "../lib/demo-cloudfront-functions-stack";


test('Synthesizes the stack properly ', () => {
  const app = new cdk.App();
  const functionsStack = new DemoCloudfrontFunctionsStack(app, 'functions-stack');
  const template = Template.fromStack(functionsStack);

  template.resourceCountIs('AWS::S3::Bucket', 1)
  template.resourceCountIs('AWS::CloudFront::Function', 2);

  template.resourcePropertiesCountIs('AWS::CloudFront::Function', Match.objectLike({
    "Name": "RequestFunction",
  }), 1);

  template.resourcePropertiesCountIs('AWS::CloudFront::Function', Match.objectLike({
    "Name": "ResponseFunction",
  }), 1);

  template.resourcePropertiesCountIs('AWS::CloudFront::Distribution', {
    "DistributionConfig": Match.objectLike({
      "DefaultCacheBehavior": Match.objectLike({
        "FunctionAssociations": [
          {
            "EventType": "viewer-request",
            "FunctionARN": Match.anyValue()
          },
          {
            "EventType": "viewer-response",
            "FunctionARN": Match.anyValue()
          }
        ]
      })
    })
  }, 1);
});
