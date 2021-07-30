from aws_cdk import (
    core,
    aws_ec2 as ec2,
    aws_iam as iam
)

class PrivatelinkStack(core.Stack):

    def __init__(self, scope: core.Construct, id: str, 
        nlb, 
        principals_to_share_with,
        **kwargs
    ) -> None:
        super().__init__(scope, id, **kwargs)
        
        principals = []
        for principal in principals_to_share_with:
            principals.append(iam.ArnPrincipal(principal))
        
        self.endpoint = ec2.VpcEndpointService(self, "PrivatelinkRdsDemoVpcEndpoint",
            vpc_endpoint_service_load_balancers = [nlb],
            acceptance_required = False,
            allowed_principals = principals
        )
        
        core.CfnOutput(self, "Output",
            value = "Endpoint service ID: " + self.endpoint.vpc_endpoint_service_id
        )