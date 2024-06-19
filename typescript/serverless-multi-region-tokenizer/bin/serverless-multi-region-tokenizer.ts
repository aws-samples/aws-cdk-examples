#!/usr/bin/env node

/*! 
Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
SPDX-License-Identifier: MIT-0
*/

import * as cdk from 'aws-cdk-lib';
import { VpcStack, MultiRegionStore, TokenizerStack, TokenizerStackDNSStack } from '../lib/serverless-multi-region-tokenizer-stack';

//default table names etc
import { Constants } from '../lib/constants';

//for CDK-NAG testing
import { Template, Match } from 'aws-cdk-lib/assertions';
import { AwsSolutionsChecks, HIPAASecurityChecks, NIST80053R4Checks, NIST80053R5Checks } from 'cdk-nag'
import { Aspects } from 'aws-cdk-lib';


  
const app = new cdk.App();

// Add the cdk-nag AwsSolutions Pack with extra verbose logging enabled.
//Aspects.of(app).add(new AwsSolutionsChecks({ verbose: false }));

const PrimaryEnvironment : cdk.Environment = {
  account: process.env.CDK_DEFAULT_ACCOUNT, 
  region: process.env.CDK_DEFAULT_REGION
};

const ReplicaEnvironment : cdk.Environment = {
  account: process.env.CDK_DEFAULT_ACCOUNT, 
  region:  Constants.replicaRegion
};


//create a VPC in both regions, as all DDB and Lambdas will be put into it
const VpcSydney = new VpcStack(app, 'Tokenizer-VPC-Sydney', {
  env: PrimaryEnvironment
});
const VpcSingapore = new VpcStack(app, 'Tokenizer-VPC-Singapore', {
  env: ReplicaEnvironment
});


//these are the stores for sensitive data - one for each type of data e.g. driver's license number, passport number, medicare number, tax file number etc 
//each data item can set a 'TTL', after which the data will be expired from the store
//DDB tables are regional so we don't have to provide a Vpc
//The stack takes care of deploying to the primary and replica region
const SensitiveDataStoreStack = new MultiRegionStore(app, 'TokenizerStack-data', {
    env: PrimaryEnvironment
  });


const SydneyStack = new TokenizerStack(app, 'Tokenizer-Sydney', {
  env: PrimaryEnvironment,
  vpc: VpcSydney.vpc,
  kmsSecurityGroup: VpcSydney.kmsSecurityGroup,
  tokenStore: SensitiveDataStoreStack.dynamodb,
  tokenPrefix: "SYD"
});


const SingaporeStack = new TokenizerStack(app, 'Tokenizer-Singapore', {
    env: ReplicaEnvironment,
    vpc: VpcSingapore.vpc,
    kmsSecurityGroup: VpcSingapore.kmsSecurityGroup,
    tokenStore: SensitiveDataStoreStack.dynamodb,
    tokenPrefix: "SIN"
});


//if you're not deploying Route53 and APIGW, don't deploy this stack
var DNSStack;
if ((Constants.myApiSubdomain != '') && (Constants.myDomainName != '' )) {
  console.log("Generating");
    DNSStack = new TokenizerStackDNSStack(app, 'Tokenizer-DNS', {
      env: PrimaryEnvironment,  //R53 is Global
      api1: SydneyStack.api,
      api2: SingaporeStack.api
    });
}  
  