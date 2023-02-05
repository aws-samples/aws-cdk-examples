package main

import (
	"os"

	"github.com/aws/aws-cdk-go/awscdk/v2"
	"github.com/aws/aws-cdk-go/awscdk/v2/awscognito"
	"github.com/aws/aws-cdk-go/awscdkapigatewayv2alpha/v2"
	"github.com/aws/constructs-go/constructs/v10"
	"github.com/aws/jsii-runtime-go"
)

type CognitoHttpapiStackProps struct {
	awscdk.StackProps
}

func NewCognitoHttpapiStack(scope constructs.Construct, id string, props *CognitoHttpapiStackProps) awscdk.Stack {
	var sprops awscdk.StackProps
	if props != nil {
		sprops = props.StackProps
	}
	stack := awscdk.NewStack(scope, &id, &sprops)

	// create Cognito User Pool
	userpool := awscognito.NewUserPool(stack, jsii.String("myCognitoUserPool"), &awscognito.UserPoolProps{
		UserPoolName: jsii.String("myCognitoUserPool"),
		PasswordPolicy: &awscognito.PasswordPolicy{
			MinLength: jsii.Number(8),
		},
		AccountRecovery: awscognito.AccountRecovery_EMAIL_ONLY,
		AutoVerify: &awscognito.AutoVerifiedAttrs{
			Email: jsii.Bool(true),
		},
		StandardAttributes: &awscognito.StandardAttributes{
			Email: &awscognito.StandardAttribute{
				Required: jsii.Bool(true),
				Mutable:  jsii.Bool(false),
			},
		},
		SignInAliases: &awscognito.SignInAliases{
			Email: jsii.Bool(true),
		},
		SelfSignUpEnabled: jsii.Bool(true),
	})

	// create Cognito User Pool Domain
	userPoolDomain := awscognito.NewUserPoolDomain(stack, jsii.String("MyUserPoolDomain"), &awscognito.UserPoolDomainProps{
		UserPool: userpool,
		CognitoDomain: &awscognito.CognitoDomainOptions{
			DomainPrefix: jsii.String("myauth"),
		},
	})

	// create Cognito User Pool Client
	userPoolClient := awscognito.NewUserPoolClient(stack, jsii.String("MyUserPoolClient"), &awscognito.UserPoolClientProps{
		UserPoolClientName: jsii.String("MyUserPoolClient"),
		UserPool:           userpool,
		GenerateSecret:     jsii.Bool(false),
		SupportedIdentityProviders: &[]awscognito.UserPoolClientIdentityProvider{
			awscognito.UserPoolClientIdentityProvider_COGNITO(),
		},
		AuthFlows: &awscognito.AuthFlow{
			UserPassword:      jsii.Bool(true),
			AdminUserPassword: jsii.Bool(true),
		},
		OAuth: &awscognito.OAuthSettings{
			LogoutUrls:   jsii.Strings("https://oauth.pstmn.io/v1/callback"),
			CallbackUrls: jsii.Strings("https://oauth.pstmn.io/v1/callback"),
			Flows: &awscognito.OAuthFlows{
				AuthorizationCodeGrant: jsii.Bool(true),
				ImplicitCodeGrant:      jsii.Bool(true),
			},
			Scopes: &[]awscognito.OAuthScope{
				awscognito.OAuthScope_EMAIL(),
				awscognito.OAuthScope_OPENID(),
				awscognito.OAuthScope_PROFILE(),
			},
		},
	})

	// create HTTP API
	httpApi := awscdkapigatewayv2alpha.NewHttpApi(stack, jsii.String("MyHttpApi"), &awscdkapigatewayv2alpha.HttpApiProps{
		ApiName: jsii.String("MyHttpApi"),
		CorsPreflight: &awscdkapigatewayv2alpha.CorsPreflightOptions{
			AllowMethods: &[]awscdkapigatewayv2alpha.CorsHttpMethod{
				awscdkapigatewayv2alpha.CorsHttpMethod_GET,
			},
		},
	})

	// add JWT authorizer to previously created HTTP API
	awscdkapigatewayv2alpha.NewHttpAuthorizer(stack, jsii.String("MyHttpAuthorizer"), &awscdkapigatewayv2alpha.HttpAuthorizerProps{
		AuthorizerName: jsii.String("MyHttpAuthorizer"),
		Type:           awscdkapigatewayv2alpha.HttpAuthorizerType_JWT,
		HttpApi:        httpApi,
		JwtIssuer:      jsii.String("https://cognito-idp." + *props.Env.Region + ".amazonaws.com/" + *userpool.UserPoolId()),
		JwtAudience:    jsii.Strings(*userpool.UserPoolId()),
		IdentitySource: jsii.Strings("$request.header.Authorization"),
	})

	// log authorizer URL
	awscdk.NewCfnOutput(stack, jsii.String("authUrl"), &awscdk.CfnOutputProps{
		Value: jsii.String("https://" + *userPoolDomain.DomainName() + ".auth." + *props.Env.Region + ".amazoncognito.com/login"),
	})

	// log user pool client ID
	awscdk.NewCfnOutput(stack, jsii.String("UserPoolClientId"), &awscdk.CfnOutputProps{
		Value: userPoolClient.UserPoolClientId(),
	})

	return stack
}

func main() {
	app := awscdk.NewApp(nil)

	NewCognitoHttpapiStack(app, "CognitoHttpapiStack", &CognitoHttpapiStackProps{
		awscdk.StackProps{
			Env: env(),
		},
	})

	app.Synth(nil)
}

func env() *awscdk.Environment {
	return &awscdk.Environment{
		Region: jsii.String(os.Getenv("AWS_DEFAULT_REGION")),
	}
}
