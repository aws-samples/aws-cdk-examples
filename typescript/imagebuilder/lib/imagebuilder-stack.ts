import * as cdk from 'aws-cdk-lib';
import fs = require('fs');
import * as path from 'path'

import * as imagebuilder from 'aws-cdk-lib/aws-imagebuilder';
import * as ecr from 'aws-cdk-lib/aws-ecr'
import * as iam from 'aws-cdk-lib/aws-iam'

import { NagSuppressions } from 'cdk-nag';

export class ImagebuilderStack extends cdk.Stack {
  constructor(scope: cdk.App, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Create ImageBuilder componenet that will handle installing git in the base container image
    const gitComponenet = new imagebuilder.CfnComponent(this, "GitComponenet", {
      // Prefix compoenet name with stake name for inter-environment uniqueness
      name: this.stackName + '-' + "Git",
      platform: "Linux",
      version: "1.0.0",
      data: fs.readFileSync(
          path.resolve('bin/imagebuilder-components/git.yaml'),
          'utf8'
        )
    });
    
    // Create ImageBuilder componenet that will handle installing NodeJS in the base container image
    const nodejsComponenet = new imagebuilder.CfnComponent(this, "NodejsComponenet", {
      // Prefix compoenet name with stake name for inter-environment uniqueness
      name: this.stackName + '-' + "Nodejs",
      platform: "Linux",
      version: "1.0.0",
      data: fs.readFileSync(
          path.resolve('bin/imagebuilder-components/node.yaml'),
          'utf8'
        )
    });
    
    // Create ImageBuilder componenet that will handle installing Docker in the base container image
    const dockerComponenet = new imagebuilder.CfnComponent(this, "DockerComponenet", {
      // Prefix compoenet name with stake name for inter-environment uniqueness
      name: this.stackName + '-' + "Docker",
      platform: "Linux",
      version: "1.0.2",
      data: fs.readFileSync(
          path.resolve('bin/imagebuilder-components/docker.yaml'),
          'utf8'
        )
    });
    
    // Create the Amazon Elastic Container Registry repository that will host the resulting image(s)
    const ecrRepoForImageBuilderCodeCatalyst = new ecr.Repository(this, "EcrRepoForImageBuilderCodeCatalyst")
    
    // Create an ImageBuilder recipe that contains the 3 compoenets
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
      // Prefix recipe name with stake name for inter-environment uniqueness
      name: this.stackName + '-' + "AmazonLinux2023WithGit",
      // Use amazon linux 2023 base image with the latest version tag indicated by /x.x.x
      parentImage: `arn:aws:imagebuilder:${this.region}:aws:image/amazon-linux-2023-x86-latest/x.x.x`,
      // Specify the destination repository as the one created above
      targetRepository: {
        repositoryName: ecrRepoForImageBuilderCodeCatalyst.repositoryName,
        service : "ECR"
      },
      version: "2.1.2"
    })
    
    // Create an IAM role for ImageBuilder EC2 build instances, that has the needed AWS Managed policies
    const iamRoleForImageBuilder = new iam.Role(this, 'EC2InstanceProfileForImageBuilder', {
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
    // Suppress cdk_nag warning on use of managed policies
    NagSuppressions.addResourceSuppressions(iamRoleForImageBuilder, [
      { id: 'AwsSolutions-IAM4', reason: 'Managed policies for ImageBuilder are used as the provide a comprehensive set of permissions to allow ImageBuilder to function in this sample' },
    ]);

    // Create an EC2 instance profile that uses the IAM role created above
    const instanceProfileForImageBuilder = new iam.InstanceProfile(this, "InstanceProfileForImageBuilder", {
      role: iamRoleForImageBuilder
    });
    
    // Create build infrastructure configuration that uses the instance profile
    const infraConfig = new imagebuilder.CfnInfrastructureConfiguration(this, "ImageBuilderInfraConfig", {
      // Prefix recipe name with stake name for inter-environment uniqueness
      name: this.stackName + '-' + "infra",
      instanceProfileName: instanceProfileForImageBuilder.instanceProfileName,
    });
    
    // Create a distribution config to specify where the resulting image(s) should be stored
    const distConfig = new imagebuilder.CfnDistributionConfiguration(this, "ImageBuilderDistConfig", {
      // Prefix recipe name with stake name for inter-environment uniqueness
      name: this.stackName + '-' + "dist",
      distributions: [
        { 
          // Set the target region to the same region where the current stack is deployed
          region: this.region!,
          containerDistributionConfiguration: {
            "TargetRepository" : {
              // Set the repository to the one created above
              "RepositoryName" : ecrRepoForImageBuilderCodeCatalyst.repositoryName,
              "Service" : "ECR"
            }
          }
        }
      ]
    });
    
    // Create the ImageBuilder pipeline using the infrastructure, distribution, and container recipe above
    const imageBuilderPipeline = new imagebuilder.CfnImagePipeline(this, "AmazonLinux2023WithGitPipeline", {
      // Prefix recipe name with stake name for inter-environment uniqueness
      name: this.stackName + '-' + "AmazonLinux23WithGitPipeline",
      infrastructureConfigurationArn: infraConfig.attrArn,
      distributionConfigurationArn: distConfig.attrArn,
      containerRecipeArn: AmazonLinux2023wGitNodeRecipe.attrArn,
      status: "ENABLED",
    });
  }
}
