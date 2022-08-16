import * as fs from "fs";
import * as path from "path";
import * as cdk from "aws-cdk-lib";
import * as iot from "aws-cdk-lib/aws-iot";
import * as iam from "aws-cdk-lib/aws-iam";
import { Construct } from "constructs";

class CertificateStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: cdk.StackProps) {
    super(scope, id);

    const caCert = new iot.CfnCACertificate(this, "CACertificate", {
      caCertificatePem: fs.readFileSync(
        path.resolve("certs/root_CA_cert_filename.pem"),
        "utf8"
      ),
      status: "ACTIVE",
      verificationCertificatePem: fs.readFileSync(
        path.resolve("certs/verification_cert_filename.pem"),
        "utf8"
      ),
    });

    const cert = new iot.CfnCertificate(this, "Certificate", {
      status: "ACTIVE",
      certificatePem: fs.readFileSync(
        path.resolve("certs/device_cert_filename.pem"),
        "utf8"
      ),
      caCertificatePem: fs.readFileSync(
        path.resolve("certs/root_CA_cert_filename.pem"),
        "utf8"
      ),
    });
    cert.node.addDependency(caCert);

    const thing = new iot.CfnThing(this, "Thing", {
      thingName: "AwsCdkExample-thing",
    });

    const policy = new iot.CfnPolicy(this, "Policy", {
      policyDocument: new iam.PolicyDocument({
        statements: [
          new iam.PolicyStatement({
            actions: ["iot:GetThingShadow", "iot:UpdateThingShadow"],
            resources: [
              this.formatArn({
                service: "iot",
                resource: "thing",
                resourceName: thing.ref,
              }),
            ],
          }),
        ],
      }).toJSON(),
    });

    new iot.CfnThingPrincipalAttachment(this, "TPA", {
      thingName: thing.ref,
      principal: cdk.Token.asString(cert.getAtt("Arn")),
    });

    new iot.CfnPolicyPrincipalAttachment(this, "PPA", {
      policyName: cdk.Token.asString(policy.getAtt("Id")),
      principal: cdk.Token.asString(cert.getAtt("Arn")),
    });
  }
}

const app = new cdk.App();
new CertificateStack(app, "AwsCdkExample-CertificateStack", {});
