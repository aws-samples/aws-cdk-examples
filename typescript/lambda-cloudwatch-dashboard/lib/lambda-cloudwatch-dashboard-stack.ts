import { Duration, Stack, StackProps, CfnOutput, Aws } from "aws-cdk-lib";
import { GraphWidget, Dashboard, LogQueryWidget, TextWidget } from 'aws-cdk-lib/aws-cloudwatch';
import { Function, Runtime, AssetCode } from "aws-cdk-lib/aws-lambda";
import { Construct } from 'constructs';

interface LambdaCloudwatchDashboardStackProps extends StackProps {
  dashboardName: string
}

export class LambdaCloudwatchDashboardStack extends Stack {
  private lambdaFunction: Function
  private dashboard: Dashboard

  constructor(scope: Construct, id: string, props: LambdaCloudwatchDashboardStackProps) {
    super(scope, id, props);

    // Create Sample Lambda Function which will create metrics
    this.lambdaFunction = new Function(this, "SampleLambda", {
      handler: "lambda-handler.handler",
      runtime: Runtime.PYTHON_3_7,
      code: new AssetCode(`./lambda`),
      memorySize: 512,
      timeout: Duration.seconds(10)
    })

    // Create CloudWatch Dashboard
    this.dashboard = new Dashboard(this, "SampleLambdaDashboard", {
      dashboardName: props.dashboardName
    })

    // Create Title for Dashboard
    this.dashboard.addWidgets(new TextWidget({
      markdown: `# Dashboard: ${this.lambdaFunction.functionName}`,
      height: 1,
      width: 24
    }))

    // Create CloudWatch Dashboard Widgets: Errors, Invocations, Duration, Throttles
    this.dashboard.addWidgets(new GraphWidget({
      title: "Invocations",
      left: [this.lambdaFunction.metricInvocations()],
      width: 24
    }))

    this.dashboard.addWidgets(new GraphWidget({
      title: "Errors",
      left: [this.lambdaFunction.metricErrors()],
      width: 24
    }))

    this.dashboard.addWidgets(new GraphWidget({
      title: "Duration",
      left: [this.lambdaFunction.metricDuration()],
      width: 24
    }))

    this.dashboard.addWidgets(new GraphWidget({
      title: "Throttles",
      left: [this.lambdaFunction.metricThrottles()],
      width: 24
    }))

    // Create Widget to show last 20 Log Entries
    this.dashboard.addWidgets(new LogQueryWidget({
      logGroupNames: [this.lambdaFunction.logGroup.logGroupName],
      queryLines:[
        "fields @timestamp, @message",
        "sort @timestamp desc",
        "limit 20"],
      width: 24,
      }))

    // Generate Outputs
    const cloudwatchDashboardURL = `https://${Aws.REGION}.console.aws.amazon.com/cloudwatch/home?region=${Aws.REGION}#dashboards:name=${props.dashboardName}`;
    new CfnOutput(this, 'DashboardOutput', {
      value: cloudwatchDashboardURL,
      description: 'URL of Sample CloudWatch Dashboard',
      exportName: 'SampleCloudWatchDashboardURL'
    });
    new CfnOutput(this, 'LambdaName', {
      value: this.lambdaFunction.functionName,
      description: 'Name of the sample Lambda Function',
      exportName: 'LambdaName'
    });
  };
}
