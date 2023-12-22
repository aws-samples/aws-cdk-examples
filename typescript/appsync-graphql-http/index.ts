import * as cdk from "aws-cdk-lib";
import {
  CfnGraphQLApi,
  CfnApiKey,
  CfnGraphQLSchema,
  CfnDataSource,
  CfnResolver,
} from "aws-cdk-lib/aws-appsync";
import { Construct } from "constructs";
import { readFileSync } from "fs";

const definition = readFileSync("./definition.graphql", "utf-8");
const getOneCode = readFileSync("./resolvers/getOne.js", "utf-8");
const getAllCode = readFileSync("./resolvers/getAll.js", "utf-8");
const saveCode = readFileSync("./resolvers/save.js", "utf-8");
const deleteCode = readFileSync("./resolvers/delete.js", "utf-8");

export class AppSyncCdkStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const postsGraphQLApi = new CfnGraphQLApi(this, "PostsApiCdk", {
      name: "posts-api-cdk",
      authenticationType: "API_KEY",
    });

    new CfnApiKey(this, "PostsApiKey", {
      apiId: postsGraphQLApi.attrApiId,
    });

    const apiSchema = new CfnGraphQLSchema(this, "PostsSchema", {
      apiId: postsGraphQLApi.attrApiId,
      definition,
    });

    const dataSource = new CfnDataSource(this, "PostsDataSource", {
      apiId: postsGraphQLApi.attrApiId,
      name: "PostsApiDataSource",
      type: "HTTP",
      httpConfig: {
        endpoint: "https://jsonplaceholder.typicode.com",
      },
    });

    const getOneResolver = new CfnResolver(this, "GetOneQueryResolver", {
      apiId: postsGraphQLApi.attrApiId,
      typeName: "Query",
      fieldName: "getOne",
      dataSourceName: dataSource.name,
      runtime: {
        name: "APPSYNC_JS",
        runtimeVersion: "1.0.0",
      },
      code: getOneCode,
    });
    getOneResolver.addDependency(apiSchema);

    const getAllResolver = new CfnResolver(this, "GetAllQueryResolver", {
      apiId: postsGraphQLApi.attrApiId,
      typeName: "Query",
      fieldName: "all",
      dataSourceName: dataSource.name,
      runtime: {
        name: "APPSYNC_JS",
        runtimeVersion: "1.0.0",
      },
      code: getAllCode,
    });
    getAllResolver.addDependency(apiSchema);

    const saveResolver = new CfnResolver(this, "SaveMutationResolver", {
      apiId: postsGraphQLApi.attrApiId,
      typeName: "Mutation",
      fieldName: "save",
      dataSourceName: dataSource.name,
      runtime: {
        name: "APPSYNC_JS",
        runtimeVersion: "1.0.0",
      },
      code: saveCode,
    });
    saveResolver.addDependency(apiSchema);

    const deleteResolver = new CfnResolver(this, "DeleteMutationResolver", {
      apiId: postsGraphQLApi.attrApiId,
      typeName: "Mutation",
      fieldName: "delete",
      dataSourceName: dataSource.name,
      runtime: {
        name: "APPSYNC_JS",
        runtimeVersion: "1.0.0",
      },
      code: deleteCode,
    });
    deleteResolver.addDependency(apiSchema);
  }
}

const app = new cdk.App();
new AppSyncCdkStack(app, "AppSyncGraphQLHTTPExample");
app.synth();
