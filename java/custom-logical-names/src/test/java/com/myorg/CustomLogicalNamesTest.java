package com.myorg;

import org.jetbrains.annotations.NotNull;
import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.Test;
import software.amazon.awscdk.App;
import software.amazon.awscdk.Stack;
import software.amazon.awscdk.StackProps;
import software.amazon.awscdk.assertions.Template;

import java.util.HashSet;
import java.util.Map;
import java.util.Optional;
import java.util.Set;

import static software.amazon.awscdk.App.Builder;

public class CustomLogicalNamesTest {

    @Test
    public void testStack() {
        String prefixKey = "prefix";
        String prefixValue = "YourTeam";
        App app = Builder.create()
                .context(Map.of(prefixKey, prefixValue))
                .build();
        StackProps stackProps = StackProps.builder().build();
        CustomLogicalNamesStack customLogicalNamesStack = new CustomLogicalNamesStack(app, "test", stackProps);
        Set<String> resourcesNames = extractResourcesNamesFormStack(customLogicalNamesStack);
        // check if the prefix supplied on the context is used for all the resources in the stack
        Assertions.assertTrue(resourcesNames.stream().allMatch(name -> name != null && name.startsWith(prefixValue)));
    }

    private @NotNull Set<String> extractResourcesNamesFormStack(Stack stack) {
        var rawNamesSet = Optional.of(stack)
                .map(Template::fromStack)
                .map(Template::toJSON)
                .map(json -> json.get("Resources"))
                .filter(Map.class::isInstance)
                .map(Map.class::cast)
                .map(Map::keySet)
                .orElseGet(Set::of);
        Set<String> resourcesNames = new HashSet<>();
        for (Object resource : rawNamesSet) {
            Optional.of(resource)
                    .filter(String.class::isInstance)
                    .map(String.class::cast)
                    .ifPresent(resourcesNames::add);
        }
        return resourcesNames;
    }
}
