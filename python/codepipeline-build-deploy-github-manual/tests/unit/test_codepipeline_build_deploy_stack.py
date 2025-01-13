import aws_cdk as core
import aws_cdk.assertions as assertions

from codepipeline_build_deploy.codepipeline_build_deploy_stack import CodepipelineBuildDeployStack


def test_deployment_controller_set():
    app = core.App()
    stack = CodepipelineBuildDeployStack(app, "codepipeline-build-deploy")
    template = assertions.Template.from_stack(stack)

    # Checks if the ECS Deployment Controller is set to AWS CodeDeploy
    template.has_resource_properties("AWS::ECS::Service", {
        "DeploymentController": {
            "Type": "CODE_DEPLOY"
        }
    })


def test_port_80_open():
    app = core.App()
    stack = CodepipelineBuildDeployStack(app, "codepipeline-build-deploy")
    template = assertions.Template.from_stack(stack)

    # Checks if the ALB Security Group allows all traffic on port 80
    template.has_resource_properties("AWS::EC2::SecurityGroup", {
        "SecurityGroupIngress": [
            {
                "CidrIp": "0.0.0.0/0",
                "IpProtocol": "tcp",
                "FromPort": 80,
                "ToPort": 80
            },
        ]
    })


def test_s3_bucket_restricted():
    app = core.App()
    stack = CodepipelineBuildDeployStack(app, "codepipeline-build-deploy")
    template = assertions.Template.from_stack(stack)

    # Checks if public access to the S3 Bucket is disabled
    template.has_resource_properties("AWS::S3::Bucket", {
        "PublicAccessBlockConfiguration": {
            "BlockPublicAcls": True,
            "BlockPublicPolicy": True,
            "IgnorePublicAcls": True,
            "RestrictPublicBuckets": True
        },
    })
