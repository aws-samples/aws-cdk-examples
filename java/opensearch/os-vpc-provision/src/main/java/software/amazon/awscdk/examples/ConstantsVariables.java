package software.amazon.awscdk.examples;

import java.util.Random;

public class ConstantsVariables {
    // Jump host specific settings to run nginx proxy
    // https://docs.aws.amazon.com/opensearch-service/latest/developerguide/supported-instance-types.html
    public static final String EC_INSTANCE_TYPE = "c5.large.search";

    // Fill this in with a valid email to receive an SNS notifications
    public static final String SNS_NOTIFICATION_EMAIL = "someone@example.com";

    // OpenSearch specific constants
    public static final String DOMAIN_NAME = "opensearch_101";
    public static final String DOMAIN_NAME_ADMIN_USERNAME = "opensearch";
    public static final String DOMAIN_NAME_ADMIN_PASSWORD = generateRandomPassword();
    // https://docs.aws.amazon.com/opensearch-service/latest/developerguide/supported-instance-types.html

    public static final String DOMAIN_MASTER_NODE_INSTANCE_TYPE = "c5.large.search";
    public static final int DOMAIN_MASTER_NODE_INSTANCE_COUNT = 3;

    public static final String DOMAIN_NAME_DATA_NODE_INSTANCE_TYPE = "c5.large.search";
    public static final int DOMAIN_NAME_DATA_NODE_INSTANCE_COUNT = 2;
    // UltraWarm provides a cost-effective way to store large amounts of read-only
    // data on Amazon OpenSearch Service.
    // https://docs.aws.amazon.com/opensearch-service/latest/developerguide/ultrawarm.html
    // https://docs.aws.amazon.com/opensearch-service/latest/developerguide/limits.html#limits-ultrawarm
    public static final String DOMAIN_NAME_ULRAWARM_NODE_INSTANCE_TYPE = "ultrawarm1.medium.search";
    public static final int DOMAIN_NAME_ULRAWARM_NODE_INSTANCE_COUNT = 2;
    /***
     * Calculate storage requirements
     * - Source data size
     * - Number of replicas - each replica is a full copy of an index and needs same
     * amount of disk space
     * - Operating system reserved space
     * - OpenSearch service overhead - 20% of storage space of each instance
     * Formulat = source data * (1 + number of replicas)* 1.45 == miminum storage
     * requirement
     */
    public static final int DOMAIN_INSTANCE_VOLUME_SIZE = 100;

    public static final int DOMAIN_AZ_COUNT = 2;

    private static String generateRandomPassword() {
        Random random = new Random();
        StringBuilder password = new StringBuilder();
        String charactersRegex = "[A-Za-z0-9]";
        for (int i = 0; i < 13; i++) {
            int randomIndex = random.nextInt(charactersRegex.length());
            password.append(charactersRegex.charAt(randomIndex));
        }
        return password.toString();
    }
}
