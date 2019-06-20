import os
from aws_cdk import (
    aws_apigateway as apigateway,
    aws_cloudformation as cfn,
    aws_events as events, 
    aws_lambda as lambda_, 
    aws_events_targets as targets,
    aws_ec2 as ec2,
    aws_rds as rds,
    aws_iam as iam,
    cdk,
)

class ApiGwLambdaRds(cdk.Stack):
    def __init__(self, scope: cdk.Construct, id: str, default_db_name: str, **kwargs) -> None:
        super().__init__(scope, id, *kwargs)

        vpc = ec2.Vpc(
            self, 'MyVpc',
            cidr='192.168.123.0/24',
            max_a_zs=2
        )

        rds_instance = rds.DatabaseInstance(
            self, 'MyRDSInstance',
            engine=rds.DatabaseInstanceEngine('Mysql', rds.SecretRotationApplication('MysqlRotationSingleUser','1')),
            master_username='admin',
            instance_class=ec2.InstanceType('t2.small'),
            database_name='Transport',
            vpc=vpc,
        )
        rds_instance._security_group.add_ingress_rule(ec2.CidrIPv4(cidr_ip='192.168.123.0/24'), ec2.TcpPort(3306))

        CfnResource = cfn.CustomResource(
            self, "CfnResource",
            provider=cfn.CustomResourceProvider.lambda_(lambda_.SingletonFunction(
            self,
            "CfnSingleton",
            uuid='82F614CD-AAF0-4E9D-98E3-FC3634115355',
            code=lambda_.AssetCode(os.path.join(os.getcwd(), 'cfn-lambda')),
            environment={'SECRET_ARN': rds_instance.secret.secret_arn, 'DB_NAME': default_db_name},
            handler="cfn-custom-resource-rds.main",
            initial_policy=[
                            iam.PolicyStatement(actions=["secretsmanager:GetSecretValue"], resources=[rds_instance.secret.secret_arn]),
                        ],
            timeout=300,
            runtime=lambda_.Runtime.PYTHON37,
            vpc=vpc,
        ))
        )

        lambdaFn = lambda_.Function(
            self,
            "RDSLambda",
            code=lambda_.AssetCode(os.path.join(os.getcwd(), 'lambda')),
            environment={'SECRET_ARN': rds_instance.secret.secret_arn, 'DB_NAME': default_db_name},
            handler="lambda-handler.main",
            initial_policy=[
                            iam.PolicyStatement(actions=["secretsmanager:GetSecretValue"], resources=[rds_instance.secret.secret_arn]),
                        ],
            timeout=300,
            runtime=lambda_.Runtime.PYTHON37,
            vpc=vpc
        )
        
        apigw = apigateway.LambdaRestApi(
            self, 'LambdaApiGWRDS',
            handler=lambdaFn,
            proxy=True
        )

app = cdk.App()
ApiGwLambdaRds(app, "MyApiGwLambdaRds", "Transport")
app.synth()
