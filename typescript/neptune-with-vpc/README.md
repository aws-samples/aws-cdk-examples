Neptune Cluster with a VPC
==========================

* Creates a **VPC**, with **two subnets**, to run the **Neptune Cluster** in.
* Creates a **Neptune Cluster** inside the **Isolated Subnets**.
* Exports the endpoints for connecting to the cluster.


## Build

To build this example, you need to be in this example's root directory. Then run the following:

```bash
npm install -g aws-cdk
npm install
cdk synth
```

This will install the necessary CDK, then this example's dependencies, and then build the CloudFormation template. The resulting CloudFormation template will be in the `cdk.out` directory.

## Deploy

Run `cdk deploy`. This will deploy / redeploy your Stack to your AWS Account.

After the deployment you will see the API's URL, which represents the url you can then use.




