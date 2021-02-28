# ElastiCache Redis Auth Rotation with Secrets Manager

This example deploys:
* A VPC with three subnets (public, private and isolated)
* An AWS SecretsManager secret to be used as an auth token in Amazon ElastiCache Redis
* An Amazon ElastiCache Redis replication group in the isolated subnet
* A Lambda function in the private subnet used for secret rotation

The example will create an secret in AWS SecretsManager that will be used as the auth token in the ElastiCache Redis replication group. The secret will have a rotation policy defined and a custom Lambda function that will be called whenever the secret needs to be rotated.

The secret rotation Lambda function will use the 'ROTATE' action on the ElastiCache replication group to add the new secret. On 'test' events, the Lambda will attempt to establish a connection on test_secret events. On 'finalize' events, the Lamdba will call a 'SET' operation via boto3.


## Useful commands

 * `npm run build`   compile typescript to js
 * `npm run watch`   watch for changes and compile
 * `npm run test`    perform the jest unit tests
 * `cdk deploy`      deploy this stack to your default AWS account/region
 * `cdk diff`        compare deployed stack with current state
 * `cdk synth`       emits the synthesized CloudFormation template
