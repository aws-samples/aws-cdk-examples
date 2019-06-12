#!/usr/bin/env node
import cdk = require('@aws-cdk/cdk');
import { StaticSite } from './static-site';

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
class MyStaticSiteStack extends cdk.Stack {
    constructor(parent: cdk.App, name: string, props: cdk.StackProps) {
        super(parent, name, props);

        new StaticSite(this, 'StaticSite', {
            domainName: this.node.tryGetContext('domain'),
            siteSubDomain: this.node.tryGetContext('subdomain'),
        });
   }
}

const app = new cdk.App();

new MyStaticSiteStack(app, 'MyStaticSite', { env: { region: 'us-east-1' } });

app.run();
