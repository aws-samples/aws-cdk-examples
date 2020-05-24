import { expect as expectCDK, matchTemplate, MatchStyle } from '@aws-cdk/assert';
import * as cdk from '@aws-cdk/core';
import * as CognitoIdp from '../lib/cognito-idp-stack';

// test('Empty Stack', () => {
//     const app = new cdk.App();
//     // WHEN
//     const stack = new CognitoIdp.CognitoIdpStack(app, 'MyTestStack');
//     // THEN
//     expectCDK(stack).to(matchTemplate({
//       "Resources": {}
//     }, MatchStyle.EXACT))
// });
