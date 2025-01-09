package com.myorg.model;

import lombok.*;

/**
 * Represents a transformed S3 object with its metadata.
 * This class uses Lombok annotations for builder pattern, toString, and data methods generation.
 */
@Builder(setterPrefix = "with", builderClassName = "TransformedObjectBuilder")
@ToString
@Data
public class TransformedObject {

  /**
   * Record class representing the metadata of a transformed object.
   * Contains various hash values and the object length for verification purposes.
   */
  @Builder(setterPrefix = "with", builderClassName = "MetadataBuilder")
  public record Metadata(Long length, String MD5, String SHA1, String SHA256) {

  }

  private Metadata metadata;
}
