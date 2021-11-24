package com.myorg.utils;

import java.io.IOException;
import java.io.InputStream;
import java.util.Properties;
import software.amazon.awscdk.services.ec2.UserData;

public class PropertyLoader {

  private final UserData userData;
  private String prodMobileMessageBody;
  private String prodApiMessageBody;
  private String sandboxApiMessageBody;
  private String sandboxMobileMessageBody;
  private String restAPIHostHeader;
  private String restMobileHostHeader;

  public PropertyLoader() {
    userData = UserData.forLinux();
    load();
  }

  public UserData getUserData() {
    return userData;
  }

  public String getProdMobileMessageBody() {
    return prodMobileMessageBody;
  }

  public String getProdApiMessageBody() {
    return prodApiMessageBody;
  }

  public String getSandboxApiMessageBody() {
    return sandboxApiMessageBody;
  }

  public String getSandboxMobileMessageBody() {
    return sandboxMobileMessageBody;
  }

  public String getRestAPIHostHeader() {
    return restAPIHostHeader;
  }

  public String getRestMobileHostHeader() {
    return restMobileHostHeader;
  }

  private void load() {
    // start loading data from the properties files
    try (InputStream input =
        PropertyLoader.class.getClassLoader().getResourceAsStream("mydata.properties")) {

      Properties prop = new Properties();
      if (input == null) {
        System.out.println("unable to find mydata.properties");
        return;
      }

      // get the values from the properties file
      prop.load(input);

      // start populating values
      prodMobileMessageBody = prop.getProperty("response.prodMobileV1");
      prodApiMessageBody = prop.getProperty("response.prodApiV1");
      sandboxApiMessageBody = prop.getProperty("response.sandboxApiV1");
      sandboxMobileMessageBody = prop.getProperty("response.sandboxMobileV1");
      restAPIHostHeader = prop.getProperty("rest.api");
      restMobileHostHeader = prop.getProperty("rest.mobile");

      String[] cmds = prop.getProperty("userData.commands").split("\n");
      if (cmds.length > 0) {
        for (String cmd : cmds) {
          userData.addCommands(cmd);
        }
      }
    } catch (IOException ex) {
      ex.printStackTrace();
    }
  }
}
