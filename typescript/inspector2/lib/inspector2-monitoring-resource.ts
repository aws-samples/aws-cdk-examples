import * as cdk from 'aws-cdk-lib';
import {
  aws_logs as logs,
  aws_events as events,
  aws_events_targets as targets,
  aws_lambda as lambda,
  aws_lambda_nodejs as lambda_nodejs,
} from 'aws-cdk-lib';
import { Construct } from 'constructs';

/** A Custom Resource construct for monitoring Amazon Inspector scan results.
 * 
 * Deploys a Lambda to handle initial scan results and another Lambda to handle Inspector2 Findings.
 * 
 * For more details see https://docs.aws.amazon.com/inspector/latest/user/findings-managing-automating-responses.html
 */
export class Inspector2MonitoringResource extends cdk.Resource {
  constructor(scope: Construct, id: string, props: cdk.ResourceProps) {
    super(scope, id, props);

    const initialScanRule = new events.Rule(this, 'initialScanRule', {
      eventPattern: {
        'detailType': ['Inspector2 Scan'],
        'source': ['aws.inspector2'],
        'detail': {
          'scan-status': ['INITIAL_SCAN_COMPLETE'],
        },
      },
    });

    const findingScanRule = new events.Rule(this, 'findingScanRule', {
      eventPattern: {
        'detailType': ['Inspector2 Finding'],
        'source': ['aws.inspector2'],
        'detail': {
          // Optionally filter by severity
          // 'severity': ['HIGH', 'CRITICAL'],
          'status': ['ACTIVE'],
        },
      },
    });

    const inspector2InitialScanHandler = new lambda_nodejs.NodejsFunction(scope, 'Inspector2InitialScanHandler', {
      timeout: cdk.Duration.minutes(15),
      runtime: lambda.Runtime.NODEJS_18_X,
      logRetention: logs.RetentionDays.ONE_DAY,
    });

    const inspector2FindingHandler = new lambda_nodejs.NodejsFunction(scope, 'Inspector2FindingHandler', {
      timeout: cdk.Duration.minutes(15),
      runtime: lambda.Runtime.NODEJS_18_X,
      logRetention: logs.RetentionDays.ONE_DAY,
    });

    initialScanRule.addTarget(new targets.LambdaFunction(inspector2InitialScanHandler));
    findingScanRule.addTarget(new targets.LambdaFunction(inspector2FindingHandler));
  }
}
