import * as cdk from "@aws-cdk/core";
import * as iam from "@aws-cdk/aws-iam";
import { IamRole } from "./role";

/**
 * Main IAM Role Stack
 */
export class IamStack extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);


    // Custom role class with pre-defined policy
    // See "./role.ts"
    const role = new IamRole(this, "IAMSampleRole1", {
      assumedBy: new iam.ServicePrincipal("s3.amazonaws.com")
    });

    // Example of existing policy lookup for permissions boundary
    const role2 = new IamRole(this, "IAMSampleRole2", {
      assumedBy: new iam.ServicePrincipal("s3.amazonaws.com"),
      permissionsBoundary: iam.ManagedPolicy.fromManagedPolicyName(this, "perm-boundary-lookup", "ExistingPolicyName")
    });

    // Example of policy lookup AFTER initialisation (via .addManagedPolicy())
    const role3 = new IamRole(this, "IAMSampleRole3", {
      assumedBy: new iam.ServicePrincipal("s3.amazonaws.com"),
    });

    role3.addManagedPolicy(iam.ManagedPolicy.fromAwsManagedPolicyName("ExistingPolicyName2"));

  }
}
