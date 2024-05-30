package com.myorg;

import org.jetbrains.annotations.NotNull;
import org.jetbrains.annotations.Nullable;
import software.amazon.awscdk.CfnElement;
import software.amazon.awscdk.Stack;
import software.amazon.awscdk.StackProps;
import software.constructs.Construct;

import java.util.Optional;

public class BaseStack extends Stack {

    public BaseStack(@Nullable Construct scope, @Nullable String id, @Nullable StackProps props) {
        super(scope, id, props);
    }

    @Override
    protected @NotNull String allocateLogicalId(@NotNull CfnElement element) {
        String originalLogicalId = super.allocateLogicalId(element);
        return Optional.of(this)
                .map(Stack::getNode)
                .flatMap(
                        node -> Optional.of("prefix")
                                .map(node::tryGetContext)
                                .filter(String.class::isInstance)
                                .map(String.class::cast)
                                .map(StringBuilder::new)
                )
                .flatMap(
                        stringBuilder -> Optional.of(originalLogicalId)
                                .map(stringBuilder::append)
                                .map(StringBuilder::toString)
                )
                .orElse(originalLogicalId);
    }
}