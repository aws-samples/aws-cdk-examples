class EnvSettings:
    REGION_MAIN = 'ca-central-1'
    REGION_ARTIFACTS = 'us-west-2'
    # ADD Devops Account ID that will host CodePipeline and CodeArtifact Repo
    ACCOUNT = 'XXXXXXXXXXXX'
    # ADD App Account ID that where Lambda & layer will be deployed
    APP_ACCOUNT = 'XXXXXXXXXXXX'
    # Add Org ID required for adding permission org wide to CodeArtifact Repo
    ORG_ID = 'o-xxxxxxxxxx'
    PROJECT = 'crossregion-codeartifact'
    # CFN Stack name used by CodeBuild running SAM to deploy in prod account
    # using stack name defined below
    CFN_STACK_NAME_SAM_DEPLOY = 'DeployLambdaAndLayerAppAccount'
    TAGS = {
        "Project": "Demo Cross Region Code Artifact"
    }


class CodeArtifactSettings:
    DOMAIN = 'cross-region-package-domain'
    REPO = 'package-artifacts-demo'
    PERMISSION_POLICY_DOCUMENT_READ_WRITE_ORG = {
        "Version": "2012-10-17",
        "Statement": [
            {
                "Action": [
                    "codeartifact:DescribePackageVersion",
                    "codeartifact:DescribeRepository",
                    "codeartifact:GetPackageVersionReadme",
                    "codeartifact:GetRepositoryEndpoint",
                    "codeartifact:ListPackageVersionAssets",
                    "codeartifact:ListPackageVersionDependencies",
                    "codeartifact:ListPackageVersions",
                    "codeartifact:ListPackages",
                    "codeartifact:PublishPackageVersion",
                    "codeartifact:PutPackageMetadata",
                    "codeartifact:ReadFromRepository"
                ],
                "Effect": "Allow",
                "Resource": "*",
                "Principal": "*",
                "Condition": {
                    "StringEquals": {
                        "aws:PrincipalOrgID": [
                            f"{EnvSettings.ORG_ID}"
                        ]
                    }
                }
            }
        ]
    }
