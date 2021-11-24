
# Create EMR Cluster with a step in new VPC

This example includes:

* Own VPC with public subnet
* EMR Cluster with Spark installed
* EMR Cluster has a single spark step
* EMR Cluster permissions

Requires update of the variables for:

* s3_logs_bucket
* s3_script_bucket
* spark_script

With the default settings, when deployed the cluster will run the single step and then terminate.

## Useful commands

 * `cdk bootstrap`   initialice assets before deploy
 * `cdk synth`       emits the synthesized CloudFormation template
 * `cdk deploy`      deploy this stack to your default AWS account/region
