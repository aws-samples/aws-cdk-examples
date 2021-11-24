import { LambdaIntegration, MethodLoggingLevel, RestApi } from "@aws-cdk/aws-apigateway"
import { PolicyStatement } from "@aws-cdk/aws-iam"
import { Function, Runtime, AssetCode, Code } from "@aws-cdk/aws-lambda"
import { Construct, Duration, Stack, StackProps } from "@aws-cdk/core"
import s3 = require("@aws-cdk/aws-s3")

interface LambdaApiStackProps extends StackProps {
    functionName: string
}

export class CDKExampleLambdaApiStack extends Stack {
    private restApi: RestApi
    private lambdaFunction: Function
    private bucket: s3.Bucket

    constructor(scope: Construct, id: string, props: LambdaApiStackProps) {
        super(scope, id, props)

        this.bucket = new s3.Bucket(this, "WidgetStore")

        this.restApi = new RestApi(this, this.stackName + "RestApi", {
            deployOptions: {
                stageName: "beta",
                metricsEnabled: true,
                loggingLevel: MethodLoggingLevel.INFO,
                dataTraceEnabled: true,
            },
        })

        const lambdaPolicy = new PolicyStatement()
        lambdaPolicy.addActions("s3:ListBucket")
        lambdaPolicy.addResources(this.bucket.bucketArn)

        this.lambdaFunction = new Function(this, props.functionName, {
            functionName: props.functionName,
            handler: "handler.handler",
            runtime: Runtime.NODEJS_10_X,
            code: new AssetCode(`./src`),
            memorySize: 512,
            timeout: Duration.seconds(10),
            environment: {
                BUCKET: this.bucket.bucketName,
            },
            initialPolicy: [lambdaPolicy],
        })

        this.restApi.root.addMethod("GET", new LambdaIntegration(this.lambdaFunction, {}))
    }
}
