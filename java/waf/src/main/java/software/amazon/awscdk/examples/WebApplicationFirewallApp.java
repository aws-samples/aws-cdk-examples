package software.amazon.awscdk.examples;

import software.amazon.awscdk.App;

public class WebApplicationFirewallApp {
  public static void main(final String[] args) {
    App app = new App();

    new WAFCloudFrontStack(app, "WafCloudFrontStack");

    new WAFRegionalStack(app, "WafRegionalStack");

    app.synth();
  }
}