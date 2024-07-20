import { Construct } from 'constructs';
import { QuickSightTemplateConstruct } from './constructs/qs-template-construct';
import { Stack } from 'aws-cdk-lib';
import * as path from 'path';

// Class for creating QuickSight sample templates, analyses and dashboards
// passes the stack version to make sure that they always update whenever the stack version changes

export class QuickSightSampleTemplatesConstruct extends Construct {

    // Constructor for the QuickSightSampleTemplatesConstruct class
    constructor(scope: Construct, id: string) {
        super(scope, id);

        // Create a QuickSight template for the "People Overview" dataset
        new QuickSightTemplateConstruct(this, 'people', {
            templateDefinitionSource: path.join(__dirname, '..', 'template-defs', 'people-template-def.json'),
            stackVersion: Stack.of(this).node.tryGetContext('version'),
            dataSets: {
                "People Overview": `arn:aws:quicksight:${Stack.of(this).region}:${Stack.of(this).account}:dataset/people-ds`,
            }
        });

        // Create a QuickSight template for the "Sales Pipeline" dataset
        new QuickSightTemplateConstruct(this, 'sales', {
            templateDefinitionSource: path.join(__dirname, '..', 'template-defs', 'sales-template-def.json'),
            stackVersion: Stack.of(this).node.tryGetContext('version'),
            dataSets: {
                "Sales Pipeline": `arn:aws:quicksight:${Stack.of(this).region}:${Stack.of(this).account}:dataset/sales-ds`,
            }
        });

        // Create a QuickSight template for the "Business Review" dataset
        new QuickSightTemplateConstruct(this, 'business', {
            templateDefinitionSource: path.join(__dirname, '..', 'template-defs', 'business-template-def.json'),
            stackVersion: Stack.of(this).node.tryGetContext('version'),
            dataSets: {
                "Business Review": `arn:aws:quicksight:${Stack.of(this).region}:${Stack.of(this).account}:dataset/business-ds`,
            }
        });
        
        // Create a QuickSight template for the "Web and Social Media Analytics" dataset
        new QuickSightTemplateConstruct(this, 'web', {
            templateDefinitionSource: path.join(__dirname, '..', 'template-defs', 'web-template-def.json'),
            stackVersion: Stack.of(this).node.tryGetContext('version'),
            dataSets: {
                "Web and Social Media Analytics": `arn:aws:quicksight:${Stack.of(this).region}:${Stack.of(this).account}:dataset/web-ds`,
            }
        });
    }
}
