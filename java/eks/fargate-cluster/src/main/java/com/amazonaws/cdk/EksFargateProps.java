package com.amazonaws.cdk;

import software.amazon.awscdk.StackProps;
import software.amazon.awscdk.services.ec2.IVpc;

public interface EksFargateProps extends StackProps {

    IVpc getVpc();

    static Builder builder() {
        return new Builder();
    }

    class Builder {

        private IVpc vpc;

        public Builder vpc(final IVpc vpc) {
            this.vpc = vpc;
            return this;
        }

        public EksFargateProps build() {
            return new EksFargateProps() {

                @Override
                public IVpc getVpc() {
                    return Builder.this.vpc;
                }
            };
        }

    }

}
