#!/usr/bin/env node
import "source-map-support/register";
import { OsisOpenSearchSetupStack } from "../lib/osis_os_setup_stack";
import { OsisCWLogsSubscriptionStack } from "../lib/osis_cwlogs_subscription_stack";
import { App } from "aws-cdk-lib";

const app = new App();
const osis_os_stack = new OsisOpenSearchSetupStack(
  app,
  "OsisOpenSearchSetupStack",
  {},
);

new OsisCWLogsSubscriptionStack(app, "OsisCWLogsSubscriptionFilterStack", {
  ingestionEndpointURL: osis_os_stack.ingestionEndPointURL,
});