#!/usr/bin/env node
import "source-map-support/register";
import * as cdk from "aws-cdk-lib";
import { R53ResolverStack } from "../lib/r53-resolver-stack";

const app = new cdk.App();
new R53ResolverStack(app, "R53ResolverStack");
