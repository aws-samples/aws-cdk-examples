package main

import (
	"fmt"
	"os"

	"github.com/aws/aws-cdk-go/awscdk"
	"github.com/aws/aws-sdk-go-v2/aws"
)

func main() {
	App := awscdk.NewApp(&awscdk.AppProps{})

	stack := awscdk.NewStack(App, aws.String("MyStack"), &awscdk.StackProps{
		Env: &awscdk.Environment{
			Account: aws.String(os.Getenv("CDK_DEFAULT_ACCOUNT")),
			Region:  aws.String(os.Getenv("CDK_DEFAULT_REGION")),
		},
	})

	NewStaticSite(stack, aws.String("MySite"), &StaticSiteProps{
		DomainName: fmt.Sprintf("%v", stack.Node().TryGetContext(aws.String("domainName"))),
	})

	App.Synth(&awscdk.StageSynthesisOptions{})
}
