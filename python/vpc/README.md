# Description
* This is a CDK VPC example, meant for quickly creating a VPC.
* CDK is far less code for a VPC than CloudFormation
* Gateway Endpoints are deployed to all Subnets
* PrivateLink endpoint for AWS Session Manager, incurs cost
* 4 Azs, 1 NatGW per AZ for High Availability, if this number is less, CDK will still create the proper routes
* NAT Gateway is included for each availability zone. NAT Gateway incurs a cost
    * The value of the NAT Gateway is that it allows instances to connect outbound to the internet and other AWS services, but prevent the internet from initiating a connection with those instances. 
    * Read More: https://docs.aws.amazon.com/vpc/latest/userguide/vpc-nat-gateway.html
* A Private Link Endpoint is included as an example, which incurs a cost. 
    * Private Link endpoints allow connection to AWS Services from subnets which do not have any internet connectivity. 
    * Read More: https://docs.aws.amazon.com/vpc/latest/userguide/endpoint-service.html
    
