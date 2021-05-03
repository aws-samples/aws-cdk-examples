from aws_cdk import (
    core
)

from .static_site_construct import StaticSiteConstruct, StaticSiteProps


class MyStack(core.Stack):

    def __init__(self, scope: core.Construct, id: str, **kwargs) -> None:
        super().__init__(scope, id, **kwargs)

        props: StaticSiteProps = StaticSiteProps(
            domain_name=scope.node.try_get_context('domain'),
            site_sub_domain=scope.node.try_get_context('sub_domain'),
            hosted_zone_id=scope.node.try_get_context('hosted_zone_id')
        )

        print(props.domain_name)
        print(props.site_sub_domain)

        StaticSiteConstruct(self, "MyStaticSiteConstruct", props)
