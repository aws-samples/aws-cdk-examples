from constructs import Construct
from aws_cdk import (
    CfnOutput,
    Stack,
    aws_ec2 as ec2,
)


class IpamStack(Stack):

    def __init__(self, scope: Construct, construct_id: str,cidr_range : str,region_cidr_range : str, **kwargs) -> None:
        super().__init__(scope, construct_id, **kwargs)

        # The code that defines your stack goes here

        
        # Ipam creation
        cfn_iPAM = ec2.CfnIPAM(self, "MyCfnIPAM",
            description="description",
            operating_regions=[ec2.CfnIPAM.IpamOperatingRegionProperty(region_name=self.region)]
        )

        # Top level ipam pool creation used by accounts or regions
        cfn_Top_IpamPool = ec2.CfnIPAMPool(self, "TOP-CfnIPAMPool",
            address_family="ipv4",
            ipam_scope_id=cfn_iPAM.attr_private_default_scope_id,

            description="top-level-pool",
            provisioned_cidrs=[ec2.CfnIPAMPool.ProvisionedCidrProperty(
                cidr=cidr_range
            )],
        )

        # region level ipam pool used by regions

        cfn_Region_iPAMPool = ec2.CfnIPAMPool(self, "Local-CfnIPAMPool",
            address_family="ipv4",
            ipam_scope_id=cfn_iPAM.attr_private_default_scope_id,
            source_ipam_pool_id=cfn_Top_IpamPool.attr_ipam_pool_id,

            description="region-level-pool",
            locale=self.region,
            provisioned_cidrs=[ec2.CfnIPAMPool.ProvisionedCidrProperty(
                cidr=region_cidr_range
            )],
            auto_import= True
            
        )


        # dependencies 
        cfn_Region_iPAMPool.add_depends_on(cfn_Top_IpamPool)
        cfn_Top_IpamPool.add_depends_on(cfn_iPAM)

        # output ressources
        ipam_pool_id = cfn_Region_iPAMPool.attr_ipam_pool_id
        self.ipam_pool_id = ipam_pool_id

        
        CfnOutput(self,"ipampoolid",value=ipam_pool_id,description="Ipam pool id",export_name="Poolid")
        CfnOutput(self,"ipamid",value=cfn_iPAM.attr_ipam_id,description="Ipamid",export_name="ipamid")