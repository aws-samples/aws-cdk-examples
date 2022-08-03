from aws_cdk import (
    aws_servicediscovery as sd,
    core,
)

class HttpApiServiceDiscovery(core.Stack):
    def __init__(self, app: core.App, id: str, props, **kwargs) -> None:
        super().__init__(app, id, **kwargs)

        namespace = sd.HttpNamespace(self, "httpns", name = props['namespace'])

        service = namespace.create_service("ip_service",
            description = "Service registering ip instances",
            custom_health_check = sd.HealthCheckCustomConfig(
                # The failure threshold indicates the number of 30-second intervals
                # you want AWS Cloud Map to wait between the time that your application
                # sends an UpdateInstanceCustomHealthStatus request
                failure_threshold = 1
            )
        )
        service.register_ip_instance("ip_instance", ipv4 = "54.239.25.192", port = 8080)

        core.CfnOutput(
            self, "SVCID",
            description = "SERVICE ID",
            value = service.service_id
        )

        self.output_props = props.copy()
        self.output_props['service']= service

    # pass objects to another stack
    @property
    def outputs(self):
        return self.output_props

class PrivateDnsServiceDiscovery(core.Stack):
    def __init__(self, app: core.App, id: str, props, **kwargs) -> None:
        super().__init__(app, id, **kwargs)

        namespace = sd.PrivateDnsNamespace(self, "privatedns", name = f"{props['namespace']}.local", vpc = props['vpc'])

        service = namespace.create_service("ip_service",
            dns_record_type = sd.DnsRecordType.A,
            dns_ttl = core.Duration.seconds(3),
            description = "Service registering ip instances",
        )

        core.CfnOutput(
            self, "SVCID",
            description = "SERVICE ID",
            value = service.service_id
        )

        self.output_props = props.copy()
        self.output_props['service']= service

    # pass objects to another stack
    @property
    def outputs(self):
        return self.output_props
