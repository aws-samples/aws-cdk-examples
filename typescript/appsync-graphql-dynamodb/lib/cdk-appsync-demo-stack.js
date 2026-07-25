"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.CdkAppsyncDemoStack = void 0;
const cdk = __importStar(require("aws-cdk-lib"));
const aws_appsync_1 = require("aws-cdk-lib/aws-appsync");
const aws_dynamodb_1 = require("aws-cdk-lib/aws-dynamodb");
const path = require("path");
class CdkAppsyncDemoStack extends cdk.Stack {
    constructor(scope, id, props) {
        super(scope, id, props);
        // Create DynamoDB tables
        const carsTable = new aws_dynamodb_1.Table(this, 'CarTable', {
            partitionKey: { name: 'licenseplate', type: aws_dynamodb_1.AttributeType.STRING },
            tableName: 'cardata-cars',
            removalPolicy: cdk.RemovalPolicy.DESTROY,
            billingMode: aws_dynamodb_1.BillingMode.PROVISIONED,
            readCapacity: 2,
            writeCapacity: 4
        });
        const defectsTable = new aws_dynamodb_1.Table(this, 'DefectsTable', {
            partitionKey: { name: 'id', type: aws_dynamodb_1.AttributeType.STRING },
            removalPolicy: cdk.RemovalPolicy.DESTROY,
            tableName: 'cardata-defects',
            billingMode: aws_dynamodb_1.BillingMode.PROVISIONED,
            readCapacity: 2,
            writeCapacity: 4
        });
        defectsTable.addGlobalSecondaryIndex({
            indexName: 'defect-by-licenseplate',
            partitionKey: {
                name: 'licenseplate',
                type: aws_dynamodb_1.AttributeType.STRING
            },
            readCapacity: 2,
            writeCapacity: 4,
        });
        const api = new aws_appsync_1.GraphqlApi(this, 'CarApi', {
            name: 'carAPI',
            definition: aws_appsync_1.Definition.fromFile(path.join(__dirname, '../graphql/schema.graphql')),
            authorizationConfig: {
                defaultAuthorization: {
                    authorizationType: aws_appsync_1.AuthorizationType.IAM,
                },
            },
            xrayEnabled: true,
        });
        // Connect DynamoDB tables to the AppSync API as data sources
        const carsDataSource = api.addDynamoDbDataSource('CarsDataSource', carsTable);
        const defectsDataSource = api.addDynamoDbDataSource('DefectsDataSource', defectsTable);
        const carsResolver = new aws_appsync_1.AppsyncFunction(this, 'CarsFunction', {
            name: 'getCars',
            api,
            dataSource: carsDataSource,
            code: aws_appsync_1.Code.fromAsset(path.join(__dirname, '../resolvers/getCar.js')),
            runtime: aws_appsync_1.FunctionRuntime.JS_1_0_0,
        });
        const defectsResolver = new aws_appsync_1.AppsyncFunction(this, 'DefectsFunction', {
            name: 'getDefects',
            api,
            dataSource: defectsDataSource,
            code: aws_appsync_1.Code.fromAsset(path.join(__dirname, '../resolvers/getDefects.js')),
            runtime: aws_appsync_1.FunctionRuntime.JS_1_0_0,
        });
        new aws_appsync_1.Resolver(this, 'PipelineResolverGetCars', {
            api,
            typeName: 'Query',
            fieldName: 'getCar',
            runtime: aws_appsync_1.FunctionRuntime.JS_1_0_0,
            code: aws_appsync_1.Code.fromAsset(path.join(__dirname, '../resolvers/pipeline.js')),
            pipelineConfig: [carsResolver],
        });
        new aws_appsync_1.Resolver(this, 'PipelineResolverGetDefects', {
            api,
            typeName: 'Car',
            fieldName: 'defects',
            runtime: aws_appsync_1.FunctionRuntime.JS_1_0_0,
            code: aws_appsync_1.Code.fromAsset(path.join(__dirname, '../resolvers/pipeline.js')),
            pipelineConfig: [defectsResolver],
        });
    }
}
exports.CdkAppsyncDemoStack = CdkAppsyncDemoStack;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2RrLWFwcHN5bmMtZGVtby1zdGFjay5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbImNkay1hcHBzeW5jLWRlbW8tc3RhY2sudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUEsTUFBWSxHQUFHLHdDQUFvQjtBQUNuQyx5REFBc0k7QUFDdEksMkRBQTZFO0FBRTdFLE1BQU8sSUFBSSxtQkFBbUI7QUFFOUIseUJBQWlDLFNBQVEsR0FBRyxDQUFDLEtBQUs7SUFDaEQsWUFBWSxLQUFnQixFQUFFLEVBQVUsRUFBRSxLQUFzQjtRQUM5RCxLQUFLLENBQUMsS0FBSyxFQUFFLEVBQUUsRUFBRSxLQUFLLENBQUMsQ0FBQztRQUV4Qix5QkFBeUI7UUFDekIsTUFBTSxTQUFTLEdBQUcsSUFBSSxvQkFBSyxDQUFDLElBQUksRUFBRSxVQUFVLEVBQUU7WUFDNUMsWUFBWSxFQUFFLEVBQUUsSUFBSSxFQUFFLGNBQWMsRUFBRSxJQUFJLEVBQUUsNEJBQWEsQ0FBQyxNQUFNLEVBQUU7WUFDbEUsU0FBUyxFQUFFLGNBQWM7WUFDekIsYUFBYSxFQUFFLEdBQUcsQ0FBQyxhQUFhLENBQUMsT0FBTztZQUN4QyxXQUFXLEVBQUUsMEJBQVcsQ0FBQyxXQUFXO1lBQ3BDLFlBQVksRUFBRSxDQUFDO1lBQ2YsYUFBYSxFQUFFLENBQUM7U0FDakIsQ0FBQyxDQUFDO1FBRUgsTUFBTSxZQUFZLEdBQUcsSUFBSSxvQkFBSyxDQUFDLElBQUksRUFBRSxjQUFjLEVBQUU7WUFDbkQsWUFBWSxFQUFFLEVBQUUsSUFBSSxFQUFFLElBQUksRUFBRSxJQUFJLEVBQUUsNEJBQWEsQ0FBQyxNQUFNLEVBQUU7WUFDeEQsYUFBYSxFQUFFLEdBQUcsQ0FBQyxhQUFhLENBQUMsT0FBTztZQUN4QyxTQUFTLEVBQUUsaUJBQWlCO1lBQzVCLFdBQVcsRUFBRSwwQkFBVyxDQUFDLFdBQVc7WUFDcEMsWUFBWSxFQUFFLENBQUM7WUFDZixhQUFhLEVBQUUsQ0FBQztTQUNqQixDQUFDLENBQUM7UUFFSCxZQUFZLENBQUMsdUJBQXVCLENBQUM7WUFDbkMsU0FBUyxFQUFFLHdCQUF3QjtZQUNuQyxZQUFZLEVBQUU7Z0JBQ1osSUFBSSxFQUFFLGNBQWM7Z0JBQ3BCLElBQUksRUFBRSw0QkFBYSxDQUFDLE1BQU07YUFDM0I7WUFDRCxZQUFZLEVBQUUsQ0FBQztZQUNmLGFBQWEsRUFBRSxDQUFDO1NBQ2pCLENBQUMsQ0FBQTtRQUVGLE1BQU0sR0FBRyxHQUFHLElBQUksd0JBQVUsQ0FBQyxJQUFJLEVBQUUsUUFBUSxFQUFFO1lBQ3pDLElBQUksRUFBRSxRQUFRO1lBQ2QsVUFBVSxFQUFFLHdCQUFVLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsU0FBUyxFQUFFLDJCQUEyQixDQUFDLENBQUM7WUFDbEYsbUJBQW1CLEVBQUU7Z0JBQ25CLG9CQUFvQixFQUFFO29CQUNwQixpQkFBaUIsRUFBRSwrQkFBaUIsQ0FBQyxHQUFHO2lCQUN6QzthQUNGO1lBQ0QsV0FBVyxFQUFFLElBQUk7U0FDbEIsQ0FBQyxDQUFDO1FBRUgsNkRBQTZEO1FBQzdELE1BQU0sY0FBYyxHQUFHLEdBQUcsQ0FBQyxxQkFBcUIsQ0FBQyxnQkFBZ0IsRUFBRSxTQUFTLENBQUMsQ0FBQztRQUM5RSxNQUFNLGlCQUFpQixHQUFHLEdBQUcsQ0FBQyxxQkFBcUIsQ0FBQyxtQkFBbUIsRUFBRSxZQUFZLENBQUMsQ0FBQztRQUV2RixNQUFNLFlBQVksR0FBRyxJQUFJLDZCQUFlLENBQUMsSUFBSSxFQUFFLGNBQWMsRUFBRTtZQUM3RCxJQUFJLEVBQUUsU0FBUztZQUNmLEdBQUc7WUFDSCxVQUFVLEVBQUUsY0FBYztZQUMxQixJQUFJLEVBQUUsa0JBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxTQUFTLEVBQUUsd0JBQXdCLENBQUMsQ0FBQztZQUNwRSxPQUFPLEVBQUUsNkJBQWUsQ0FBQyxRQUFRO1NBQ2xDLENBQUMsQ0FBQztRQUVILE1BQU0sZUFBZSxHQUFHLElBQUksNkJBQWUsQ0FBQyxJQUFJLEVBQUUsaUJBQWlCLEVBQUU7WUFDbkUsSUFBSSxFQUFFLFlBQVk7WUFDbEIsR0FBRztZQUNILFVBQVUsRUFBRSxpQkFBaUI7WUFDN0IsSUFBSSxFQUFFLGtCQUFJLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsU0FBUyxFQUFFLDRCQUE0QixDQUFDLENBQUM7WUFDeEUsT0FBTyxFQUFFLDZCQUFlLENBQUMsUUFBUTtTQUNsQyxDQUFDLENBQUM7UUFFSCxJQUFJLHNCQUFRLENBQUMsSUFBSSxFQUFFLHlCQUF5QixFQUFFO1lBQzVDLEdBQUc7WUFDSCxRQUFRLEVBQUUsT0FBTztZQUNqQixTQUFTLEVBQUUsUUFBUTtZQUNuQixPQUFPLEVBQUUsNkJBQWUsQ0FBQyxRQUFRO1lBQ2pDLElBQUksRUFBRSxrQkFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLFNBQVMsRUFBRSwwQkFBMEIsQ0FBQyxDQUFDO1lBQ3RFLGNBQWMsRUFBRSxDQUFDLFlBQVksQ0FBQztTQUMvQixDQUFDLENBQUM7UUFFSCxJQUFJLHNCQUFRLENBQUMsSUFBSSxFQUFFLDRCQUE0QixFQUFFO1lBQy9DLEdBQUc7WUFDSCxRQUFRLEVBQUUsS0FBSztZQUNmLFNBQVMsRUFBRSxTQUFTO1lBQ3BCLE9BQU8sRUFBRSw2QkFBZSxDQUFDLFFBQVE7WUFDakMsSUFBSSxFQUFFLGtCQUFJLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsU0FBUyxFQUFFLDBCQUEwQixDQUFDLENBQUM7WUFDdEUsY0FBYyxFQUFFLENBQUMsZUFBZSxDQUFDO1NBQ2xDLENBQUMsQ0FBQztJQUVMLENBQUM7Q0FDRiIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCAqIGFzIGNkayBmcm9tICdhd3MtY2RrLWxpYic7XG5pbXBvcnQgeyBBcHBzeW5jRnVuY3Rpb24sIEF1dGhvcml6YXRpb25UeXBlLCBDb2RlLCBEZWZpbml0aW9uLCBGdW5jdGlvblJ1bnRpbWUsIEdyYXBocWxBcGksIFJlc29sdmVyIH0gZnJvbSAnYXdzLWNkay1saWIvYXdzLWFwcHN5bmMnO1xuaW1wb3J0IHsgQXR0cmlidXRlVHlwZSwgQmlsbGluZ01vZGUsIFRhYmxlIH0gZnJvbSAnYXdzLWNkay1saWIvYXdzLWR5bmFtb2RiJztcbmltcG9ydCB7IENvbnN0cnVjdCB9IGZyb20gJ2NvbnN0cnVjdHMnO1xuaW1wb3J0IHBhdGggPSByZXF1aXJlKCdwYXRoJyk7XG5cbmV4cG9ydCBjbGFzcyBDZGtBcHBzeW5jRGVtb1N0YWNrIGV4dGVuZHMgY2RrLlN0YWNrIHtcbiAgY29uc3RydWN0b3Ioc2NvcGU6IENvbnN0cnVjdCwgaWQ6IHN0cmluZywgcHJvcHM/OiBjZGsuU3RhY2tQcm9wcykge1xuICAgIHN1cGVyKHNjb3BlLCBpZCwgcHJvcHMpO1xuXG4gICAgLy8gQ3JlYXRlIER5bmFtb0RCIHRhYmxlc1xuICAgIGNvbnN0IGNhcnNUYWJsZSA9IG5ldyBUYWJsZSh0aGlzLCAnQ2FyVGFibGUnLCB7XG4gICAgICBwYXJ0aXRpb25LZXk6IHsgbmFtZTogJ2xpY2Vuc2VwbGF0ZScsIHR5cGU6IEF0dHJpYnV0ZVR5cGUuU1RSSU5HIH0sXG4gICAgICB0YWJsZU5hbWU6ICdjYXJkYXRhLWNhcnMnLFxuICAgICAgcmVtb3ZhbFBvbGljeTogY2RrLlJlbW92YWxQb2xpY3kuREVTVFJPWSxcbiAgICAgIGJpbGxpbmdNb2RlOiBCaWxsaW5nTW9kZS5QUk9WSVNJT05FRCxcbiAgICAgIHJlYWRDYXBhY2l0eTogMixcbiAgICAgIHdyaXRlQ2FwYWNpdHk6IDRcbiAgICB9KTtcblxuICAgIGNvbnN0IGRlZmVjdHNUYWJsZSA9IG5ldyBUYWJsZSh0aGlzLCAnRGVmZWN0c1RhYmxlJywge1xuICAgICAgcGFydGl0aW9uS2V5OiB7IG5hbWU6ICdpZCcsIHR5cGU6IEF0dHJpYnV0ZVR5cGUuU1RSSU5HIH0sXG4gICAgICByZW1vdmFsUG9saWN5OiBjZGsuUmVtb3ZhbFBvbGljeS5ERVNUUk9ZLFxuICAgICAgdGFibGVOYW1lOiAnY2FyZGF0YS1kZWZlY3RzJyxcbiAgICAgIGJpbGxpbmdNb2RlOiBCaWxsaW5nTW9kZS5QUk9WSVNJT05FRCxcbiAgICAgIHJlYWRDYXBhY2l0eTogMixcbiAgICAgIHdyaXRlQ2FwYWNpdHk6IDRcbiAgICB9KTtcblxuICAgIGRlZmVjdHNUYWJsZS5hZGRHbG9iYWxTZWNvbmRhcnlJbmRleCh7XG4gICAgICBpbmRleE5hbWU6ICdkZWZlY3QtYnktbGljZW5zZXBsYXRlJyxcbiAgICAgIHBhcnRpdGlvbktleToge1xuICAgICAgICBuYW1lOiAnbGljZW5zZXBsYXRlJyxcbiAgICAgICAgdHlwZTogQXR0cmlidXRlVHlwZS5TVFJJTkdcbiAgICAgIH0sXG4gICAgICByZWFkQ2FwYWNpdHk6IDIsXG4gICAgICB3cml0ZUNhcGFjaXR5OiA0LFxuICAgIH0pXG5cbiAgICBjb25zdCBhcGkgPSBuZXcgR3JhcGhxbEFwaSh0aGlzLCAnQ2FyQXBpJywge1xuICAgICAgbmFtZTogJ2NhckFQSScsXG4gICAgICBkZWZpbml0aW9uOiBEZWZpbml0aW9uLmZyb21GaWxlKHBhdGguam9pbihfX2Rpcm5hbWUsICcuLi9ncmFwaHFsL3NjaGVtYS5ncmFwaHFsJykpLFxuICAgICAgYXV0aG9yaXphdGlvbkNvbmZpZzoge1xuICAgICAgICBkZWZhdWx0QXV0aG9yaXphdGlvbjoge1xuICAgICAgICAgIGF1dGhvcml6YXRpb25UeXBlOiBBdXRob3JpemF0aW9uVHlwZS5JQU0sXG4gICAgICAgIH0sXG4gICAgICB9LFxuICAgICAgeHJheUVuYWJsZWQ6IHRydWUsXG4gICAgfSk7XG5cbiAgICAvLyBDb25uZWN0IER5bmFtb0RCIHRhYmxlcyB0byB0aGUgQXBwU3luYyBBUEkgYXMgZGF0YSBzb3VyY2VzXG4gICAgY29uc3QgY2Fyc0RhdGFTb3VyY2UgPSBhcGkuYWRkRHluYW1vRGJEYXRhU291cmNlKCdDYXJzRGF0YVNvdXJjZScsIGNhcnNUYWJsZSk7XG4gICAgY29uc3QgZGVmZWN0c0RhdGFTb3VyY2UgPSBhcGkuYWRkRHluYW1vRGJEYXRhU291cmNlKCdEZWZlY3RzRGF0YVNvdXJjZScsIGRlZmVjdHNUYWJsZSk7XG5cbiAgICBjb25zdCBjYXJzUmVzb2x2ZXIgPSBuZXcgQXBwc3luY0Z1bmN0aW9uKHRoaXMsICdDYXJzRnVuY3Rpb24nLCB7XG4gICAgICBuYW1lOiAnZ2V0Q2FycycsXG4gICAgICBhcGksXG4gICAgICBkYXRhU291cmNlOiBjYXJzRGF0YVNvdXJjZSxcbiAgICAgIGNvZGU6IENvZGUuZnJvbUFzc2V0KHBhdGguam9pbihfX2Rpcm5hbWUsICcuLi9yZXNvbHZlcnMvZ2V0Q2FyLmpzJykpLFxuICAgICAgcnVudGltZTogRnVuY3Rpb25SdW50aW1lLkpTXzFfMF8wLFxuICAgIH0pO1xuXG4gICAgY29uc3QgZGVmZWN0c1Jlc29sdmVyID0gbmV3IEFwcHN5bmNGdW5jdGlvbih0aGlzLCAnRGVmZWN0c0Z1bmN0aW9uJywge1xuICAgICAgbmFtZTogJ2dldERlZmVjdHMnLFxuICAgICAgYXBpLFxuICAgICAgZGF0YVNvdXJjZTogZGVmZWN0c0RhdGFTb3VyY2UsXG4gICAgICBjb2RlOiBDb2RlLmZyb21Bc3NldChwYXRoLmpvaW4oX19kaXJuYW1lLCAnLi4vcmVzb2x2ZXJzL2dldERlZmVjdHMuanMnKSksXG4gICAgICBydW50aW1lOiBGdW5jdGlvblJ1bnRpbWUuSlNfMV8wXzAsXG4gICAgfSk7XG5cbiAgICBuZXcgUmVzb2x2ZXIodGhpcywgJ1BpcGVsaW5lUmVzb2x2ZXJHZXRDYXJzJywge1xuICAgICAgYXBpLFxuICAgICAgdHlwZU5hbWU6ICdRdWVyeScsXG4gICAgICBmaWVsZE5hbWU6ICdnZXRDYXInLFxuICAgICAgcnVudGltZTogRnVuY3Rpb25SdW50aW1lLkpTXzFfMF8wLFxuICAgICAgY29kZTogQ29kZS5mcm9tQXNzZXQocGF0aC5qb2luKF9fZGlybmFtZSwgJy4uL3Jlc29sdmVycy9waXBlbGluZS5qcycpKSxcbiAgICAgIHBpcGVsaW5lQ29uZmlnOiBbY2Fyc1Jlc29sdmVyXSxcbiAgICB9KTtcblxuICAgIG5ldyBSZXNvbHZlcih0aGlzLCAnUGlwZWxpbmVSZXNvbHZlckdldERlZmVjdHMnLCB7XG4gICAgICBhcGksXG4gICAgICB0eXBlTmFtZTogJ0NhcicsXG4gICAgICBmaWVsZE5hbWU6ICdkZWZlY3RzJyxcbiAgICAgIHJ1bnRpbWU6IEZ1bmN0aW9uUnVudGltZS5KU18xXzBfMCxcbiAgICAgIGNvZGU6IENvZGUuZnJvbUFzc2V0KHBhdGguam9pbihfX2Rpcm5hbWUsICcuLi9yZXNvbHZlcnMvcGlwZWxpbmUuanMnKSksXG4gICAgICBwaXBlbGluZUNvbmZpZzogW2RlZmVjdHNSZXNvbHZlcl0sXG4gICAgfSk7XG5cbiAgfVxufSJdfQ==