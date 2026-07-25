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
exports.ApiGatewayParallelStepFunctionsStack = void 0;
const ec2 = __importStar(require("aws-cdk-lib/aws-ec2"));
const lambda = __importStar(require("aws-cdk-lib/aws-lambda"));
const apigateway = __importStar(require("aws-cdk-lib/aws-apigateway"));
const stepFunctions = __importStar(require("aws-cdk-lib/aws-stepfunctions"));
const tasks = __importStar(require("aws-cdk-lib/aws-stepfunctions-tasks"));
const logs = __importStar(require("aws-cdk-lib/aws-logs"));
const cdk = __importStar(require("aws-cdk-lib"));
const path = __importStar(require("path"));
class ApiGatewayParallelStepFunctionsStack extends cdk.Stack {
    constructor(scope, id) {
        super(scope, id);
        const { vpc: vpcLambda } = new VpcNestedStack(this, 'nested-stack-lambda');
        const lambdaFunction1 = new lambda.Function(this, 'lambda-function-1', {
            runtime: lambda.Runtime.NODEJS_24_X,
            vpc: vpcLambda,
            vpcSubnets: {
                subnetType: ec2.SubnetType.PRIVATE_ISOLATED,
            },
            memorySize: 128,
            timeout: cdk.Duration.seconds(5),
            handler: 'index.main',
            code: lambda.Code.fromAsset(path.join(__dirname, '/my-lambda-1')),
            environment: {
                VPC_CIDR: vpcLambda.vpcCidrBlock,
                VPC_ID: vpcLambda.vpcId,
            },
            logRetention: logs.RetentionDays.ONE_DAY,
        });
        const lambdaFunction2 = new lambda.Function(this, 'lambda-function-2', {
            runtime: lambda.Runtime.NODEJS_24_X,
            vpc: vpcLambda,
            vpcSubnets: {
                subnetType: ec2.SubnetType.PRIVATE_ISOLATED,
            },
            memorySize: 128,
            timeout: cdk.Duration.seconds(10),
            handler: 'index.main',
            code: lambda.Code.fromAsset(path.join(__dirname, '/my-lambda-2')),
            environment: {
                VPC_CIDR: vpcLambda.vpcCidrBlock,
                VPC_ID: vpcLambda.vpcId,
            },
            logRetention: logs.RetentionDays.ONE_DAY,
        });
        // Do 2 different jobs in parallel
        const parallel = new stepFunctions.Parallel(this, 'two-jobs', {
            resultPath: '$.CombinedOutput'
        })
            .branch(new MyJob(this, 'quick-job', {
            lambdaFunction: lambdaFunction1,
        }).prefixStates())
            .branch(new MyJob(this, 'slow-job', {
            lambdaFunction: lambdaFunction2,
        }).prefixStates());
        const merge = new stepFunctions.Pass(this, 'merge-outcomes', {
            parameters: {
                'normal.$': '$.CombinedOutput[0].Payload.body',
                'fast.$': '$.CombinedOutput[1].Payload.body',
            },
        });
        parallel.next(merge);
        const stfLogGroup = new logs.LogGroup(this, 'stepfunctions-loggroup');
        const stateMachine = new stepFunctions.StateMachine(this, 'my-state-machine', {
            definitionBody: stepFunctions.DefinitionBody.fromChainable(parallel),
            stateMachineType: stepFunctions.StateMachineType.EXPRESS,
            logs: {
                destination: stfLogGroup,
                level: stepFunctions.LogLevel.ALL,
            },
        });
        const api = new apigateway.StepFunctionsRestApi(this, 'my-api', {
            stateMachine,
            description: 'example api gateway',
            deployOptions: {
                stageName: 'dev',
            }
        });
        const items = api.root.addResource('messages');
        items.addMethod('GET');
    }
}
exports.ApiGatewayParallelStepFunctionsStack = ApiGatewayParallelStepFunctionsStack;
class VpcNestedStack extends cdk.NestedStack {
    vpc;
    constructor(scope, id, props) {
        super(scope, id, props);
        this.vpc = new ec2.Vpc(this, 'nested-stack-vpc', {
            ipAddresses: ec2.IpAddresses.cidr('10.0.0.0/16'),
            natGateways: 0,
            maxAzs: 3,
            subnetConfiguration: [
                {
                    name: 'public-subnet-1',
                    subnetType: ec2.SubnetType.PUBLIC,
                    cidrMask: 24,
                },
                // 👇 added private isolated subnets
                {
                    name: 'private-isolated-subnet-1',
                    subnetType: ec2.SubnetType.PRIVATE_ISOLATED,
                    cidrMask: 24,
                },
            ]
        });
    }
}
class MyJob extends stepFunctions.StateMachineFragment {
    startState;
    endStates;
    constructor(parent, id, props) {
        super(parent, id);
        this.startState = new tasks.LambdaInvoke(this, 'my-lambda-task', {
            lambdaFunction: props.lambdaFunction
        });
    }
}
const app = new cdk.App();
new ApiGatewayParallelStepFunctionsStack(app, 'apigateway-parallel-stepfunctions-stack-2');
app.synth();
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJpbmRleC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFBQSxNQUFZLEdBQUcsZ0RBQTRCO0FBQzNDLE1BQVksTUFBTSxtREFBK0I7QUFDakQsTUFBWSxVQUFVLHVEQUFtQztBQUN6RCxNQUFZLGFBQWEsMERBQXNDO0FBQy9ELE1BQVksS0FBSyxnRUFBNEM7QUFDN0QsTUFBWSxJQUFJLGlEQUE2QjtBQUM3QyxNQUFZLEdBQUcsd0NBQW9CO0FBQ25DLE1BQVksSUFBSSxpQ0FBYTtBQUc3QiwwQ0FBa0QsU0FBUSxHQUFHLENBQUMsS0FBSztJQUNqRSxZQUFZLEtBQWdCLEVBQUUsRUFBVTtRQUN0QyxLQUFLLENBQUMsS0FBSyxFQUFFLEVBQUUsQ0FBQyxDQUFDO1FBRWpCLE1BQU0sRUFBRSxHQUFHLEVBQUUsU0FBUyxFQUFFLEdBQUcsSUFBSSxjQUFjLENBQUMsSUFBSSxFQUFFLHFCQUFxQixDQUFDLENBQUM7UUFFM0UsTUFBTSxlQUFlLEdBQUcsSUFBSSxNQUFNLENBQUMsUUFBUSxDQUFDLElBQUksRUFBRSxtQkFBbUIsRUFBRTtZQUNyRSxPQUFPLEVBQUUsTUFBTSxDQUFDLE9BQU8sQ0FBQyxXQUFXO1lBQ25DLEdBQUcsRUFBRSxTQUFTO1lBQ2QsVUFBVSxFQUFFO2dCQUNWLFVBQVUsRUFBRSxHQUFHLENBQUMsVUFBVSxDQUFDLGdCQUFnQjthQUM1QztZQUNELFVBQVUsRUFBRSxHQUFHO1lBQ2YsT0FBTyxFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQztZQUNoQyxPQUFPLEVBQUUsWUFBWTtZQUNyQixJQUFJLEVBQUUsTUFBTSxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxTQUFTLEVBQUUsY0FBYyxDQUFDLENBQUM7WUFDakUsV0FBVyxFQUFFO2dCQUNYLFFB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QUFvQyxDQUN0QyxHQUFHLEVBQ0gsMkNBQTJDLENBQzVDLENBQUE7QUFDRCxHQUFHLENBQUMsS0FBSyxFQUFFLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgKiBhcyBlYzIgZnJvbSAnYXdzLWNkay1saWIvYXdzLWVjMic7XG5pbXBvcnQgKiBhcyBsYW1iZGEgZnJvbSAnYXdzLWNkay1saWIvYXdzLWxhbWJkYSc7XG5pbXBvcnQgKiBhcyBhcGlnYXRld2F5IGZyb20gJ2F3cy1jZGstbGliL2F3cy1hcGlnYXRld2F5JztcbmltcG9ydCAqIGFzIHN0ZXBGdW5jdGlvbnMgZnJvbSAnYXdzLWNkay1saWIvYXdzLXN0ZXBmdW5jdGlvbnMnO1xuaW1wb3J0ICogYXMgdGFza3MgZnJvbSAnYXdzLWNkay1saWIvYXdzLXN0ZXBmdW5jdGlvbnMtdGFza3MnO1xuaW1wb3J0ICogYXMgbG9ncyBmcm9tICdhd3MtY2RrLWxpYi9hd3MtbG9ncyc7XG5pbXBvcnQgKiBhcyBjZGsgZnJvbSAnYXdzLWNkay1saWInO1xuaW1wb3J0ICogYXMgcGF0aCBmcm9tICdwYXRoJztcbmltcG9ydCB7IENvbnN0cnVjdCB9IGZyb20gJ2NvbnN0cnVjdHMnO1xuXG5leHBvcnQgY2xhc3MgQXBpR2F0ZXdheVBhcmFsbGVsU3RlcEZ1bmN0aW9uc1N0YWNrIGV4dGVuZHMgY2RrLlN0YWNrIHtcbiAgY29uc3RydWN0b3Ioc2NvcGU6IENvbnN0cnVjdCwgaWQ6IHN0cmluZykge1xuICAgIHN1cGVyKHNjb3BlLCBpZCk7XG5cbiAgICBjb25zdCB7IHZwYzogdnBjTGFtYmRhIH0gPSBuZXcgVnBjTmVzdGVkU3RhY2sodGhpcywgJ25lc3RlZC1zdGFjay1sYW1iZGEnKTtcblxuICAgIGNvbnN0IGxhbWJkYUZ1bmN0aW9uMSA9IG5ldyBsYW1iZGEuRnVuY3Rpb24odGhpcywgJ2xhbWJkYS1mdW5jdGlvbi0xJywge1xuICAgICAgcnVudGltZTogbGFtYmRhLlJ1bnRpbWUuTk9ERUpTXzI0X1gsXG4gICAgICB2cGM6IHZwY0xhbWJkYSxcbiAgICAgIHZwY1N1Ym5ldHM6IHtcbiAgICAgICAgc3VibmV0VHlwZTogZWMyLlN1Ym5ldFR5cGUuUFJJVkFURV9JU09MQVRFRCxcbiAgICAgIH0sXG4gICAgICBtZW1vcnlTaXplOiAxMjgsXG4gICAgICB0aW1lb3V0OiBjZGsuRHVyYXRpb24uc2Vjb25kcyg1KSxcbiAgICAgIGhhbmRsZXI6ICdpbmRleC5tYWluJyxcbiAgICAgIGNvZGU6IGxhbWJkYS5Db2RlLmZyb21Bc3NldChwYXRoLmpvaW4oX19kaXJuYW1lLCAnL215LWxhbWJkYS0xJykpLFxuICAgICAgZW52aXJvbm1lbnQ6IHtcbiAgICAgICAgVlBDX0NJRFI6IHZwY0xhbWJkYS52cGNDaWRyQmxvY2ssXG4gICAgICAgIFZQQ19JRDogdnBjTGFtYmRhLnZwY0lkLFxuICAgICAgfSxcbiAgICAgIGxvZ1JldGVudGlvbjogbG9ncy5SZXRlbnRpb25EYXlzLk9ORV9EQVksXG4gICAgfSlcblxuICAgIGNvbnN0IGxhbWJkYUZ1bmN0aW9uMiA9IG5ldyBsYW1iZGEuRnVuY3Rpb24odGhpcywgJ2xhbWJkYS1mdW5jdGlvbi0yJywge1xuICAgICAgcnVudGltZTogbGFtYmRhLlJ1bnRpbWUuTk9ERUpTXzI0X1gsXG4gICAgICB2cGM6IHZwY0xhbWJkYSxcbiAgICAgIHZwY1N1Ym5ldHM6IHtcbiAgICAgICAgc3VibmV0VHlwZTogZWMyLlN1Ym5ldFR5cGUuUFJJVkFURV9JU09MQVRFRCxcbiAgICAgIH0sXG4gICAgICBtZW1vcnlTaXplOiAxMjgsXG4gICAgICB0aW1lb3V0OiBjZGsuRHVyYXRpb24uc2Vjb25kcygxMCksXG4gICAgICBoYW5kbGVyOiAnaW5kZXgubWFpbicsXG4gICAgICBjb2RlOiBsYW1iZGEuQ29kZS5mcm9tQXNzZXQocGF0aC5qb2luKF9fZGlybmFtZSwgJy9teS1sYW1iZGEtMicpKSxcbiAgICAgIGVudmlyb25tZW50OiB7XG4gICAgICAgIFZQQ19DSURSOiB2cGNMYW1iZGEudnBjQ2lkckJsb2NrLFxuICAgICAgICBWUENfSUQ6IHZwY0xhbWJkYS52cGNJZCxcbiAgICAgIH0sXG4gICAgICBsb2dSZXRlbnRpb246IGxvZ3MuUmV0ZW50aW9uRGF5cy5PTkVfREFZLFxuICAgIH0pXG5cbiAgICAvLyBEbyAyIGRpZmZlcmVudCBqb2JzIGluIHBhcmFsbGVsXG4gICAgY29uc3QgcGFyYWxsZWwgPSBuZXcgc3RlcEZ1bmN0aW9ucy5QYXJhbGxlbCh0aGlzLCAndHdvLWpvYnMnLCB7XG4gICAgICByZXN1bHRQYXRoOiAnJC5Db21iaW5lZE91dHB1dCdcbiAgICB9KVxuICAgICAgLmJyYW5jaChcbiAgICAgICAgbmV3IE15Sm9iKHRoaXMsICdxdWljay1qb2InLCB7XG4gICAgICAgICAgbGFtYmRhRnVuY3Rpb246IGxhbWJkYUZ1bmN0aW9uMSxcbiAgICAgICAgfSkucHJlZml4U3RhdGVzKClcbiAgICAgIClcbiAgICAgIC5icmFuY2goXG4gICAgICAgIG5ldyBNeUpvYih0aGlzLCAnc2xvdy1qb2InLCB7XG4gICAgICAgICAgbGFtYmRhRnVuY3Rpb246IGxhbWJkYUZ1bmN0aW9uMixcbiAgICAgICAgfSkucHJlZml4U3RhdGVzKClcbiAgICAgICk7XG5cbiAgICBjb25zdCBtZXJnZSA9IG5ldyBzdGVwRnVuY3Rpb25zLlBhc3ModGhpcywgJ21lcmdlLW91dGNvbWVzJywge1xuICAgICAgcGFyYW1ldGVyczoge1xuICAgICAgICAnbm9ybWFsLiQnOiAnJC5Db21iaW5lZE91dHB1dFswXS5QYXlsb2FkLmJvZHknLFxuICAgICAgICAnZmFzdC4kJzogJyQuQ29tYmluZWRPdXRwdXRbMV0uUGF5bG9hZC5ib2R5JyxcbiAgICAgIH0sXG4gICAgfSk7XG5cbiAgICBwYXJhbGxlbC5uZXh0KG1lcmdlKTtcblxuICAgIGNvbnN0IHN0ZkxvZ0dyb3VwID0gbmV3IGxvZ3MuTG9nR3JvdXAodGhpcywgJ3N0ZXBmdW5jdGlvbnMtbG9nZ3JvdXAnKTtcbiAgICBjb25zdCBzdGF0ZU1hY2hpbmUgPSBuZXcgc3RlcEZ1bmN0aW9ucy5TdGF0ZU1hY2hpbmUoXG4gICAgICB0aGlzLFxuICAgICAgJ215LXN0YXRlLW1hY2hpbmUnLFxuICAgICAge1xuICAgICAgICBkZWZpbml0aW9uQm9keTogc3RlcEZ1bmN0aW9ucy5EZWZpbml0aW9uQm9keS5mcm9tQ2hhaW5hYmxlKHBhcmFsbGVsKSxcbiAgICAgICAgc3RhdGVNYWNoaW5lVHlwZTogc3RlcEZ1bmN0aW9ucy5TdGF0ZU1hY2hpbmVUeXBlLkVYUFJFU1MsXG4gICAgICAgIGxvZ3M6IHtcbiAgICAgICAgICBkZXN0aW5hdGlvbjogc3RmTG9nR3JvdXAsXG4gICAgICAgICAgbGV2ZWw6IHN0ZXBGdW5jdGlvbnMuTG9nTGV2ZWwuQUxMLFxuICAgICAgICB9LFxuICAgICAgfVxuICAgIClcblxuICAgIGNvbnN0IGFwaSA9IG5ldyBhcGlnYXRld2F5LlN0ZXBGdW5jdGlvbnNSZXN0QXBpKHRoaXMsICdteS1hcGknLCB7XG4gICAgICBzdGF0ZU1hY2hpbmUsXG4gICAgICBkZXNjcmlwdGlvbjogJ2V4YW1wbGUgYXBpIGdhdGV3YXknLFxuICAgICAgZGVwbG95T3B0aW9uczoge1xuICAgICAgICBzdGFnZU5hbWU6ICdkZXYnLFxuICAgICAgfVxuICAgIH0pO1xuXG4gICAgY29uc3QgaXRlbXMgPSBhcGkucm9vdC5hZGRSZXNvdXJjZSgnbWVzc2FnZXMnKTtcbiAgICBpdGVtcy5hZGRNZXRob2QoJ0dFVCcpO1xuICB9XG59XG5cbmNsYXNzIFZwY05lc3RlZFN0YWNrIGV4dGVuZHMgY2RrLk5lc3RlZFN0YWNrIHtcbiAgcHVibGljIHJlYWRvbmx5IHZwYzogZWMyLlZwYztcblxuICBjb25zdHJ1Y3RvcihzY29wZTogQ29uc3RydWN0LCBpZDogc3RyaW5nLCBwcm9wcz86IGNkay5OZXN0ZWRTdGFja1Byb3BzKSB7XG4gICAgc3VwZXIoc2NvcGUsIGlkLCBwcm9wcyk7XG5cbiAgICB0aGlzLnZwYyA9IG5ldyBlYzIuVnBjKHRoaXMsICduZXN0ZWQtc3RhY2stdnBjJywge1xuICAgICAgaXBBZGRyZXNzZXM6IGVjMi5JcEFkZHJlc3Nlcy5jaWRyKCcxMC4wLjAuMC8xNicpLFxuICAgICAgbmF0R2F0ZXdheXM6IDAsXG4gICAgICBtYXhBenM6IDMsXG4gICAgICBzdWJuZXRDb25maWd1cmF0aW9uOiBbXG4gICAgICAgIHtcbiAgICAgICAgICBuYW1lOiAncHVibGljLXN1Ym5ldC0xJyxcbiAgICAgICAgICBzdWJuZXRUeXBlOiBlYzIuU3VibmV0VHlwZS5QVUJMSUMsXG4gICAgICAgICAgY2lkck1hc2s6IDI0LFxuICAgICAgICB9LFxuICAgICAgICAvLyDwn5GHIGFkZGVkIHByaXZhdGUgaXNvbGF0ZWQgc3VibmV0c1xuICAgICAgICB7XG4gICAgICAgICAgbmFtZTogJ3ByaXZhdGUtaXNvbGF0ZWQtc3VibmV0LTEnLFxuICAgICAgICAgIHN1Ym5ldFR5cGU6IGVjMi5TdWJuZXRUeXBlLlBSSVZBVEVfSVNPTEFURUQsXG4gICAgICAgICAgY2lkck1hc2s6IDI0LFxuICAgICAgICB9LFxuICAgICAgXVxuICAgIH0pO1xuICB9XG59XG5cbmNsYXNzIE15Sm9iIGV4dGVuZHMgc3RlcEZ1bmN0aW9ucy5TdGF0ZU1hY2hpbmVGcmFnbWVudCB7XG4gIHB1YmxpYyByZWFkb25seSBzdGFydFN0YXRlOiBzdGVwRnVuY3Rpb25zLlN0YXRlO1xuICBwdWJsaWMgcmVhZG9ubHkgZW5kU3RhdGVzOiBzdGVwRnVuY3Rpb25zLklOZXh0YWJsZVtdO1xuXG4gIGNvbnN0cnVjdG9yKHBhcmVudDogQ29uc3RydWN0LCBpZDogc3RyaW5nLCBwcm9wczogYW55KSB7XG4gICAgc3VwZXIocGFyZW50LCBpZCk7XG5cbiAgICB0aGlzLnN0YXJ0U3RhdGUgPSBuZXcgdGFza3MuTGFtYmRhSW52b2tlKHRoaXMsICdteS1sYW1iZGEtdGFzaycsIHtcbiAgICAgIGxhbWJkYUZ1bmN0aW9uOiBwcm9wcy5sYW1iZGFGdW5jdGlvblxuICAgIH0pO1xuICB9XG59XG5cbmNvbnN0IGFwcCA9IG5ldyBjZGsuQXBwKCk7XG5uZXcgQXBpR2F0ZXdheVBhcmFsbGVsU3RlcEZ1bmN0aW9uc1N0YWNrKFxuICBhcHAsXG4gICdhcGlnYXRld2F5LXBhcmFsbGVsLXN0ZXBmdW5jdGlvbnMtc3RhY2stMidcbilcbmFwcC5zeW50aCgpO1xuIl19