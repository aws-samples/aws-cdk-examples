#!/usr/bin/env node
import * as cdk from "aws-cdk-lib";
import { StaticSiteBasic } from "./static-site-basic";

/**
 * This stack allows the user to specify a prefix path for static content in their
 * website hosting bucket.
 * Use 'cdk synth -c static-content-prefix=web/static '
 * Or add the following to cdk.json:
 * {
 *   "context": {
 *     "static-content-prefix": "web/static",
 *   }
 * }
 **/
class MyStaticSiteBasicStack extends cdk.Stack {
  constructor(parent: cdk.App, name: string, props: cdk.StackProps) {
    super(parent, name, props);

    new StaticSiteBasic(this, "StaticSiteBasic", {
      staticContentPrefix: this.node.tryGetContext("static-content-prefix"),
    });
  }
}

const app = new cdk.App();

new MyStaticSiteBasicStack(app, "MyStaticSite", {
  env: {
    account: app.node.tryGetContext("accountId"),
  },
});

app.synth();
