# Route 53 Resolver Example

## <!--BEGIN STABILITY BANNER-->

![Stability: Experimental](https://img.shields.io/badge/stability-Experimental-important.svg?style=for-the-badge)

> **This is an experimental example. It may not build out of the box**
>
> This examples is built on Construct Libraries marked "Experimental" and may not be updated for latest breaking changes.
>
> If build is unsuccessful, please create an [issue](https://github.com/aws-samples/aws-cdk-examples/issues/new) so that we may debug the problem

---

<!--END STABILITY BANNER-->

This is an example of creating a Route 53 Resolver, for in-VPC DNS, with CDK. It makes use of the [@aws-cdk/aws-route53resolver-alpha module](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-route53resolver-alpha-readme.html) for L2 constructs, and L1 Constructs provided by classes in `aws-cdk-lib/aws-route53resolver`.

### DNS Firewall

The L2 construct demos in this example includes the following:

- A DNS firewall, making use of domain blocklists to prevent access to nominated domains.

The L1 Construct examples make use of the `CfnResolverEndpoint` from `aws-cdk-lib/route53-resolver`. Two deploy these, the example deploys a VPC. The endpoints are:

### Inbound Endpoint

- An inbound endpoint, which will respond to queries from _inside_ the VPC.
  - The endpoint will have two IP addresses from the VPC CIDR range.
  - Those IPs will be selected at deploy time, and you can see them in the R53 Resolver console - the CDK will also generate direct links to the console for you to check.
  - If you want to test the endpoint, you can deploy resources into your VPC to do so. For example, you might deploy an EC2 instance so you can run `dig` for various domains against the resolver endpoints.

### Outbound Endpoint

- An outbound endpoint, which respond to queries from _outside_ the VPC.
  - The VPC does not have any connectivity to the outside world. The endpoint is set up to only respond to results from RFC5737 TEST-NET-3 (203.0.113.0/24).
  - If you would like to test the endpoint, connect the VPC to another network - for example via an internet gateway, VPC peer, or site-to-site VPN. You will need to change the IP allowlist to your source network(s).
