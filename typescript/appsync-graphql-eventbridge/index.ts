import cdk = require("aws-cdk-lib");
import {
  CfnGraphQLApi,
  CfnApiKey,
  CfnGraphQLSchema,
  CfnDataSource,
  CfnResolver
} from "aws-cdk-lib/aws-appsync";
import { Role, ServicePrincipal, PolicyStatement } from "aws-cdk-lib/aws-iam";
import { Rule } from "aws-cdk-lib/aws-events";
import lambda = require("aws-cdk-lib/aws-lambda");
import targets = require("aws-cdk-lib/aws-events-targets");
import { Construct } from 'constructs';

export class AppSyncCdkStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const appSync2EventBridgeGraphQLApi = new CfnGraphQLApi(
      this,
      "AppSync2EventBridgeApi",
      {
        name: "AppSync2EventBridge-API",
        authenticationType: "API_KEY"
      }
    );

    new CfnApiKey(this, "AppSync2EventBridgeApiKey", {
      apiId: appSync2EventBridgeGraphQLApi.attrApiId
    });

    const apiSchema = new CfnGraphQLSchema(this, "ItemsSchema", {
      apiId: appSync2EventBridgeGraphQLApi.attrApiId,
      definition: `type Event {
        result: String
      }

      type Mutation {
        putEvent(event: String!): Event
      }

      type Query {
        getEvent: Event
      }

      schema {
        query: Query
        mutation: Mutation
      }`
    });

    const appsyncEventBridgeRole = new Role(this, "AppSyncEventBridgeRole", {
      assumedBy: new ServicePrincipal("appsync.amazonaws.com")
    });

    appsyncEventBridgeRole.addToPolicy(
      new PolicyStatement({
        resources: ["*"],
        actions: ["events:Put*"]
      })
    );

    const dataSource = new CfnDataSource(this, "ItemsDataSource", {
      apiId: appSync2EventBridgeGraphQLApi.attrApiId,
      name: "EventBridgeDataSource",
      type: "HTTP",
      httpConfig: {
        authorizationConfig: {
          authorizationType: "AWS_IAM",
          awsIamConfig: {
            signingRegion: this.region,
            signingServiceName: "events"
          }
        },
        endpoint: "https://events." + this.region + ".amazonaws.com/"
      },
      serviceRoleArn: appsyncEventBridgeRole.roleArn
    });

    const putEventResolver = new CfnResolver(this, "PutEventMutationResolver", {
      apiId: appSync2EventBridgeGraphQLApi.attrApiId,
      typeName: "Mutation",
      fieldName: "putEvent",
      dataSourceName: dataSource.name,
      requestMappingTemplate: `{
        "version": "2018-05-29",
        "method": "POST",
        "resourcePath": "/",
        "params": {
          "headers": {
            "content-type": "application/x-amz-json-1.1",
            "x-amz-target":"AWSEvents.PutEvents"
          },
          "body": {
            "Entries":[
              {
                "Source":"appsync",
                "EventBusName": "default",
                "Detail":"{ \\\"event\\\": \\\"$ctx.arguments.event\\\"}",
                "DetailType":"Event Bridge via GraphQL"
               }
            ]
          }
        }
      }`,
      responseMappingTemplate: `## Raise a GraphQL field error in case of a datasource invocation error
      #if($ctx.error)
        $util.error($ctx.error.message, $ctx.error.type)
      #end
      ## if the response status code is not 200, then return an error. Else return the body **
      #if($ctx.result.statusCode == 200)
          ## If response is 200, return the body.
          {
            "result": "$util.parseJson($ctx.result.body)"
          }
      #else
          ## If response is not 200, append the response to error block.
          $utils.appendError($ctx.result.body, $ctx.result.statusCode)
      #end`
    });
    putEventResolver.addDependency(apiSchema);

    const echoLambda = new lambda.Function(this, "echoFunction", {
      code: lambda.Code.fromInline(
        "exports.handler = (event, context) => { console.log(event); context.succeed(event); }"
      ),
      handler: "index.handler",
      runtime: lambda.Runtime.NODEJS_LATEST
    });

    const rule = new Rule(this, "AppSyncEventBridgeRle", {
      eventPattern: {
        source: ["appsync"]
      }
    });
    rule.addTarget(new targets.LambdaFunction(echoLambda));
  }
}

const app = new cdk.App();
new AppSyncCdkStack(app, "AppSyncEventBridge");
app.synth();
