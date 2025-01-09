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

/**
 * AWS Lambda function handler that processes S3 Object Lambda requests.
 * This class implements the transformation logic for S3 objects accessed
 * through
 * the Object Lambda Access Point.
 */
public class S3ObjectLambdaTransformer {

  /**
   * Main handler method that processes S3 Object Lambda events.
   * This method retrieves the original object from S3, applies transformations,
   * and returns the modified object data.
   *
   * @param event   The S3 Object Lambda event containing request details
   * @param context The Lambda execution context
   */
  public void handleRequest(S3ObjectLambdaEvent event, Context context) {
    try (var s3Client = S3Client.create()) {
      // Create JSON mapper and log the incoming event
      var objectMapper = createObjectMapper();
      log(context, "event: " + writeValue(objectMapper, event));

      // Extract the pre-signed URL from the event context
      var objectContext = event.getGetObjectContext();
      var s3Url = objectContext.getInputS3Url();

      // Create HTTP client and fetch the original object
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
      // Process successful responses (HTTP 200)
      if (response.statusCode() == 200) {
        // Build metadata object with content length and hash values
        var metadata = TransformedObject.Metadata.builder()
            .withLength((long) responseBodyBytes.length) // Set content length
            .withMD5(DigestUtils.md5Hex(responseBodyBytes)) // Calculate MD5 hash
            .withSHA1(DigestUtils.sha1Hex(responseBodyBytes)) // Calculate SHA1 hash
            .withSHA256(DigestUtils.sha256Hex(responseBodyBytes)) // Calculate SHA256 hash
            .build();
        // Create transformed object containing the metadata
        var transformedObject = TransformedObject.builder()
            .withMetadata(metadata)
            .build();
        // Log the transformed object for debugging
        log(context, "transformedObject: " + writeValue(objectMapper, transformedObject));
        requestBody = RequestBody.fromString(writeValue(objectMapper, transformedObject));
      } else {
        // Handle non-200 HTTP responses by setting the error message
        writeGetObjectResponseRequestBuilder
            .errorMessage(new String(responseBodyBytes)); // Convert error response body to string and set as error
                                                          // message
      }
      // Write the final response back to S3 Object Lambda with either transformed
      // object or error details
      s3Client.writeGetObjectResponse(writeGetObjectResponseRequestBuilder.build(), requestBody);
    } catch (IOException | InterruptedException e) {
      // Wrap and rethrow any IO or threading exceptions that occur during processing
      throw new RuntimeException("Error while handling request: " + e.getMessage(), e);
    }
  }

  /**
   * Reads all bytes from the input stream of an HTTP response.
   * Converts the response stream into a byte array for processing.
   *
   * @param response HTTP response containing the input stream to read
   * @return byte array containing all the data from the input stream
   * @throws IOException if an I/O error occurs while reading the stream
   */
  private static byte[] readBytes(HttpResponse<InputStream> response) throws IOException {
    try (var inputStream = response.body()) {
      return inputStream.readAllBytes();
    }
  }

  /**
   * Logs a message to CloudWatch using the Lambda context logger.
   * Prefixes the message with the request ID for tracing purposes.
   *
   * @param context Lambda execution context containing the logger
   * @param message Message to be logged
   */
  private static void log(Context context, String message) {
    if (message != null) {
      Optional.ofNullable(context)
          .map(Context::getLogger)
          .ifPresent(lambdaLogger -> lambdaLogger.log(message));
    }
  }

  /**
   * Creates and configures a Jackson ObjectMapper for JSON serialization.
   * Enables pretty printing and disables failing on empty beans.
   *
   * @return Configured ObjectMapper instance
   */
  private static ObjectMapper createObjectMapper() {
    var objectMapper = new ObjectMapper();
    objectMapper.configure(SerializationFeature.FAIL_ON_EMPTY_BEANS, false);
    return objectMapper;
  }

  /**
   * Serializes an object to a JSON string using the provided ObjectMapper.
   * Handles JsonProcessingException by returning an error message.
   *
   * @param objectMapper The ObjectMapper to use for serialization
   * @param object       The object to serialize
   * @return JSON string representation of the object or error message
   */
  private static String writeValue(ObjectMapper objectMapper, Object object) {
    try {
      return objectMapper.writeValueAsString(object);
    } catch (JsonProcessingException e) {
      throw new RuntimeException(e);
    }
  }

}
