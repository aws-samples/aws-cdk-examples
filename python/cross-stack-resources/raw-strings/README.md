
# Raw String Example For Passing Resources Between Stacks!

If you're coming from a strong background in cloudformation, you may either
have a preference for passing resources as strings (the way AWS Cloudformation
does natively) or your existing infrastructure may already extensively leverage
imports/exports and you'd like to maintain a consistent paradigm across your
applications.

In this example we create an AWS Lambda Function in one stack and then make its
ARN available as a property of that stack for other stacks to consume.

in infrastructure_stack.py:
```python
@property
def main_function_arn(self):
    return self._function_arn
```

We later refrence this property in app.py as follows:
```python
infra.main_function_arn
```
where `infra` is the variable we use to identify our InfrastructureStack.