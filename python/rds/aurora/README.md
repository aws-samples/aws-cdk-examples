Aurora Construct
================

## Construct Parameters

* **vpc_id** (`str`) - vpc id
* **subnet_ids** (`list[str]`) - list of subnet ids
* **db_name** (`str`) - database name
* **instance_type** (`ec2.InstanceType`) - _See below_
* **replica_instances** (`int`) - Min: 1. Default: 2
* **aurora_cluster_username** (`str`) - Default: clusteradmin
* **backup_retention_days** (`int`) - Min: 14. Default: 14
* **backup_window** (`str`) - UTC Time. Default: 00:15-01:15
* **preferred_maintenance_window** (`str`) - UTC Time. Default: Sun:23:45-Mon:00:15
* **engine** (`str`) - Aurora Database Engine: postgresql or mysql. Default: postgresql. 
* **enable_babelfish** (`bool`) - Support for MSSQL. (no extra cost). Default: True
* **ingress_sources** (`list[ec2.IPeer/ec2.ISecurityGroup]`) - A security group object or a network subnet. Such as: `ec2.Peer.ipv4("0.0.0.0/0")`, or `ec2.SecurityGroup`.


### Set the [Instance Class](https://docs.aws.amazon.com/cdk/api/latest/python/aws_cdk.aws_ec2/InstanceClass.html) and [Instance Size](https://docs.aws.amazon.com/cdk/api/latest/python/aws_cdk.aws_ec2/InstanceSize.html)

* With Aurora MySQL version 3: you can't use `db.r3`, `db.r4`, `db.t2`, or `db.t3.small` instance classes.
* The smallest instance classes that you can use with version 3 are `db.t3.medium` and `db.t4g.medium`.

* Use the [`ec2.InstanceType`](https://docs.aws.amazon.com/cdk/api/v2/python/aws_cdk.aws_ec2/InstanceType.html)
to set the [`InstanceClass`](https://docs.aws.amazon.com/cdk/api/v2/python/aws_cdk.aws_ec2/InstanceClass.html) and the [`InstanceSize`](https://docs.aws.amazon.com/cdk/api/v2/python/aws_cdk.aws_ec2/InstanceSize.html)

```python
instance_type = ec2.InstanceType.of(
  ec2.InstanceClass.BURSTABLE4_GRAVITON, 
  ec2.InstanceSize.LARGE)
```



## Usage

### Independent resource from `app.py` as a parent-level stack.

```python
from aurora import Aurora

vpc_id    = "vpc-aaaaaaaa"
subnet_ids=["subnet-xxxxxxxx", "subnet-yyyyyyyy", "subnet-zzzzzzzz"]

Aurora(app, "Aurora",
  db_name="ExampleDb",
  ingress_sources=[ec2.Peer.ipv4("10.10.10.10/32")],
  vpc_id=vpc_id,
  subnet_ids=subnet_ids,
  env={"region":"us-east-1"},
  instance_type = ec2.InstanceType.of(ec2.InstanceClass.BURSTABLE4_GRAVITON, ec2.InstanceSize.LARGE)
  backup_window="22:00-00:00",
  preferred_maintenance_window="Sun:23:45-Mon:00:15",
  description="Aurora Example")

```

### As part of a child stack

```python
from aurora import Aurora

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

    Aurora(self, "EchoBaseDb",
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



## Babelfish

* When a **PostgreSQL** database is provisioned, [**Babelfish**](https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/babelfish.html) is enabled to provide support for **MSSQL** clients.

```bash
aws secretsmanager get-secret-value --secret-id arn:aws:secretsmanager:us-east-1:xxxxxxxxxxxx:secret:ExampleDbAuroraClusterCredentials-xxxxxx  --query SecretString --output text | jq -r '.'

mssql-cli \
  -U clusteradmin \
  -P ";?Rq}V_?mlxl7Vbk-|O,ej|}3XR|C," \
  -S aurora-auroradatabasexxxxxxxx-xxxxxxxxxxxx.cluster-xxxxxxxxxxxx.us-east-1.rds.amazonaws.com
```

* When connecting with a **MSSQL** client, the standard **T-SQL** commands can be used:

```sql
SELECT name, database_id, create_date FROM sys.databases;
GO

CREATE DATABASE test1;
GO
```









