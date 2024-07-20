import { Construct } from 'constructs';
import { readFileSync, statSync, writeFileSync } from 'fs';
import { CfnAnalysis, CfnDashboard } from 'aws-cdk-lib/aws-quicksight';
import * as path from 'path';
import { CustomResource, Stack } from 'aws-cdk-lib';
import * as util from './qs-util';
import { CfnInclude } from 'aws-cdk-lib/cloudformation-include';
import * as os from 'os';

// Interface defining the properties for the QuickSightTemplateConstruct
// This construct will create a Quicksight template, analysis and dashboard, from the template definition defined in property templateDefinitionSource
// It will update the template, analysis and dashboard whenever the property stackVersion changes
// Additionally, it will update the template if the template file specified in templateDefinitionSource changes
// To create the analysis and dashboard from the template, it needs to bind the dataset placeholders contained in the generated template, to actual dataset ids
// The correspondence of dataset placeholders to dataset ids is captured in property dataSets 
export interface QuickSightTemplateConstructProps {
    templateDefinitionSource: string; // Source file for the template definition
    stackVersion: string; // Version of the stack
    dataSets: {
        [placeholder: string]: string // Map of dataset placeholders to dataset ARNs
    }
}

// Class for creating a QuickSight template, analysis and dashboard from a template definition file
export class QuickSightTemplateConstruct extends Construct {
    
    constructor(scope: Construct, private id: string, props: QuickSightTemplateConstructProps) {
        super(scope, id);
        
        // Read the original template definition file
        const originalTemplateDefinitionFile = props.templateDefinitionSource;
        const { account, region } = Stack.of(this);
        
        // Get QuickSight group ARNs
        const quicksightReadWriteGroupArn = util.getQuicksightReadWriteGroupArn(region, account);
        const quicksightReadOnlyGroupArn = util.getQuicksightReadOnlyGroupArn(region, account);

        // Read and parse the template definition file
        const buffer = readFileSync(originalTemplateDefinitionFile, { encoding: 'utf-8' });
        const jsonObj = JSON.parse(buffer);
        
        // Clean up the template definition
        delete jsonObj.ThemeArn;
        delete jsonObj.Status;
        delete jsonObj.ResourceStatus;
        delete jsonObj.RequestId;
       
        if (jsonObj.Errors) {
            throw new Error(`Template has errors. Remove errors before using it with CDK`);
        }
        
        // Set the template ID and name
        jsonObj.TemplateId = `${id}-template`;
        const autoPrefix = `${props.stackVersion} ${id}`;
        jsonObj.Name = `${autoPrefix} Template`;
        
        jsonObj.AwsAccountId = account;

        // Generate a logical ID for the CloudFormation resource
        const logicalId = `${id}quicksighttemplate`.replace(/[^A-Za-z0-9]/g, ''); // logical ids should be alphanumeric
        
        // Create a CloudFormation object for the template
        const cloudFormationObject = {
            "Resources": {
                [logicalId]: {
                    Type: 'AWS::QuickSight::Template',
                    Properties: jsonObj,
                }
            }
        };
                
        // Write the CloudFormation template to a temporary file
        const tempCfnTemplateFile = path.join(os.tmpdir(), `cf-template-${id}.json`);
        writeFileSync(tempCfnTemplateFile, JSON.stringify(cloudFormationObject));
        
        // Include the CloudFormation template in the stack
        const template = new CfnInclude(this, `${id}-qs-template`, {
            templateFile: tempCfnTemplateFile,
        });

        // keep the template as a variable to add dependencies to it at the dashboard and analysis
        const templateResource = template.getResource(logicalId); 
        
        // Map dataset placeholders to dataset ARNs
        const dataSetReferences = Object.keys(props.dataSets).map(placeholder => {
            return { 
                dataSetArn: props.dataSets[placeholder],
                dataSetPlaceholder: placeholder,
            };
        });

        // Define permissions for the analysis
        const analysisPermissions = [{
            principal: quicksightReadWriteGroupArn,
            actions: util.QS_RW_ANALYSIS_ACCESS,
        }];
        
        // Get the last modified timestamp of the template definition file
        // Use it in the name of the analysis and dashboard for visibility of changes
        // Also this ensures that the analysis and dashboard will always be updated, whenever the source template definition file changes
        const stats = statSync(originalTemplateDefinitionFile);
        const timestampSuffix = `Timestamp: ${stats.mtime}`;
        
        // Generate the template ARN
        const templateArn = `arn:aws:quicksight:${region}:${account}:template/${jsonObj.TemplateId}`;
        
        // Create a new QuickSight analysis
        const analysis = new CfnAnalysis(this, `${id}-qs-analysis`, {
            analysisId: `${id}-analysis`,
            awsAccountId: account,
            name: `${autoPrefix} Analysis ${timestampSuffix}`,
            themeArn: 'arn:aws:quicksight::aws:theme/CLASSIC',
            sourceEntity: {
                sourceTemplate: {
                    arn: templateArn,
                    dataSetReferences,
                },
            },
            permissions: analysisPermissions,
        });

        // Create the analysis after the template
        analysis.addDependency(templateResource);
        
        // Define permissions for the dashboard
        const dashboardPermissions = [{
            principal: quicksightReadWriteGroupArn,
            actions: util.QS_RW_DASHBOARD_ACCESS,
        },
        {
            principal: quicksightReadOnlyGroupArn,
            actions: util.QS_RO_DASHBOARD_ACCESS,
        }];

        // Create a new QuickSight dashboard
        const dashboard = new CfnDashboard(this, `${id}-qs-dashboard`, {
            dashboardId: `${id}-dashboard`,
            awsAccountId: account,
            name: `${autoPrefix} Dashboard ${timestampSuffix}`,
            themeArn: 'arn:aws:quicksight::aws:theme/CLASSIC',
            sourceEntity: {
                sourceTemplate: {
                    arn: templateArn,
                    dataSetReferences,
                },
            },
            permissions: dashboardPermissions,
            dashboardPublishOptions: {
                adHocFilteringOption: {
                    availabilityStatus: "ENABLED"
                },
                exportToCsvOption: {
                    availabilityStatus: "ENABLED"
                },
                sheetControlsOption: {
                    visibilityState: "EXPANDED"
                },
                sheetLayoutElementMaximizationOption: {
                    availabilityStatus: "ENABLED"
                },
                visualMenuOption: {
                    availabilityStatus: "ENABLED"
                },
                visualAxisSortOption: {
                    availabilityStatus: "ENABLED"
                },
                exportWithHiddenFieldsOption: {
                    availabilityStatus: "DISABLED"
                },
                dataPointDrillUpDownOption: {
                    availabilityStatus: "ENABLED"
                },
                dataPointMenuLabelOption: {
                    availabilityStatus: "ENABLED"
                },
                dataPointTooltipOption: {
                    availabilityStatus: "ENABLED"
                }
            }
        });
        // Create the dashboard after the template
        dashboard.addDependency(templateResource);

        // Get the ARN of the share function from environment variables
        const shareFunctionArn = process.env.SHARE_FUNCTION;
        if (!shareFunctionArn) {
            throw new Error('no share function');
        }

        // Create a custom resource to share the QuickSight dashboard
        const quickSightShareDashboardCustomResource = new CustomResource(this, `${id}-qs-dashboard-share-function`, {
            serviceToken: shareFunctionArn,
            properties: {
                DashboardId: `${id}-dashboard`,
                AwsAccountId: Stack.of(this).account,
                Region: Stack.of(this).region,
            },
        });
  
        quickSightShareDashboardCustomResource.node.addDependency(dashboard);
    }
}
