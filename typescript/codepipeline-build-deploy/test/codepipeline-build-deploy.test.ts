import * as cdk from "aws-cdk-lib";
import { Template } from "aws-cdk-lib/assertions";
import { CodepipelineBuildDeployStack } from "../lib/codepipeline-build-deploy-stack";

// Checks if the ECS Deployment Controller is set to AWS CodeDeploy
test("Deployment Controller Set", () => {
  const app = new cdk.App();
  const stack = new CodepipelineBuildDeployStack(app, "MyTestStack");
  const template = Template.fromStack(stack);

  template.hasResourceProperties("AWS::ECS::Service", {
    DeploymentController: {
      Type: "CODE_DEPLOY",
    },
  });
});

// Checks if the ALB Security Group allows all traffic on port 80
test("Security Group Port 80 Open", () => {
  const app = new cdk.App();
  const stack = new CodepipelineBuildDeployStack(app, "MyTestStack");
  const template = Template.fromStack(stack);

  template.hasResourceProperties("AWS::EC2::SecurityGroup", {
    SecurityGroupIngress: [
      {
        CidrIp: "0.0.0.0/0",
        FromPort: 80,
        IpProtocol: "tcp",
        ToPort: 80,
      },
    ],
  });
});

// Checks if public access to the S3 Bucket is disabled
test("S3 Bucket Restricted", () => {
  const app = new cdk.App();
  const stack = new CodepipelineBuildDeployStack(app, "MyTestStack");
  const template = Template.fromStack(stack);

  template.hasResourceProperties("AWS::S3::Bucket", {
    PublicAccessBlockConfiguration: {
      BlockPublicAcls: true,
      BlockPublicPolicy: true,
      IgnorePublicAcls: true,
      RestrictPublicBuckets: true,
    },
  });
});
