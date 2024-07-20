import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { QuickSightSamplesDatasetConstruct } from './quicksight-sample-datasets-construct';
import { QuickSightSampleTemplatesConstruct } from './quicksight-sample-templates-construct';
import { QuickSightAutomationsConstruct } from './constructs/qs-extra-automation';

// Class representing the main stack for QuickSight code
export class QuicksightCodeStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Create an instance of QuickSightAutomationsConstruct
    const automations = new QuickSightAutomationsConstruct(this, 'qs-automations');
    
    // Set the environment variable for the share function ARN
    // use this later in QuickSightSingleSourceDatasetConstruct when you create the datasets
    process.env.SHARE_FUNCTION = automations.shareDashboardLambdaToken;

    // Create an instance of QuickSightSamplesDatasetConstruct
    new QuickSightSamplesDatasetConstruct(this, 'qs-datasets');

    // Create an instance of QuickSightSampleTemplatesConstruct
    const templates = new QuickSightSampleTemplatesConstruct(this, 'qs-templates');
    
    // Add a dependency to ensure templates are created after automations
    templates.node.addDependency(automations);
  }
}
