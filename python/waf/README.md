WAF - Web Application Firewall
==========================

* Creates a **WAF** for with with **CloudFront** and a **WAF** for use with **Load Balancers**.



### Install CDK

* **cdk** is a **NodeJS** app.
* Install NodeJS.
* Use `npm` to install `cdk`

```bash
sudo npm install -g --force cdk
`

### Create Python Virtual Environment

```bash
python3 -m venv .venv
source .venv/bin/activate
```


### Install Python-specific modules

* Each service such as **wafv2** _(`aws_cdk.aws_wafv2`)_ or **ec2** _(`aws_cdk.aws_ec2`)_, has its own module which must be defined in `requirements.txt`.

```bash
pip3 install -r requirements.txt
```


## Build the Cloudformation from CDK

To build this example, you need to be in this example's root directory. Then run the following:

```bash
cdk synth
```

* This will build the CloudFormation template. The resulting CloudFormation template will be in the `cdk.out` directory.
* If you want to see the `yaml` formatted CDK for a Stack, pass it as a name to the `cdk synth` command:

```bash
cdk synth WafCloudFrontStack
cdk synth WafRegionalStack
```

## Deploy

Run `cdk deploy`. This will deploy / redeploy your Stack to your AWS Account.

After the deployment, you will be able to assign the WAF to the CloudFront or Load Balancer resources.




