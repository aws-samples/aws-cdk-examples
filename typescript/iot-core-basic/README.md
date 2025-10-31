# AWS IoT Core Basic Example

## <!--BEGIN STABILITY BANNER-->

![Stability: Stable](https://img.shields.io/badge/stability-Stable-success.svg?style=for-the-badge)

> **This is a stable example. It should successfully build out of the box**

---

<!--END STABILITY BANNER-->

## Overview

This AWS CDK TypeScript example demonstrates how to set up AWS IoT Core infrastructure including:

- IoT Things (devices)
- X.509 certificates for device authentication
- IoT policies for device permissions
- Policy and certificate attachments
- Integration with AWS Kinesis for data streaming

## Real-world Use Case

IoT applications require secure device authentication and authorization. This example shows how to:
- Provision IoT devices programmatically
- Generate and manage device certificates
- Define granular access policies
- Stream IoT data to other AWS services

## Requirements

- [TypeScript v3.8+](https://www.typescriptlang.org/)
- [AWS CDK v2.x](https://docs.aws.amazon.com/cdk/v2/guide/getting_started.html)
- [Node.js 14.x+](https://nodejs.org/)

## AWS Services Utilized

- AWS IoT Core
- AWS IoT Certificate Manager
- AWS Kinesis Data Streams
- AWS IAM

## Architecture

```
IoT Device → X.509 Certificate → IoT Policy → IoT Thing → Kinesis Stream
```

## Project Structure

```
iot-core-basic/
├── bin/
│   └── iot-core-basic.ts          # CDK app entry point
├── lib/
│   └── iot-core-basic-stack.ts    # Main stack definition
├── test/
│   └── iot-core-basic.test.ts     # Unit tests
├── cdk.json                        # CDK configuration
├── package.json                    # Dependencies
├── tsconfig.json                   # TypeScript configuration
└── README.md                       # This file
```

## Deploying

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Review the CloudFormation template**:
   ```bash
   cdk synth
   ```

3. **Deploy the stack**:
   ```bash
   cdk deploy
   ```

4. **Note the outputs**:
   - Certificate ARN
   - Certificate PEM (stored in AWS Secrets Manager)
   - Private Key (stored in AWS Secrets Manager)
   - IoT Thing name
   - IoT endpoint
   - Kinesis stream name

## What Gets Created

### 1. IoT Thing
A virtual representation of your physical device in AWS IoT Core.

### 2. X.509 Certificate
A certificate for secure device authentication. The certificate and private key are:
- Generated automatically by AWS IoT
- Stored securely in AWS Secrets Manager
- Output as CloudFormation exports for easy access

### 3. IoT Policy
Defines what actions the device can perform:
- Connect to AWS IoT Core
- Publish to specific topics
- Subscribe to specific topics
- Receive messages

### 4. Kinesis Data Stream
Receives data from IoT devices for further processing.

### 5. IoT Rule
Routes messages from IoT topics to Kinesis stream.

## Using the Certificate

After deployment, retrieve the certificate and private key:

```bash
# Get certificate PEM
aws secretsmanager get-secret-value \
  --secret-id iot-device-certificate \
  --query SecretString \
  --output text

# Get private key
aws secretsmanager get-secret-value \
  --secret-id iot-device-private-key \
  --query SecretString \
  --output text
```

## Testing with MQTT

### 1. Get IoT Endpoint
```bash
aws iot describe-endpoint --endpoint-type iot:Data-ATS
```

### 2. Test with mosquitto_pub
```bash
# Save certificate and key to files
aws secretsmanager get-secret-value --secret-id iot-device-certificate --query SecretString --output text > device-cert.pem
aws secretsmanager get-secret-value --secret-id iot-device-private-key --query SecretString --output text > device-private.key

# Download Amazon Root CA
curl https://www.amazontrust.com/repository/AmazonRootCA1.pem > AmazonRootCA1.pem

# Publish a test message
mosquitto_pub \
  --cafile AmazonRootCA1.pem \
  --cert device-cert.pem \
  --key device-private.key \
  -h <your-iot-endpoint> \
  -p 8883 \
  -t "device/data" \
  -m '{"temperature": 25.5, "humidity": 60}' \
  -d
```

### 3. Monitor Kinesis Stream
```bash
# Get shard iterator
SHARD_ITERATOR=$(aws kinesis get-shard-iterator \
  --stream-name IoTDataStream \
  --shard-id shardId-000000000000 \
  --shard-iterator-type LATEST \
  --query 'ShardIterator' \
  --output text)

# Read records
aws kinesis get-records --shard-iterator $SHARD_ITERATOR
```

## Customization

### Modify IoT Policy

Edit the policy in `lib/iot-core-basic-stack.ts`:

```typescript
policyDocument: new iam.PolicyDocument({
  statements: [
    new iam.PolicyStatement({
      actions: [
        'iot:Connect',
        'iot:Publish',
        'iot:Subscribe',
        'iot:Receive'
      ],
      resources: [
        `arn:aws:iot:${this.region}:${this.account}:topic/device/*`,
        `arn:aws:iot:${this.region}:${this.account}:client/\${iot:Connection.Thing.ThingName}`
      ],
      effect: iam.Effect.ALLOW
    })
  ]
})
```

### Add Multiple Devices

Create multiple things and certificates:

```typescript
for (let i = 1; i <= 5; i++) {
  const thing = new iot.CfnThing(this, `Device${i}`, {
    thingName: `Device${i}`
  });
  
  // Create certificate for each device
  // ... (follow the pattern in the stack)
}
```

## Security Best Practices

1. **Least Privilege**: The IoT policy grants only necessary permissions
2. **Secure Storage**: Certificates and keys are stored in Secrets Manager
3. **Rotation**: Implement certificate rotation for production
4. **Monitoring**: Enable CloudWatch Logs for IoT Core
5. **Thing Groups**: Use thing groups for managing multiple devices

## Cleanup

To avoid ongoing charges, delete the stack:

```bash
cdk destroy
```

**Note**: Secrets in Secrets Manager have a recovery window. To immediately delete:

```bash
aws secretsmanager delete-secret --secret-id iot-device-certificate --force-delete-without-recovery
aws secretsmanager delete-secret --secret-id iot-device-private-key --force-delete-without-recovery
```

## Further Improvements

- Add [AWS IoT Device Defender](https://docs.aws.amazon.com/iot/latest/developerguide/device-defender.html) for security auditing
- Implement [AWS IoT Jobs](https://docs.aws.amazon.com/iot/latest/developerguide/iot-jobs.html) for device management
- Add [AWS IoT Device Shadow](https://docs.aws.amazon.com/iot/latest/developerguide/iot-device-shadows.html) for device state
- Integrate with [AWS IoT Analytics](https://docs.aws.amazon.com/iotanalytics/latest/userguide/what-is-iotanalytics.html) for data analysis
- Set up [AWS IoT Events](https://docs.aws.amazon.com/iotevents/latest/developerguide/what-is-iotevents.html) for event detection

## Resources

- [AWS IoT Core Documentation](https://docs.aws.amazon.com/iot/latest/developerguide/what-is-aws-iot.html)
- [AWS CDK IoT Module](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_iot-readme.html)
- [IoT Device SDK](https://docs.aws.amazon.com/iot/latest/developerguide/iot-sdks.html)
- [MQTT Protocol](https://docs.aws.amazon.com/iot/latest/developerguide/mqtt.html)
