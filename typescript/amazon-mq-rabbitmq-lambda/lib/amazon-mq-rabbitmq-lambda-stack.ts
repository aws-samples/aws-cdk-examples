import { Duration, Stack, StackProps, CfnOutput, RemovalPolicy } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import * as logs from 'aws-cdk-lib/aws-logs';
import { Function, Runtime, Code } from 'aws-cdk-lib/aws-lambda';
import { InstanceClass, InstanceSize, InstanceType } from 'aws-cdk-lib/aws-ec2';
import { RabbitMqBrokerEngineVersion, RabbitMqBrokerInstance, RabbitMqEventSource } from '@cdklabs/cdk-amazonmq';

export class AmazonMqRabbitmqLambdaStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    // Define the admin secret in AWS Secrets Manager
    const adminSecret = new secretsmanager.Secret(this, 'AdminSecret', {
      secretName: 'AdminCredentials',
      generateSecretString: {
        secretStringTemplate: JSON.stringify({
          username: 'admin' // Set a default username for RabbitMQ broker
        }),
        generateStringKey: 'password', // Auto-generate password
        excludePunctuation: true,      // Avoid punctuation in password
        passwordLength: 12,            // Set password length to 12 characters
      },
      removalPolicy: RemovalPolicy.DESTROY, // Ensure the secret is deleted on stack destroy
    });

    // Create a RabbitMQ broker instance with specified version and instance type
    const broker = new RabbitMqBrokerInstance(this, 'RabbitMqBroker', {
      publiclyAccessible: true,                 // Publicly accessible RabbitMQ broker
      version: RabbitMqBrokerEngineVersion.V3_13, // Use RabbitMQ version 3.13
      instanceType: InstanceType.of(InstanceClass.T3, InstanceSize.MICRO), // Instance type T3.micro
      admin: {
        username: adminSecret.secretValueFromJson('username').unsafeUnwrap(), // Use username from Secrets Manager
        password: adminSecret.secretValueFromJson('password'),               // Use password from Secrets Manager
      },
      autoMinorVersionUpgrade: true, // Enable auto minor version upgrades
    });

    // Output the AMQP and Web Console endpoints and ports for the RabbitMQ broker
    new CfnOutput(this, 'AmqpEndpointUrl', { value: broker.endpoints.amqp.url });
    new CfnOutput(this, 'AmqpEndpointPort', { value: broker.endpoints.amqp.port.toString() });
    new CfnOutput(this, 'WebConsoleUrl', { value: broker.endpoints.console.url });
    new CfnOutput(this, 'WebConsolePort', { value: broker.endpoints.console.port.toString() });

    // Create a custom CloudWatch Log Group for the consumer Lambda function
    const consumerLambdaLogGroup = new logs.LogGroup(this, 'ConsumerLambdaLogGroup', {
      logGroupName: 'customLogGroup', // Custom log group name
      removalPolicy: RemovalPolicy.DESTROY, // Ensure it's deleted on stack destroy
    });

    // Define the consumer Lambda function which will handle messages from RabbitMQ
    const consumer_lambda = new Function(this, 'consumer_lambdaFunction', {
      runtime: Runtime.NODEJS_20_X,       // Use Node.js 20.x runtime for the Lambda function
      code: Code.fromAsset('lambda'),     // Path to Lambda function code directory
      handler: 'consumer.handler',        // The entry point (handler) for the Lambda function
      memorySize: 128,                    // Set memory size to 128 MB
      timeout: Duration.seconds(30),      // Set timeout duration to 30 seconds
      logGroup: consumerLambdaLogGroup,   // Attach the custom CloudWatch log group
    });

    consumer_lambda.logGroup.applyRemovalPolicy(RemovalPolicy.DESTROY);

    // Add RabbitMQ as an event source for the Lambda function to consume messages from 'testQueue'
    consumer_lambda.addEventSource(new RabbitMqEventSource({
      broker,                           // Reference to the RabbitMQ broker instance
      credentials: adminSecret,         // Use admin credentials from Secrets Manager
      queueName: 'testQueue',           // Queue name in RabbitMQ from which Lambda will consume messages
    }));
  }
}
