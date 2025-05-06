#!/usr/bin/env node
import "source-map-support/register";
import { OpenSearchSetupStack } from "../lib/os_setup_stack";
import { CWLogsSubscriptionStack } from "../lib/cwlogs_subscription_stack";
import { App } from "aws-cdk-lib";

const app = new App();
const opensearch_stack = new OpenSearchSetupStack(
  app,
  "OpenSearchSetupStack",
  {},
);

new CWLogsSubscriptionStack(app, "CWLogsSubscriptionFilterStack", {
  ingestionEndpointURL: opensearch_stack.ingestionEndPointURL,
});