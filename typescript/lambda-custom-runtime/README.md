# lambda-custom-runtime

This example demonstrates how to create a lambda function with the custom runtime and execute the user executable using AWS CDK.

# Sample

Create a lambda custion runtime function that executes user-provided `main.sh`, which is stored in `lambda.d`.

```ts
new CustomRuntimeFunction(this, 'Func', {
  userExecutable: 'main.sh',
  memorySize: 256,
});
```

# How it works

AWS CDK provisions a `lambda.Function` that comes with a `bootstrap` executable pulling lambda events and process each event with 
the handler. By default the handler is `function.sh.handler`, which means the `handler()` function in the `function.sh` will be executed 
and the `handler()` function executes the user executable defined in `userExecutable` prop.

The `main.sh` is a default user executable, you can replace it with any executable that can be executed in the lambda runtime(default: `lambda.Runtime.PROVIDED_AL2`).

# Deploy this sample

```sh
$ npx cdk deploy
```

# Destroy this sample

```sh
$ npx cdk destroy
```