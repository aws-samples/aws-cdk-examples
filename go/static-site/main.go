package main

import (
	"fmt"
	"os"

	"github.com/aws/aws-cdk-go/awscdk"
	"github.com/aws/jsii-runtime-go"
)

func main() {
	App := awscdk.NewApp(nil)

	stack := awscdk.NewStack(App, jsii.String("MyStack"), &awscdk.StackProps{
		Env: &awscdk.Environment{
			Account: jsii.String(os.Getenv("CDK_DEFAULT_ACCOUNT")),
			Region:  jsii.String(os.Getenv("CDK_DEFAULT_REGION")),
		},
	})

	NewStaticSite(stack, jsii.String("MySite"), &StaticSiteProps{
		DomainName: fmt.Sprintf("%v", stack.Node().TryGetContext(jsii.String("domainName"))),
	})

	App.Synth(nil)
}
