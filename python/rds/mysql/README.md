MySQL Construct
================

## Construct Parameters

* **vpc_id** (`str`) - vpc id
* **subnet_ids** (`list[str]`) - list of subnet ids
* **db_name** (`str`) - database name
* **instance_type** (`ec2.InstanceType`) - _See below_
* **engine_version** (`rds.MysqlEngineVersion`) - Expects an object like: [rds.MysqlEngineVersion.VER_8_0_28](https://docs.aws.amazon.com/cdk/api/v2/python/aws_cdk.aws_rds/MysqlEngineVersion.html)


### Set the [Instance Class](https://docs.aws.amazon.com/cdk/api/latest/python/aws_cdk.aws_ec2/InstanceClass.html) and [Instance Size](https://docs.aws.amazon.com/cdk/api/latest/python/aws_cdk.aws_ec2/InstanceSize.html)

* Use the [`ec2.InstanceType`](https://docs.aws.amazon.com/cdk/api/v2/python/aws_cdk.aws_ec2/InstanceType.html)
to set the [`InstanceClass`](https://docs.aws.amazon.com/cdk/api/v2/python/aws_cdk.aws_ec2/InstanceClass.html) and the [`InstanceSize`](https://docs.aws.amazon.com/cdk/api/v2/python/aws_cdk.aws_ec2/InstanceSize.html)

```python
instance_type = ec2.InstanceType.of(
  ec2.InstanceClass.MEMORY4, 
  ec2.InstanceSize.LARGE)
```

