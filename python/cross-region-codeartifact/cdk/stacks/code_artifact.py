from aws_cdk import Stack, aws_codeartifact as _codeartifact, CfnOutput
from constructs import Construct

from common import CodeArtifactSettings


class CodeArtifactCrossRegionStack(Stack):
    def __init__(self, scope: Construct, construct_id: str, **kwargs) -> None:
        super().__init__(scope, construct_id, **kwargs)
        policy = CodeArtifactSettings.PERMISSION_POLICY_DOCUMENT_READ_WRITE_ORG
        codeartifact_domain = _codeartifact.CfnDomain(
            self,
            "CrossRegionArtifactDemo",
            domain_name=CodeArtifactSettings.DOMAIN,
            permissions_policy_document=policy,
        )
        codeartifact_repo = _codeartifact.CfnRepository(
            self,
            "DemoRepo",
            repository_name=CodeArtifactSettings.REPO,
            domain_name=CodeArtifactSettings.DOMAIN,
            external_connections=["public:pypi"],
        )
        codeartifact_repo.add_depends_on(codeartifact_domain)

        CfnOutput(
            self, "CodeArtifactDomain", value=codeartifact_domain.attr_arn
        )
        CfnOutput(
            self, "CodeArtifactRepo", value=codeartifact_repo.attr_arn
        )
