package com.myorg;

import com.amazonaws.services.lambda.runtime.Context;
import com.amazonaws.services.lambda.runtime.events.S3ObjectLambdaEvent;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.SerializationFeature;
import com.myorg.model.TransformedObject;
import org.apache.commons.codec.digest.DigestUtils;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.WriteGetObjectResponseRequest;

import java.io.IOException;
import java.io.InputStream;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.util.Optional;

import static java.net.http.HttpResponse.BodyHandlers.ofInputStream;

public class S3ObjectLambdaTransformer {

  public void handleRequest(S3ObjectLambdaEvent event, Context context) {
    try (var s3Client = S3Client.create()) {
      var objectMapper = createObjectMapper();
      log(context, "event: " + writeValue(objectMapper, event));
      var objectContext = event.getGetObjectContext();
      var s3Url = objectContext.getInputS3Url();
      var uri = URI.create(s3Url);
      var httpClient = HttpClient.newBuilder().build();
      var httpRequest = HttpRequest.newBuilder(uri).GET().build();
      var response = httpClient.send(httpRequest, ofInputStream());
      var requestBody = RequestBody.empty();
      var responseBodyBytes = readBytes(response);
      var writeGetObjectResponseRequestBuilder = WriteGetObjectResponseRequest.builder()
        .requestRoute(event.outputRoute())
        .requestToken(event.outputToken())
        .statusCode(response.statusCode());
      if (response.statusCode() == 200) {
        var metadata = TransformedObject.Metadata.builder()
          .withLength((long) responseBodyBytes.length)
          .withMD5(DigestUtils.md5Hex(responseBodyBytes))
          .withSHA1(DigestUtils.sha1Hex(responseBodyBytes))
          .withSHA256(DigestUtils.sha256Hex(responseBodyBytes))
          .build();
        var transformedObject = TransformedObject.builder()
          .withMetadata(metadata)
          .build();
        log(context, "transformedObject: " + writeValue(objectMapper, transformedObject));
        requestBody = RequestBody.fromString(writeValue(objectMapper, transformedObject));
      } else {
        writeGetObjectResponseRequestBuilder
          .errorMessage(new String(responseBodyBytes));
      }
      s3Client.writeGetObjectResponse(writeGetObjectResponseRequestBuilder.build(), requestBody);
    } catch (IOException | InterruptedException e) {
      throw new RuntimeException("Error while handling request: " + e.getMessage(), e);
    }
  }

  private static byte[] readBytes(HttpResponse<InputStream> response) throws IOException {
    try (var inputStream = response.body()) {
      return inputStream.readAllBytes();
    }
  }

  private static void log(Context context, String message) {
    if (message != null) {
      Optional.ofNullable(context)
        .map(Context::getLogger)
        .ifPresent(lambdaLogger -> lambdaLogger.log(message));
    }
  }

  private static ObjectMapper createObjectMapper() {
    var objectMapper = new ObjectMapper();
    objectMapper.configure(SerializationFeature.FAIL_ON_EMPTY_BEANS, false);
    return objectMapper;
  }

  private static String writeValue(ObjectMapper objectMapper, Object object) {
    try {
      return objectMapper.writeValueAsString(object);
    } catch (JsonProcessingException e) {
      throw new RuntimeException(e);
    }
  }

}
