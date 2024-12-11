import * as cdk from "aws-cdk-lib";
import {CfnCrawler, CfnDatabase, CfnJob} from "aws-cdk-lib/aws-glue";
import {IBucket} from "aws-cdk-lib/aws-s3";
import {AwsCustomResource, AwsCustomResourcePolicy, PhysicalResourceId} from "aws-cdk-lib/custom-resources";
import {ManagedPolicy, Role, ServicePrincipal} from "aws-cdk-lib/aws-iam";
import {StateMachine} from "aws-cdk-lib/aws-stepfunctions";

interface RunnerProps {

  readonly projectBucket: IBucket;
  readonly databaseName: CfnDatabase;
  readonly stateMachine: StateMachine;
  readonly etlJob: CfnJob;

}

export class RunnerStack extends cdk.Stack {

  constructor(scope: cdk.App, id: string, props: RunnerProps) {
    super(scope, id);

    // Raw Data Crawler
    const crawlerRole = new Role(this, 'CrawlerRole', {
      roleName: 'CrawlerRole',
      assumedBy: new ServicePrincipal('glue.amazonaws.com'),
    });
    crawlerRole.addManagedPolicy(ManagedPolicy.fromManagedPolicyArn(this, 'AWSGlueServiceRole2', 'arn:aws:iam::aws:policy/service-role/AWSGlueServiceRole'))

    props.projectBucket.grantReadWrite(crawlerRole);

    const rawDataCrawler = new CfnCrawler(this, 'RawDataCrawler', {
      name: 'demo-raw-data-crawler',
      role: crawlerRole.roleArn,
      databaseName: props.databaseName.ref,
      targets: {
        s3Targets: [{
          path: `s3://${props.projectBucket.bucketName}/raw_data/`,
          sampleSize: 10
        }],
      },
      recrawlPolicy: {
        recrawlBehavior: 'CRAWL_EVERYTHING'
      },
      schemaChangePolicy: {
        updateBehavior: 'UPDATE_IN_DATABASE',
        deleteBehavior: 'DEPRECATE_IN_DATABASE'
      },
      configuration: '{"Version":1.0,"CrawlerOutput":{"Tables":{"TableThreshold":1}},"CreatePartitionIndex":true}'
    });

    const runCrawlerAction = new AwsCustomResource(this, 'RunCrawler', {
      onCreate: {
        service: 'Glue',
        action: 'StartCrawler',
        parameters: {
          Name: rawDataCrawler.ref
        },
        physicalResourceId: PhysicalResourceId.of('RunCrawler')
      },
      policy: AwsCustomResourcePolicy.fromSdkCalls({
        resources: AwsCustomResourcePolicy.ANY_RESOURCE,
      })
    });


    // Run the State Machine with sample data to be accessed by Athena
    const runStepFunctionsWithSample = new AwsCustomResource(this, 'RunStepFunctionWithSample', {
      onCreate: {
        service: 'StepFunctions',
        action: 'StartExecution',
        parameters: {
          stateMachineArn: props.stateMachine.stateMachineArn,
          input: JSON.stringify({
            "target_datetime": "2024-07-09T14:33:00.000Z"
          })
        },
        physicalResourceId: PhysicalResourceId.of('RunStepFunctionWithSample')
      },
      policy: AwsCustomResourcePolicy.fromSdkCalls({
        resources: AwsCustomResourcePolicy.ANY_RESOURCE,
      })
    });
    runStepFunctionsWithSample.node.addDependency(runCrawlerAction);

    // Run the State Machine with sample data to be accessed by Athena
    const runStepFunctionsWithSample2 = new AwsCustomResource(this, 'RunStepFunctionWithSample2', {
      onCreate: {
        service: 'StepFunctions',
        action: 'StartExecution',
        parameters: {
          stateMachineArn: props.stateMachine.stateMachineArn,
          input: JSON.stringify({
            "target_datetime": "2024-07-09T15:33:00.000Z"
          })
        },
        physicalResourceId: PhysicalResourceId.of('RunStepFunctionWithSample2')
      },
      policy: AwsCustomResourcePolicy.fromSdkCalls({
        resources: AwsCustomResourcePolicy.ANY_RESOURCE,
      })
    });
    runStepFunctionsWithSample2.node.addDependency(runStepFunctionsWithSample);

  }
}
