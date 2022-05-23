import { Template } from "aws-cdk-lib/assertions";
import { App, Aspects } from "aws-cdk-lib";
import { AwsSolutionsChecks } from "cdk-nag";

import { Step1SourceAccount } from "../stacks/step1-source-account";
import { Step2DestinationAccount } from "../stacks/step2-destination-account";
import { Step3SourceAccount } from "../stacks/step3-source-account";

test("Replication Role Created", () => {
  /*
  Test for Creating the Replication IAM Role
  */

  const app = new App();
  const stack = new Step1SourceAccount(app, "Step1Stack");
  const template = Template.fromStack(stack);

  template.resourceCountIs("AWS::IAM::Role", 1);
});

test("Destination S3 Bucket and KMS Key are created", () => {
  /*
  Test for Creating the KMS Key and S3 bucket in the destination account
  */

  const app = new App();
  const stack = new Step2DestinationAccount(app, "Step2Stack");
  const template = Template.fromStack(stack);

  template.resourceCountIs("AWS::S3::Bucket", 1);
  template.resourceCountIs("AWS::KMS::Key", 1);
});

test("Source S3 Bucket and KMS Key are created", () => {
  /*
  Test for Creating the KMS Key and S3 bucket in the source account
  */

  const app = new App();
  const stack = new Step3SourceAccount(app, "Step3Stack");
  const template = Template.fromStack(stack);

  template.resourceCountIs("AWS::S3::Bucket", 1);
  template.resourceCountIs("AWS::KMS::Key", 1);
});

test("cdk-nag check for project", () => {
  /*
  Test for cdk-nag messages
  */

  const app = new App();
  new Step3SourceAccount(app, "Step3Stack");
  Aspects.of(app).add(new AwsSolutionsChecks());
});
