Oracle Construct
================

## Construct Parameters

* **vpc_id** (`str`) - vpc id
* **subnet_ids** (`list[str]`) - list of subnet ids
* **db_name** (`str`) - database name
* **instance_type** (`ec2.InstanceType`) - _See below_
* **replica_instances** (`int`) - Min: 1. Default: 2
* **oracle_username** (`str`) - Default: dbadmin
* **backup_retention_days** (`int`) - Min: 14. Default: 14
* **backup_window** (`str`) - UTC Time. Default: 00:15-01:15
* **preferred_maintenance_window** (`str`) - UTC Time. Default: Sun:23:45-Mon:00:15
* **ingress_sources** (`list[ec2.IPeer/ec2.ISecurityGroup]`) - A security group object or a network subnet. Such as: `ec2.Peer.ipv4("0.0.0.0/0")`, or `ec2.SecurityGroup`.


### Set the [Instance Class](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_ec2.InstanceClass.html) and [Instance Size](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_ec2.InstanceSize.html)

* Use the [`ec2.InstanceType`](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_ec2.InstanceType.html)
to set the [`InstanceClass`](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_ec2.InstanceClass.html) and the [`InstanceSize`](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_ec2.InstanceSize.html)

```javascript
instanceType = ec2.InstanceType.of(
  ec2.InstanceClass.MEMORY4, 
  ec2.InstanceSize.LARGE)
```



## Usage


```javascript

vpcId    = "vpc-aaaaaaaa"
subnetIds=["subnet-xxxxxxxx", "subnet-yyyyyyyy", "subnet-zzzzzzzz"]

new Oracle(app, 'OracleStack', {
  env:{region:"us-east-2"}, description:"Oracle Stack",
  vpcId:vpcId,
  subnetIds:subnetIds,
  dbName:"sampledb"
});

```



## Secrets Manager

* The database username and password are stored in AWS **Secrets Manager**.

```bash
aws secretsmanager get-secret-value \
  --secret-id arn:aws:secretsmanager:us-east-1:xxxxxxxxxxxx:secret:ExampleDbAuroraClusterCredentials-xxxxxx  \
  --query SecretString \
  --output text | jq -r '.'
```

* After pulling the secret from **Secrets Manager** it will be a `json` string that contains all the details for the client to connect to the database.
```javascript
{
  "dbClusterIdentifier": "aurora-auroradatabasexxxxxxxx-xxxxxxxxxxxx",
  "password": ";?Rq}V_?mlxl7Vbk-|O,ej|}3XR|C,",
  "engine": "postgres",
  "port": 5432,
  "host": "aurora-auroradatabasexxxxxxxx-xxxxxxxxxxxx.cluster-xxxxxxxxxxxx.us-east-1.rds.amazonaws.com",
  "username": "clusteradmin"
}
```

* After pulling the password from the json, it can be used to connect to the database.

```bash
aws secretsmanager get-secret-value \
  --secret-id arn:aws:secretsmanager:us-east-1:xxxxxxxxxxxx:secret:ExampleDbAuroraClusterCredentials-xxxxxx  \
  --query SecretString \
  --output text | jq -r '.password'
```


