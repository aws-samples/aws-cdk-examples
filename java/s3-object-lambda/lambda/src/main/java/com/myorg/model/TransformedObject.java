package com.myorg.model;

import lombok.*;

@Builder(setterPrefix = "with", builderClassName = "TransformedObjectBuilder")
@ToString
@Data
public class TransformedObject {

  @Builder(setterPrefix = "with", builderClassName = "MetadataBuilder")
  public record Metadata(Long length, String MD5, String SHA1, String SHA256) {

  }

  private Metadata metadata;
}
