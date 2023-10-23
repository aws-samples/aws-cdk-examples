import * as cdk from 'aws-cdk-lib';
import { GraphWidget, IWidget, Metric, Dashboard, MathExpression } from "aws-cdk-lib/aws-cloudwatch";
import { Duration } from "aws-cdk-lib";
import { Construct } from "constructs";

export class CodewhispererDashboardStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Set up a CloudWatch dashboard that shows CodeWhisperer metrics
    const dashboard = new Dashboard(this, "cw-dashboard", {
        dashboardName: "CodeWhisperer-AcceptRates"
    });

    // Replicate all widgets for these languages
    const languages = ["Python", "Java", "JavaScript", "TypeScript"];

    function createInvocationMetric(
        language: string, completionType: string, accept: boolean) {

        return new Metric({
            metricName: "InvocationCount", 
            namespace: "AWS/CodeWhisperer", 
            dimensionsMap: {
                "SuggestionState": accept ? "ACCEPT" : "REJECT", 
                "CompletionType": completionType, 
                "ProgrammingLanguage": language.toLowerCase() 
            },
            statistic: "Sum", 
            label: completionType + " Accept", 
            period: Duration.seconds(300)
        });
    }

    for (const language of languages) {

        // Create a metric for block accept
        const m1 = createInvocationMetric(language, "BLOCK", true)

        // Create a metric for block reject
        const m2 = createInvocationMetric(language, "BLOCK", false)

        // Create a metric for line accept
        const m3 = createInvocationMetric(language, "LINE", true)

        // Create a metric for line reject
        const m4 = createInvocationMetric(language, "LINE", false)

        // Create an expression for accept rate 
        const blockRate = new MathExpression({
            label: "Block Accept Rate", 
            expression: "100*m1/(m1+m2)",
            usingMetrics: {
                "m1": m1, 
                "m2": m2
            }
        });

        const lineRate = new MathExpression({
            label: "Line Accept Rate", 
            expression: "100*m3/(m3+m4)",
            usingMetrics: {
                "m3": m3, 
                "m4": m4
            }
        });

        // Create a widget to display block accepts and rejects
        const w1 = new GraphWidget({
            width: 6, 
            title: language + " Block Accept/Reject", 
            left: [ m1, m2 ]
        });

        // Create a widget to display block accept rate
        const w2 = new GraphWidget({
            width: 6, 
            title: language + " Block Accept Rate", 
            left: [ blockRate ]
        });

        // Create a widget to display line accepts and rejects
        const w3 = new GraphWidget({
            width: 6, 
            title: language + " Line Accept/Reject", 
            left: [ m3, m4 ]
        });

        // Create a widget to display line accept rate
        const w4 = new GraphWidget({
            width: 6, 
            title: language + " Line Accept Rate", 
            left: [ lineRate ]
        });

        dashboard.addWidgets(w1, w2, w3, w4);
    }
  }
}
