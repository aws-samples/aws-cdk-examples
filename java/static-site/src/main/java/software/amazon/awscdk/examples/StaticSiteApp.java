package software.amazon.awscdk.examples;

import software.amazon.awscdk.core.App;
import software.amazon.awscdk.core.Environment;
import software.amazon.awscdk.core.Stack;
import software.amazon.awscdk.core.StackProps;
import java.util.HashMap;
import java.util.Map;

public class StaticSiteApp extends Stack {

    /**
     * This stack relies on getting the domain name from CDK context.
     * Use 'cdk synth -c domain=mystaticsite.com -c subdomain=www'
     * Or add the following to cdk.json:
     * {
     *   "context": {
     *     "domain": "mystaticsite.com",
     *     "subdomain": "www"
     *   }
     * }
    **/
   
    public StaticSiteApp(App scope, String id, StackProps props) {
        super(scope, id, props);

        // Getting domain and subdomain values from Context

        Map<String, Object> domainValues = new HashMap<String, Object>();
        domainValues.put("domainName", this.getNode().tryGetContext("domain"));
        domainValues.put("siteSubDomain",this.getNode().tryGetContext("subdomain"));
        
        // Call StaticSiteStack to create the stack
        new StaticSiteStack(this, "MyStaticSite", domainValues);

    }
    public static void main(final String argv[]) {

        App app = new App();

        // Stack must be in us-east-1, because the ACM certificate for a
        // global CloudFront distribution must be requested in us-east-1.
        StackProps pr = new StackProps.Builder().env(Environment.builder().region("us-east-1").account(System.getenv("CDK_DEFAULT_ACCOUNT")).build())
                .build();
        
        new StaticSiteApp(app,"MyStaticSite", pr);
        app.synth();
        
      }
}


