# AWS Quicksight as "code" with CDK, CodePipeline

This project provides the tools needed to develop and deploy AWS QuickSight (QS) artifacts (e.g. datasets, templates, analyses, dashboards) in the same way as other code artifacts (e.g. lambdas, content, user interfaces) are handled. This is achieved by creating QS artifacts automatically using the AWS Cloud Development Kit (CDK) and the AWS Command Line Interface (CLI) and by integrating this automatic generation with your CI/CD pipelines.

The automation tools will be showcased by automating the generation of the QS samples provided by AWS during QS account activations. 

For understanding the motivation, rationale contribution, as well as the process to use the tools, please refer to this article:
[AWS QuickSight as “Code”; a unified approach for QuickSight development and deployment, using AWS CDK, CLI, and CodePipeline](https://medium.com/@gmournos/aws-quicksight-as-code-a-unified-approach-for-quicksight-development-and-deployment-using-aws-30bbb6bd253a)

## Dataset Automation

To automate QS Datasets, use the utilities in qs-utils.ts and the following level-2 constructs: QuickSightSingleSourceDatasetConstruct, QuickSightS3CSVDataset, QuickSightAthenaTableDataset. Their usage is showcased by construct  QuickSightSamplesDatasetConstruct, which automates the generation of the QS sample datasets. 

If your datasets are the output of ETL jobs, then construct RefreshDatasetConstruct can help you automatically refresh them after a Glue job finishes.

## Templates - Analyses - Dashboards

The level-2 construct QuickSightTemplateConstruct automates the generation of these artifacts. It:

* parses the template definition
* cleans-up some irrelevant fields (e.g. ThemeArn, Status, ResourceStatus, RequestId)
* wraps the definition as a Cloudformation Resource
* submits it through CDK with construct CfnInClude to create the template. Once the template is in place, it: 
* creates an analysis and a dashboard from it through constructs CfnAnalysis and CfnDashboard.

Construct QuickSightSampleTemplatesConstruct automates the generation of these artifacts for the QS samples.

## Pipeline

A simple pipeline in stack QuicksightCicdStack  is activated when commits happen in the master branch of this GitHub project. It is a simple proof-of-concept demonstrating the continuous delivery of QS artifacts. In a normal project, you would probably be running more complex delivery pipelines; also, you would typically be running from a devops account and deploying the QS artifacts to your testing accounts.

## Process

The tools are complemented by scripts to support the development/deployment of QS artifacts as "code":
 
* make-template-choice.sh creates a template from the updated analysis and downloads its definition in folder template-defs/. Additionally, it creates in folder template-defs/review/ a projection of the definition, without internal ids, for code reviews. 
* make-dashboard-choice.sh publishes a dashboard from the template generated in the above step for quick validation.

## Summary
The development and deployment processes of QS artifacts should not differ from those used for the other "code" artifacts of your project. One should be able to manage the Quicksight development team using the same approach as other development teams.
