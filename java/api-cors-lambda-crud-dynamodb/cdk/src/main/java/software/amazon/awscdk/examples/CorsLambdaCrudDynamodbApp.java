package software.amazon.awscdk.examples;

import software.amazon.awscdk.App;

public class CorsLambdaCrudDynamodbApp {
    public static void main(final String[] args) {
        App app = new App();

        new CorsLambdaCrudDynamodbStack(app, "cdk-cors-lambda-crud-dynamodb-example");

        app.synth();
    }
}
