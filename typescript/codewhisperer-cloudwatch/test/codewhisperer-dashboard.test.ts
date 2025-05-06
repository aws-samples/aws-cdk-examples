import { Template } from "aws-cdk-lib/assertions";
import { App } from "aws-cdk-lib";
import { CodewhispererDashboardStack } from "../lib/codewhisperer-dashboard-stack";

test("Dashboards Created", () => {
  const app = new App();
  const stack = new CodewhispererDashboardStack(app, "TestStack");
  const template = Template.fromStack(stack);

  template.resourceCountIs("AWS::CloudWatch::Dashboard", 2);
});
