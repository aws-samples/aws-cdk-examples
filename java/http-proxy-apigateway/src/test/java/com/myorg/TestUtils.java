package com.myorg;

import com.fasterxml.jackson.databind.JsonNode;

import java.util.*;
import java.util.Map.Entry;
import java.util.function.Predicate;
import java.util.stream.Collectors;

import static org.junit.platform.commons.util.StringUtils.isNotBlank;

public class TestUtils {

  public static String findResourceId(Map<String, JsonNode> stackResources, Map<String, String> matchMap) {
    return Optional.ofNullable(findResource(stackResources, matchMap))
      .map(Entry::getKey)
      .orElse(null);
  }

  public static Entry<String, JsonNode> findResource(Map<String, JsonNode> stackResources, Map<String, String> matchMap) {
    return stackResources.entrySet().stream()
      .filter(createResourcePredicate(matchMap))
      .findAny()
      .orElse(null);
  }

  public static Set<String> findResourcesIds(Map<String, JsonNode> stackResources, Map<String, String> matchMap) {
    return Optional.ofNullable(findResources(stackResources, matchMap))
      .map(Map::keySet)
      .orElse(null);
  }

  public static Map<String, JsonNode> findResources(Map<String, JsonNode> stackResources, Map<String, String> matchMap) {
    return stackResources.entrySet().stream()
      .filter(createResourcePredicate(matchMap))
      .collect(Collectors.toMap(
        Entry::getKey,
        Entry::getValue
      ));
  }

  public static Set<String> extractAsStringArray(Entry<String, JsonNode> stackResource, String jsonPath) {
    return Optional.ofNullable(stackResource)
      .map(Entry::getValue)
      .flatMap(
        resource -> Optional.ofNullable(jsonPath)
          .map(resource::at)
          .map(JsonNode::elements)
          .map(iterator -> {
            var set = new HashSet<String>();
            iterator.forEachRemaining(item -> set.add(item.asText()));
            return set;
          })
      ).orElseGet(HashSet::new);
  }

  public static Predicate<Entry<String, JsonNode>> createResourcePredicate(String expectedJsonPath, String expectedJsonValue) {
    return stackResourceEntry -> Optional.ofNullable(stackResourceEntry)
      .map(Entry::getValue)
      .flatMap(
        resource -> Optional.ofNullable(expectedJsonPath)
          .map(resource::at)
          .map(JsonNode::asText)
      ).filter(propertyValue -> propertyValue.equals(expectedJsonValue))
      .isPresent();
  }

  public static Predicate<Entry<String, JsonNode>> createResourcePredicate(Map<String, String> matchMap) {
    return Optional.ofNullable(matchMap)
      .map(Map::entrySet)
      .flatMap(
        matchEntrySet -> matchEntrySet.stream()
          .filter(Objects::nonNull)
          .filter(matchEntry -> isNotBlank(matchEntry.getKey()))
          .filter(matchEntry -> isNotBlank(matchEntry.getValue()))
          .map(matchEntry -> createResourcePredicate(matchEntry.getKey(), matchEntry.getValue()))
          .reduce(Predicate::and)
      ).orElseGet(() -> entry -> false);
}

}
