# Description
* This is a CDK VPC example, meant for quickly creating a VPC.
* CDK is far less code for a VPC than CloudFormation
* Gateway Endpoints are deployed to all Subnets
* PrivateLink endpoint for AWS Session Manager, incurs cost
* 4 Azs, 1 NatGW per AZ for High Availability, if this number is less, CDK will still create the proper routes
* NatGW incurs cost
