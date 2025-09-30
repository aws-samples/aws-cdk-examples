
# Amazon Verified Permissions REST API (AWS CDK Python)

This example deploys a REST API secured by Amazon Verified Permissions (AVP) and Amazon Cognito. The stack demonstrates how to combine a Cedar policy store with an API Gateway Request Authorizer so that only members of the appropriate Cognito group can invoke protected routes.

> :information_source: Detailed guides live in the `docs/` directory:
> - [`docs/architecture.md`](docs/architecture.md) – system design and authorization model
> - [`docs/deployment.md`](docs/deployment.md) – environment setup and deployment steps
> - [`docs/operations.md`](docs/operations.md) – testing, troubleshooting, and cleanup

## Solution Highlights

- **End-to-end RBAC** – Cognito users receive access tokens that are evaluated by AVP before API Gateway invokes your Lambda handlers.
- **Cedar-first design** – The Cedar schema and policies are provisioned with the `cdklabs.cdk_verified_permissions` library for repeatable deployments.
- **Composable infrastructure** – Cognito, Verified Permissions, and API Gateway live in dedicated nested stacks to make future customization straightforward.
- **Language mix** – The authorizer runs on Node.js (to use the AWS SDK for AVP), while the demo business logic stays in simple Python Lambda handlers.

| Resource | Description |
|----------|-------------|
| Cognito User Pool & Client | Provides user management and issues JWT access tokens. Adds `admin` and `user` groups. |
| Verified Permissions Policy Store | Hosts the Cedar schema and static policies mapping Cognito groups to REST actions. |
| API Gateway REST API | Exposes `/`, `/user`, and `/admin` endpoints secured by a custom Request Authorizer. |
| Lambda Functions | Node.js authorizer for AVP calls plus Python handlers that simulate protected resources. |

## Quick Start

### 1. Set Up the Environment

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

Install or upgrade the AWS CDK Toolkit if needed:

```bash
npm install -g aws-cdk@latest
```

Bootstrap the target account and region the first time you deploy CDK there:

```bash
cdk bootstrap aws://<ACCOUNT_ID>/<REGION>
```

### 2. Deploy the Stack

```bash
cdk deploy
```

Note the `ApiEndpoint` output once the deployment completes.

For additional deployment options, refer to [`docs/deployment.md`](docs/deployment.md).

## Trying the API

1. Create or confirm a Cognito user and add them to the `user` and/or `admin` groups. The implementation guide provides ready-to-run CLI snippets.
2. Authenticate against the user pool (for example, with `aws cognito-idp initiate-auth`) and capture the access token.
3. Call the API with the bearer token:

	 ```bash
	 curl -i \
		 -H "Authorization: Bearer $ACCESS_TOKEN" \
		 "$API_URL/user"
	 ```

	 - Members of the `user` group receive `Hello from User!`.
	 - Only `admin` members may call `/admin`.

## Project Layout

```
├── app.py                       # CDK entry point
├── stack/
│   ├── main.py                  # Root stack wiring together nested stacks
│   ├── apigw/                   # REST API, Lambda integrations, authorizer
│   ├── cognito/                 # Cognito user pool, client, and groups
│   ├── verified_permissions/    # Cedar schema and policies
│   └── lambdas/                 # Authorizer (Node.js) and demo handlers (Python)
└── docs/implementation-guide.md # In-depth deployment and operations guide
```

## Customizing Verified Permissions

1. Update `stack/verified_permissions/schema.py` with new entity types or actions.
2. Modify or add policy definitions under `stack/verified_permissions/policy/`.
3. Redeploy with `cdk deploy` to publish the schema and policies.

Consider migrating to policy templates if you need per-tenant or per-resource authorization decisions.

## Cleanup

Destroy the stack when you are finished to avoid unexpected charges:

```bash
cdk destroy
```

## Additional Reading

- [`docs/architecture.md`](docs/architecture.md) – architecture diagrams, component breakdown, and Cedar policy model.
- [`docs/deployment.md`](docs/deployment.md) – prerequisites, bootstrapping, and deployment workflows.
- [`docs/operations.md`](docs/operations.md) – post-deployment tasks, troubleshooting tips, and sample CLI commands.
- [Amazon Verified Permissions User Guide](https://docs.aws.amazon.com/verifiedpermissions/latest/userguide/)
- [Cedar policy language](https://www.cedarpolicy.com/)
