# Api Gateway with Lambda & RDS (Mysql)

This example creates an API Gateway with a Lambda that will query data from the RDS Mysql Instance. 

The DB is provisioned with some example data using a Cloudformation custom resource.

The lambdas use Secrets Manager for storage & retrieval of DB connection details.

## Prep

Both of the lambda functions require python modules to be installed prior to deployment.

In this examples root folder, run the following:

```bash
pip install -r lambda/requirements.txt -t lambda/
pip install -r cfn-lambda/requirements.txt -t cfn-lambda/
```

Additionally this stack uses assets, so the toolkit stack must be deployed to the environment, run:

```bash
cdk bootstrap aws://<your-aws-accountid>/<region>
```

*If you try to deploy the stack without cdk bootstrap it will give you an error and the required bootstrap command for your environment* 

Finally you will need to install the necessary dependencies for CDK, in the root folder of the example run:

```bash
pip install -r requirements.txt
```

## Deploy

Run `cdk deploy`. This will deploy / redeploy your Stack to your AWS Account.

After the deployment you will see the API's URL, which represents the url you can then use.

```bash
curl https://<uid>.execute-api.eu-west-1.amazonaws.com/prod/

[{'VehicleID': 1, 'VehicleType': 'Economy', 'VehicleCapacity': 4}, {'VehicleID': 2, 'VehicleType': 'Standard', 'VehicleCapacity': 4}, {'VehicleID': 3, 'VehicleType': 'Premium', 'VehicleCapacity': 4}, {'VehicleID': 4, 'VehicleType': 'Minivan', 'VehicleCapacity': 8}]
```
