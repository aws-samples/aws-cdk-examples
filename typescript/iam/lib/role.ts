import * as cdk from "@aws-cdk/core";
import * as iam from "@aws-cdk/aws-iam";

class IamRole extends iam.Role {
  constructor(scope: cdk.Construct, id: string, props: iam.RoleProps) {
    super(scope, id, props);
    
    // Attach sample policy to user
    const policy:iam.Policy = new IamSamplePolicy(scope, "SamplePolicy");
    policy.attachToRole(this);

  }

}

class IamSamplePolicy extends iam.Policy {
  private S3_SAMPLE_ARN_1 = "EXAMPLE1";
  private S3_SAMPLE_ARN_2 = "EXAMPLE2";

  constructor(scope: cdk.Construct, id: string, props?: iam.PolicyProps) {
    super(scope, id, props);

    // Example ALLOW statement
    this.addStatements(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: ["s3:*"],
      resources: [this.S3_SAMPLE_ARN_1, this.S3_SAMPLE_ARN_2]
    }));

    // Example DENY statement
    this.addStatements(new iam.PolicyStatement({
      effect: iam.Effect.DENY,
      actions: ["s3:delete*"],
      resources: ["*"]
    }));

  }
}