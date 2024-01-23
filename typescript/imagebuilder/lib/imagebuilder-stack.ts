import * as cdk from 'aws-cdk-lib';
import fs = require('fs');
import * as path from 'path'

import * as imagebuilder from 'aws-cdk-lib/aws-imagebuilder';
import * as ecr from 'aws-cdk-lib/aws-ecr'
import * as iam from 'aws-cdk-lib/aws-iam'

export class ImagebuilderStack extends cdk.Stack {
  constructor(scope: cdk.App, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const gitComponenet = new imagebuilder.CfnComponent(this, "GitComponenet", {
      name: this.stackName + '-' + "Git",
      platform: "Linux",
      version: "1.0.0",
      data: fs.readFileSync(
          path.resolve('bin/imagebuilder-components/git.yaml'),
          'utf8'
        )
    });
  
    const nodejsComponenet = new imagebuilder.CfnComponent(this, "NodejsComponenet", {
      name: this.stackName + '-' + "Nodejs",
      platform: "Linux",
      version: "1.0.0",
      data: fs.readFileSync(
          path.resolve('bin/imagebuilder-components/node.yaml'),
          'utf8'
        )
    });
  
    const dockerComponenet = new imagebuilder.CfnComponent(this, "DockerComponenet", {
      name: this.stackName + '-' + "Docker",
      platform: "Linux",
      version: "1.0.2",
      data: fs.readFileSync(
          path.resolve('bin/imagebuilder-components/docker.yaml'),
          'utf8'
        )
    });
    
    const ecrRepoForImageBuilderCodeCatalyst = new ecr.Repository(this, "EcrRepoForImageBuilderCodeCatalyst")
  
    const AmazonLinux2023wGitNodeRecipe = new imagebuilder.CfnContainerRecipe(this, "AmazonLinux2023withGitAndNodeRecipe", {
      components: [
        {
          componentArn : gitComponenet.attrArn,
        },
        {
          componentArn : nodejsComponenet.attrArn,
        },
        {
          componentArn : dockerComponenet.attrArn,
        }
      ],
      containerType: "DOCKER",
      dockerfileTemplateData: "FROM {{{ imagebuilder:parentImage }}}\n{{{ imagebuilder:environments }}}\n{{{ imagebuilder:components }}}\n",
      name: this.stackName + '-' + "AmazonLinux2023WithGit",
      parentImage: `arn:aws:imagebuilder:${this.region}:aws:image/amazon-linux-2023-x86-latest/x.x.x`,
      targetRepository: {
        repositoryName: ecrRepoForImageBuilderCodeCatalyst.repositoryName,
        service : "ECR"
      },
      version: "2.1.2"
    })
  
    const instanceProfileForImageBuilder = new iam.InstanceProfile(this, "InstanceProfileForImageBuilder", {
      role: new iam.Role(this, 'EC2InstanceProfileForImageBuilder', {
        assumedBy: new iam.ServicePrincipal('ec2.amazonaws.com'),
        managedPolicies: [
          {
            managedPolicyArn: "arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore"
          },
          {
            managedPolicyArn: "arn:aws:iam::aws:policy/EC2InstanceProfileForImageBuilder"
          },
          {
            managedPolicyArn: "arn:aws:iam::aws:policy/EC2InstanceProfileForImageBuilderECRContainerBuilds"
          }
        ]
      })
    });
  
    const infraConfig = new imagebuilder.CfnInfrastructureConfiguration(this, "ImageBuilderInfraConfig", {
      name: this.stackName + '-' + "infra",
      instanceProfileName: instanceProfileForImageBuilder.instanceProfileName,
    });
    
    const distConfig = new imagebuilder.CfnDistributionConfiguration(this, "ImageBuilderDistConfig", {
      name: this.stackName + '-' + "dist",
      distributions: [
        {
          region: this.region!,
          containerDistributionConfiguration: {
            "TargetRepository" : {
              "RepositoryName" : ecrRepoForImageBuilderCodeCatalyst.repositoryName,
              "Service" : "ECR"
            }
          }
        }
      ]
    });
  
    const imageBuilderPipeline = new imagebuilder.CfnImagePipeline(this, "AmazonLinux2023WithGitPipeline", {
      name: this.stackName + '-' + "AmazonLinux23WithGitPipeline",
      infrastructureConfigurationArn: infraConfig.attrArn,
      distributionConfigurationArn: distConfig.attrArn,
      containerRecipeArn: AmazonLinux2023wGitNodeRecipe.attrArn,
      status: "ENABLED",
    });
  }
}
