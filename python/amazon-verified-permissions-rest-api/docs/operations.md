# Operations & Testing

## Post-Deployment Tasks

### Define the Client and User Pool IDs

1. In the AWS Management Console, open **Amazon Cognito** and select your user pool.
2. Copy the **App client ID** for the deployed client and the **User pool ID**.

Set them as shell variables for the commands below:

```bash
CLIENT_ID=<your-app-client-id>

USER_POOL_ID=<your-user-pool-id>
```

### Create a Test User

```bash
aws cognito-idp sign-up --client-id "$CLIENT_ID" --username demo@example.com --password 'P@ssw0rd!' --user-attributes Name=email,Value=demo@example.com

aws cognito-idp admin-confirm-sign-up --user-pool-id "$USER_POOL_ID" --username demo@example.com
```

### Assign Groups

```bash
aws cognito-idp admin-add-user-to-group --user-pool-id "$USER_POOL_ID" --username demo@example.com --group-name user

aws cognito-idp admin-add-user-to-group --user-pool-id "$USER_POOL_ID" --username demo@example.com --group-name admin # optional elevated access
```

## Request Tokens & Call the API

1. Initiate authentication:

   ```bash
   aws cognito-idp initiate-auth \
     --auth-flow USER_PASSWORD_AUTH \
     --client-id "$CLIENT_ID" \
     --auth-parameters USERNAME=demo@example.com,PASSWORD='P@ssw0rd!'
   ```

2. Extract the `AccessToken` from the response.
3. Invoke the API:

   ```bash
   API_URL=<deployment output>
   ACCESS_TOKEN=<token from initiate-auth>

   curl -i \
     -H "Authorization: Bearer $ACCESS_TOKEN" \
     "$API_URL/user"
   ```

Users in the `user` group receive `Hello from User!`. Only `admin` group members receive `Hello from Admin!` from the `/admin` route.

## Troubleshooting

- **403 errors on every route:** Ensure the token is an *access* token (not an ID token) and that the Cognito app client allows the SRP auth flow.
- **`AccessDeniedException` from AVP:** Confirm the policy store was created in a region that supports Verified Permissions and that the token issuer matches the configured user pool.
- **Caching delays:** The Request Authorizer caches decisions for 120 seconds. Use different tokens or redeploy the stack when testing new policies.

## Observability

The authorizer Lambda logs every AVP decision. Review the CloudWatch log stream for entries similar to `Decision from AVP: Allow` or `Decision from AVP: Deny`.

## Security & Operational Considerations

- Remove `RemovalPolicy.DESTROY` from the user pool before production to avoid accidental data loss.
- Replace the demo Lambda functions with real business logic or integrate with existing services.
- Integrate infrastructure-as-code validation and automated tests before promoting changes.
- Rotate Cognito secrets and enforce password policies that meet organizational requirements.

## Cleanup

To avoid ongoing charges when finished experimenting:

```bash
cdk destroy
```

Verify that the Cognito users, Verified Permissions policy store, and CloudWatch logs are removed.

## Additional Resources

- [Amazon Verified Permissions documentation](https://docs.aws.amazon.com/verifiedpermissions/latest/userguide/)
- [Cedar policy language](https://docs.cedarpolicy.com/)
- [AWS Cloud Development Kit (AWS CDK) v2](https://docs.aws.amazon.com/cdk/v2/guide/work-with-cdk-python.html)
