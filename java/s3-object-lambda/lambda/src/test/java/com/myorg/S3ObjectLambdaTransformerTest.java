package com.myorg;

import com.amazonaws.services.lambda.runtime.events.S3ObjectLambdaEvent;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.MockedStatic;
import org.mockito.junit.jupiter.MockitoExtension;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.WriteGetObjectResponseRequest;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;

import static com.amazonaws.services.lambda.runtime.events.S3ObjectLambdaEvent.GetObjectContext;
import static java.net.http.HttpResponse.BodyHandlers.ofInputStream;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class S3ObjectLambdaTransformerTest {

  @Mock
  private S3Client s3Client;
  @Mock
  private HttpClient.Builder httpClientBuilder;
  @Mock
  private HttpClient httpClient;
  @Mock
  private HttpResponse<InputStream> response;

  private final S3ObjectLambdaTransformer s3ObjectLambdaTransformer = new S3ObjectLambdaTransformer();

  @Test
  void testHandleRequest() throws IOException, InterruptedException {
    var s3ObjectContent = "S3 test data.";
    var event = S3ObjectLambdaEvent.builder()
      .withGetObjectContext(
        GetObjectContext.builder()
          .withInputS3Url("https://s3-access-point-111111111111.s3-accesspoint.eu-north-1.amazonaws.com/test.txt")
          .build()
      )
      .build();
    try (
      MockedStatic<S3Client> mockedStaticS3Client = mockStatic(S3Client.class);
      MockedStatic<HttpClient> mockedStaticHttpClient = mockStatic(HttpClient.class)
    ) {
      mockedStaticS3Client.when(S3Client::create).thenReturn(s3Client);
      mockedStaticHttpClient.when(HttpClient::newBuilder).thenReturn(httpClientBuilder);
      when(httpClientBuilder.build()).thenReturn(httpClient);
      when(httpClient.send(any(HttpRequest.class), eq(ofInputStream()))).thenReturn(response);
      when(response.statusCode()).thenReturn(200);
      when(response.body()).thenReturn(new ByteArrayInputStream(s3ObjectContent.getBytes(StandardCharsets.UTF_8)));
      s3ObjectLambdaTransformer.handleRequest(event, null);
      // test if the writeGetObjectResponse method of the s3Client instance is called to send the transformed object
      verify(s3Client).writeGetObjectResponse(any(WriteGetObjectResponseRequest.class), any(RequestBody.class));
    }
  }

}
