package software.amazon.awscdk.examples;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Backported helpers from JDK9
 *
 * Unfortunately our tests must run on Java8, because superchain has the old version.
 */
public class JDK9 {
  @SafeVarargs
  static <K, V> Map<K, V> mapOf(Entry<? extends K, ? extends V>... entries) {
    Map<K, V> ret = new HashMap<>();

    for (Entry<? extends K, ? extends V> entry : entries) {
      ret.put(entry.key, entry.value);
    }

    return ret;
  }

  @SafeVarargs
  static <V> List<V> listOf(V... entries) {
    List<V> ret = new ArrayList<>();

    for (V entry : entries) {
      ret.add(entry);
    }

    return ret;
  }

  static <K, V> Entry<K, V> entry(K k, V v) {
    // KeyValueHolder checks for nulls
    return new Entry<>(k, v);
  }

  public static class Entry<K,V>  {
      public final K key;
      public final V value;

      Entry(K k, V v) {
          key = k;
          value = v;
      }
  }
}