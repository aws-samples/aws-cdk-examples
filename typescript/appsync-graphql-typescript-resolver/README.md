# Bundle AppSync JavaScript resolvers via CDK and TypeScript sources

This example shows how to use [CDK Bundling](https://aws.amazon.com/blogs/devops/building-apps-with-aws-cdk/) to
transpile TypeScript source files and use them as [AppSync JavaScript resolvers](https://docs.aws.amazon.com/appsync/latest/devguide/resolver-reference-js-version.html).


The process of bundling the resolvers follows the approach recommended in the [AppSync documentation](https://docs.aws.amazon.com/appsync/latest/devguide/resolver-reference-overview-js.html#additional-utilities)
for working with TypeScript.
