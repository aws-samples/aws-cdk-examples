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


### Set the [Instance Class](https://docs.aws.amazon.com/cdk/api/latest/python/aws_cdk.aws_ec2/InstanceClass.html) and [Instance Size](https://docs.aws.amazon.com/cdk/api/latest/python/aws_cdk.aws_ec2/InstanceSize.html)

* Use the [`ec2.InstanceType`](https://docs.aws.amazon.com/cdk/api/v2/python/aws_cdk.aws_ec2/InstanceType.html)
to set the [`InstanceClass`](https://docs.aws.amazon.com/cdk/api/v2/python/aws_cdk.aws_ec2/InstanceClass.html) and the [`InstanceSize`](https://docs.aws.amazon.com/cdk/api/v2/python/aws_cdk.aws_ec2/InstanceSize.html)

```python
instance_type = ec2.InstanceType.of(
  ec2.InstanceClass.MEMORY4, 
  ec2.InstanceSize.LARGE)
```



## Usage

### Independent resource from `app.py` as a parent-level stack.

```python
from oracle import Oracle

vpc_id    = "vpc-aaaaaaaa"
subnet_ids=["subnet-xxxxxxxx", "subnet-yyyyyyyy", "subnet-zzzzzzzz"]

Oracle(app, "Oracle",
  db_name="ExampleDb",
  ingress_sources=[ec2.Peer.ipv4("10.10.10.10/32")],
  vpc_id=vpc_id,
  subnet_ids=subnet_ids,
  env={"region":"us-east-1"},
  instance_type = ec2.InstanceType.of(ec2.InstanceClass.BURSTABLE4_GRAVITON, ec2.InstanceSize.LARGE)
  backup_window="22:00-00:00",
  preferred_maintenance_window="Sun:23:45-Mon:00:15",
  description="Oracle Example")

```

### As part of a child stack

```python
from oracle import Oracle

class IcePlainsOfHoth(Stack):

  def __init__(self, scope:Construct, id:str, **kwargs) -> None:
    super().__init__(scope, id, **kwargs)

    vpc = ec2.Vpc(self, "IcePlainsVpc",
      cidr                 = "10.99.0.0/16",
      max_azs              = 3,
      enable_dns_hostnames = True,
      enable_dns_support   = True,
      subnet_configuration = [
        ec2.SubnetConfiguration(
          cidr_mask   = 24,
          name        = 'public1',
          subnet_type = ec2.SubnetType.PUBLIC,
        ),
        ec2.SubnetConfiguration(
          cidr_mask   = 24,
          name        = 'public2',
          subnet_type = ec2.SubnetType.PUBLIC,
        ),
        ec2.SubnetConfiguration(
          cidr_mask   = 24,
          name        = 'public3',
          subnet_type = ec2.SubnetType.PUBLIC,
        )
      ]
    )

    vpc_subnets = vpc.select_subnets(
      subnet_type=ec2.SubnetType.PUBLIC,
      one_per_az =True
    )

    subnet_ids = []
    for subnet in vpc_subnets.subnets:
      subnet_ids.append(subnet.subnet_id)

    vpc_id = vpc.vpc_id

    Oracle(self, "EchoBaseDb",
      db_name="EchoBase",
      ingress_sources=[ec2.Peer.ipv4("10.10.10.10/32")],
      vpc_id=vpc_id,
      subnet_ids=subnet_ids,
      env={'region': 'us-east-1'},
      description="Echo Base DB")

```




## CDK Nag ensures that the construct follows security standards.

* CDK Nag includes several rules that are used to check the code at compile time to ensure it complies with security standards.
* The security standards include:
  * [AWS Solutions](https://github.com/cdklabs/cdk-nag/blob/main/RULES.md#awssolutions)
  * [HIPAA Security](https://github.com/cdklabs/cdk-nag/blob/main/RULES.md#hipaa-security)
  * [NIST 800-53 rev 4](https://github.com/cdklabs/cdk-nag/blob/main/RULES.md#nist-800-53-rev-4)
  * [NIST 800-53 rev 5](https://github.com/cdklabs/cdk-nag/blob/main/RULES.md#nist-800-53-rev-5)
  * [PCI DSS 3.2.1](https://github.com/cdklabs/cdk-nag/blob/main/RULES.md#pci-dss-321)



## Secrets Manager

* The database username and password are stored in AWS **Secrets Manager**.

```bash
aws secretsmanager get-secret-value \
  --secret-id arn:aws:secretsmanager:us-east-1:xxxxxxxxxxxx:secret:ExampleDbOracleClusterCredentials-xxxxxx  \
  --query SecretString \
  --output text | jq -r '.'
```

* After pulling the secret from **Secrets Manager** it will be a `json` string that contains all the details for the client to connect to the database.
```javascript
{
  "dbClusterIdentifier": "oracle-oracledatabasexxxxxxxx-xxxxxxxxxxxx",
  "password": ";?Rq}V_?mlxl7Vbk-|O,ej|}3XR|C,",
  "engine": "postgres",
  "port": 5432,
  "host": "oracle-oracledatabasexxxxxxxx-xxxxxxxxxxxx.cluster-xxxxxxxxxxxx.us-east-1.rds.amazonaws.com",
  "username": "clusteradmin"
}
```

* After pulling the password from the json, it can be used to connect to the database.

```bash
aws secretsmanager get-secret-value \
  --secret-id arn:aws:secretsmanager:us-east-1:xxxxxxxxxxxx:secret:ExampleDbOracleClusterCredentials-xxxxxx  \
  --query SecretString \
  --output text | jq -r '.password'
```


