# InstanceConnectEndpoint

`InstanceConnectEndpoint` is a sample AWS CDK construct that allows you to build [EC2 Instance Connect Endpoint](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/connect-using-eice.html) in your VPC with CDK custom resource.

This sample is generated with [projen](https://github.com/projen/projen) `awscdk-construct` project type so you can reference the `.projenrc.ts` and create your own CDK construct library like this with very little modification.

# sample

```ts
// create an EIC Endpoint in an isolated subnet
new InstanceConnectEndpoint(stack, 'EICEndpoint', {
      subnet: vpc.isolatedSubnets[0],
      preserveClientIp: false,
});
```

See full sample at [integ.default.ts](./src/integ.default.ts).

# deploy the default integration test

```sh
$ cd typescripts/ec2-instance-connect-endpoint
$ yarn install
# configure your AWS CLI
$ npx cdk diff
$ npx cdk deploy
```

On deployment completed, check the instance ID from the output:

```
integ-testing-eicendpoint.InstanceId = i-01d0f0c7ca761ff29
```

Now, connect it with AWS CLI:

```sh
$ aws ec2-instance-connect ssh --instance-id i-01d0f0c7ca761ff29
```

# `awssh`

Alternatively, you can create an `awssh` alias like this:

```sh
alias awssh='aws ec2-instance-connect ssh --instance-id'
```

Now, you can just `awssh` into any ec2 instance behind the endpoint.

```sh
$ awssh i-01d0f0c7ca761ff29
```

# run the tests

```sh
$ yarn test
```

# clean up

```sh
$ npx cdk destroy
```
# API Reference <a name="API Reference" id="api-reference"></a>

## Constructs <a name="Constructs" id="Constructs"></a>

### InstanceConnectEndpoint <a name="InstanceConnectEndpoint" id="ec2-instance-connect-endpoint.InstanceConnectEndpoint"></a>

#### Initializers <a name="Initializers" id="ec2-instance-connect-endpoint.InstanceConnectEndpoint.Initializer"></a>

```typescript
import { InstanceConnectEndpoint } from 'ec2-instance-connect-endpoint'

new InstanceConnectEndpoint(scope: Construct, id: string, props: InstanceConnectEndpointProps)
```

| **Name** | **Type** | **Description** |
| --- | --- | --- |
| <code><a href="#ec2-instance-connect-endpoint.InstanceConnectEndpoint.Initializer.parameter.scope">scope</a></code> | <code>constructs.Construct</code> | *No description.* |
| <code><a href="#ec2-instance-connect-endpoint.InstanceConnectEndpoint.Initializer.parameter.id">id</a></code> | <code>string</code> | *No description.* |
| <code><a href="#ec2-instance-connect-endpoint.InstanceConnectEndpoint.Initializer.parameter.props">props</a></code> | <code><a href="#ec2-instance-connect-endpoint.InstanceConnectEndpointProps">InstanceConnectEndpointProps</a></code> | *No description.* |

---

##### `scope`<sup>Required</sup> <a name="scope" id="ec2-instance-connect-endpoint.InstanceConnectEndpoint.Initializer.parameter.scope"></a>

- *Type:* constructs.Construct

---

##### `id`<sup>Required</sup> <a name="id" id="ec2-instance-connect-endpoint.InstanceConnectEndpoint.Initializer.parameter.id"></a>

- *Type:* string

---

##### `props`<sup>Required</sup> <a name="props" id="ec2-instance-connect-endpoint.InstanceConnectEndpoint.Initializer.parameter.props"></a>

- *Type:* <a href="#ec2-instance-connect-endpoint.InstanceConnectEndpointProps">InstanceConnectEndpointProps</a>

---

#### Methods <a name="Methods" id="Methods"></a>

| **Name** | **Description** |
| --- | --- |
| <code><a href="#ec2-instance-connect-endpoint.InstanceConnectEndpoint.toString">toString</a></code> | Returns a string representation of this construct. |

---

##### `toString` <a name="toString" id="ec2-instance-connect-endpoint.InstanceConnectEndpoint.toString"></a>

```typescript
public toString(): string
```

Returns a string representation of this construct.

#### Static Functions <a name="Static Functions" id="Static Functions"></a>

| **Name** | **Description** |
| --- | --- |
| <code><a href="#ec2-instance-connect-endpoint.InstanceConnectEndpoint.isConstruct">isConstruct</a></code> | Checks if `x` is a construct. |

---

##### ~~`isConstruct`~~ <a name="isConstruct" id="ec2-instance-connect-endpoint.InstanceConnectEndpoint.isConstruct"></a>

```typescript
import { InstanceConnectEndpoint } from 'ec2-instance-connect-endpoint'

InstanceConnectEndpoint.isConstruct(x: any)
```

Checks if `x` is a construct.

###### `x`<sup>Required</sup> <a name="x" id="ec2-instance-connect-endpoint.InstanceConnectEndpoint.isConstruct.parameter.x"></a>

- *Type:* any

Any object.

---

#### Properties <a name="Properties" id="Properties"></a>

| **Name** | **Type** | **Description** |
| --- | --- | --- |
| <code><a href="#ec2-instance-connect-endpoint.InstanceConnectEndpoint.property.node">node</a></code> | <code>constructs.Node</code> | The tree node. |

---

##### `node`<sup>Required</sup> <a name="node" id="ec2-instance-connect-endpoint.InstanceConnectEndpoint.property.node"></a>

```typescript
public readonly node: Node;
```

- *Type:* constructs.Node

The tree node.

---


## Structs <a name="Structs" id="Structs"></a>

### InstanceConnectEndpointProps <a name="InstanceConnectEndpointProps" id="ec2-instance-connect-endpoint.InstanceConnectEndpointProps"></a>

#### Initializer <a name="Initializer" id="ec2-instance-connect-endpoint.InstanceConnectEndpointProps.Initializer"></a>

```typescript
import { InstanceConnectEndpointProps } from 'ec2-instance-connect-endpoint'

const instanceConnectEndpointProps: InstanceConnectEndpointProps = { ... }
```

#### Properties <a name="Properties" id="Properties"></a>

| **Name** | **Type** | **Description** |
| --- | --- | --- |
| <code><a href="#ec2-instance-connect-endpoint.InstanceConnectEndpointProps.property.subnet">subnet</a></code> | <code>aws-cdk-lib.aws_ec2.ISubnet</code> | EC2 subnet for this endpoint. |
| <code><a href="#ec2-instance-connect-endpoint.InstanceConnectEndpointProps.property.preserveClientIp">preserveClientIp</a></code> | <code>boolean</code> | whether to enable the preserveClientIp. |
| <code><a href="#ec2-instance-connect-endpoint.InstanceConnectEndpointProps.property.securityGroup">securityGroup</a></code> | <code>aws-cdk-lib.aws_ec2.ISecurityGroup[]</code> | Security groups of this endpoint. |

---

##### `subnet`<sup>Required</sup> <a name="subnet" id="ec2-instance-connect-endpoint.InstanceConnectEndpointProps.property.subnet"></a>

```typescript
public readonly subnet: ISubnet;
```

- *Type:* aws-cdk-lib.aws_ec2.ISubnet

EC2 subnet for this endpoint.

---

##### `preserveClientIp`<sup>Optional</sup> <a name="preserveClientIp" id="ec2-instance-connect-endpoint.InstanceConnectEndpointProps.property.preserveClientIp"></a>

```typescript
public readonly preserveClientIp: boolean;
```

- *Type:* boolean
- *Default:* true

whether to enable the preserveClientIp.

---

##### `securityGroup`<sup>Optional</sup> <a name="securityGroup" id="ec2-instance-connect-endpoint.InstanceConnectEndpointProps.property.securityGroup"></a>

```typescript
public readonly securityGroup: ISecurityGroup[];
```

- *Type:* aws-cdk-lib.aws_ec2.ISecurityGroup[]

Security groups of this endpoint.

---



