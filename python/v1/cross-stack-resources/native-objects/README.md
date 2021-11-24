
# Native Objects Example For Passing Resources Between Stacks!

One of my favorite parts about CDK is that I don't have to be concerned with how
the underlying cloudformation expects resources. Ideally the level of
abstraction that I want to deal with is that I have a Lambda Function in one
stack and I want to just hand the whole function to other stacks that need it.
I do not have to worry about whether API Gateway expects a Function Name or a
Function ARN or some other identifier for a Function, I can simply pass the
Function Object to the stacks that need it and let CDK handle the details.

In this example we create an AWS Lambda Function in one stack and then make it
available as a property of that stack for other stacks to consume.

in infrastructure_stack.py:
```python
@property
def main_function(self) -> lambda_.IFunction:
    return self._function
```

We later refrence this property in app.py as follows:
```python
infra.main_function
```
where `infra` is the variable we use to identify our InfrastructureStack.