import { EventBus, Rule } from 'aws-cdk-lib/aws-events';
import { Construct } from 'constructs';
import { LambdaFunction } from 'aws-cdk-lib/aws-events-targets';
import { Runtime } from 'aws-cdk-lib/aws-lambda';
import { Effect, PolicyStatement } from 'aws-cdk-lib/aws-iam';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import * as path from 'path';
import { Provider } from 'aws-cdk-lib/custom-resources';

export interface QuickSightAutomationsConstructProps {
    eventBus?: EventBus;
    refreshTargets?: [{
        etlJobName: string;
        datasetIds: string[];
    }];
    // Captures the correspondence between Glue ETL jobs and QuickSight datasets to refresh upon jobs' successful completion
}
// Defining an interface for the properties of QuickSightAutomationsConstruct

export class QuickSightAutomationsConstruct extends Construct {
    public readonly shareDashboardLambdaToken: string;
    // Declaring a public readonly property for the share dashboard Lambda token
    // This is used to share the dashboards to the account after they are created

    public constructor(scope: Construct, id: string, props?: QuickSightAutomationsConstructProps) {
        super(scope, id);
        this.shareDashboardLambdaToken = this.makeShareJob();
        
        if (props?.refreshTargets) {
            this.makeRefreshRuleAfterEtl(props);
            // If refreshTargets are provided, call makeRefreshRuleAfterEtl method
        }
    }
    
    protected makeShareJob() {
        // Method to create the Lambda function for sharing dashboards
        
        const shareDashboardLambda = new NodejsFunction(this, 'qs-share-dashboard-function', {
            functionName: 'qs-share-dashboard-function',
            runtime: Runtime.NODEJS_20_X,
            handler: 'shareDashboard',
            entry: path.join(__dirname, '..', '..', 'lambda', 'qs-share-dashboard.ts'),
            // Creating a new Node.js Lambda function with the specified configuration
        });

        const updateDashboardPolicy = new PolicyStatement({
            actions: [
                'quicksight:UpdateDashboardPermissions',
            ],
            effect: Effect.ALLOW,
            resources: [
                '*',
            ],
            // Defining a policy statement to allow updating QuickSight dashboard permissions in order to share the dashboards
        });
        
        shareDashboardLambda.addToRolePolicy(updateDashboardPolicy);
        // Adding the policy statement to the Lambda function's role

        const customResourceProvider = new Provider(this, 'qs-share-dashboard-resource-provider', {
            onEventHandler: shareDashboardLambda,
            // Creating a custom resource provider using the Lambda function
        });
        
        return customResourceProvider.serviceToken;
        // Returning the service token of the custom resource provider
    }

    protected makeRefreshRuleAfterEtl(props: QuickSightAutomationsConstructProps) {
        // Method to create the rule for refreshing datasets after ETL Glue jobs

        // Pass environment variables with key as the sanitized Glue job name and value as the '___' separated dataset IDs to refresh when the Glue ETL job completes
        const cleanEtlJobNameForEnvironment = (id: string) => {
            // Function to sanitize ETL job names to be used as Lambda environment variables
            return id.replace(/[^a-zA-Z0-9]/g, '_');
        };

        const environment: { [key: string]: string } = {};
        props.refreshTargets!.forEach(t => {
            environment[cleanEtlJobNameForEnvironment(t.etlJobName)] = t.datasetIds.join('___');
            // Value of the environment variable is the '___' separated dataset IDs to refresh when the Glue ETL job completes
        });

        const refreshDatasetFunction = new NodejsFunction(this, 'qs-dataset-refresh-function', {
            functionName: 'qs-dataset-refresh-function',
            runtime: Runtime.NODEJS_20_X,
            handler: 'refreshDataset',
            environment,
            entry: path.join(__dirname, '..', '..', 'lambda', 'qs-refresh-dataset.ts'),
            // Creating a new Node.js Lambda function for refreshing datasets
        });

        const quicksightIngestionPolicy = new PolicyStatement({
            actions: [
                'quicksight:CreateIngestion',
            ],
            effect: Effect.ALLOW,
            resources: [
                '*',
            ],
            // Defining a policy statement to allow creating QuickSight ingestions
        });

        refreshDatasetFunction.addToRolePolicy(quicksightIngestionPolicy);
        // Adding the policy statement to the Lambda function's role

        const relevantJobNames = props.refreshTargets!.map(target => target.etlJobName);
        // Capture only relevant ETL job successful completions

        new Rule(this, 'qs-refresh-datasets-rule', {
            ruleName: 'qs-refresh-datasets-rule',
            description: 'Refresh QS datasets after relevant ETL jobs finish',
            eventBus: props?.eventBus,
            eventPattern: {
                detailType: ['Glue Job State Change'],
                source: ['aws.glue'],
                detail: {
                    state: ['SUCCEEDED'],
                    jobName: relevantJobNames,
                },
                // Defining the event pattern for the rule
            },
            targets: [
                new LambdaFunction(refreshDatasetFunction),
                // Adding the Lambda function as a target for the rule
            ],
        });
    }
}
