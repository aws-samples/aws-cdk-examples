import * as cdk from 'aws-cdk-lib';
import { GraphWidget, IWidget, Metric, Dashboard, MathExpression } from "aws-cdk-lib/aws-cloudwatch";
import { Duration } from "aws-cdk-lib";
import { Construct } from "constructs";

export class CodewhispererDashboardStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Set up a CloudWatch dashboard that shows CodeWhisperer metrics
    const dashboard = new Dashboard(this, "cw-dashboard", {
        dashboardName: "CodeWhisperer-Metrics"
    });

    // Replicate all widgets for these languages
    const languages = ["Python", "Java", "JavaScript", "TypeScript"];

    for (const language of languages) {

        // Create a metric for accept
        const m1 = new Metric({
            metricName: "InvocationCount", 
            namespace: "AWS/CodeWhisperer", 
            dimensionsMap: {
                "SuggestionState": "ACCEPT", 
                "CompletionType": "BLOCK", 
                "ProgrammingLanguage": language.toLowerCase() 
            },
            statistic: "Sum", 
            label: "Accept", 
            period: Duration.seconds(300)
        });

        // Create a metric for reject
        const m2 = new Metric({
            metricName: "InvocationCount", 
            namespace: "AWS/CodeWhisperer", 
            dimensionsMap: {
                "SuggestionState": "REJECT", 
                "CompletionType": "BLOCK", 
                "ProgrammingLanguage": language.toLowerCase() 
            },
            statistic: "Sum", 
            label: "Reject", 
            period: Duration.seconds(300)
        });

        // Create an expression for accept rate 
        const rate = new MathExpression({
            label: "Block Accept Rate", 
            expression: "100*m1/(m1+m2)",
            usingMetrics: {
                "m1": m1, 
                "m2": m2
            }
        });

        // Create a widget to display accept, reject, and rate
        const w1 = new GraphWidget({
            width: 6, 
            title: language, 
            left: [ m1, m2, rate ]
        });

        dashboard.addWidgets(w1);
    }
  }
}
