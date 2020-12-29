import * as cdk from "@aws-cdk/core";
import * as iam from "@aws-cdk/aws-iam";

class IamRole extends iam.Role {
  constructor(scope: cdk.Construct, id: string, props: iam.RoleProps) {
    super(scope, id, props);
  }
}

class IamSamplePolicy extends iam.Policy {
  constructor(scope: cdk.Construct, id: string, props: iam.PolicyProps) {
    super(scope, id, props);
  }
}