yum install jq -y

EC2_METADATA=http://169.254.169.254/latest
REGION=$(curl -s $EC2_METADATA/dynamic/instance-identity/document | jq -r '.region')
AZ=$(curl -s $EC2_METADATA/meta-data/placement/availability-zone)
INSTANCE_ID=$(curl -s $EC2_METADATA/meta-data/instance-id)
INSTANCE_IP=$(curl -s $EC2_METADATA/meta-data/local-ipv4)


NAMESPACE_ID=$(aws servicediscovery list-namespaces --output text --region $REGION \
  --filter Name=TYPE,Values=HTTP,Condition="EQ" \
  --query 'Namespaces[*].[Id]')

SERVICE_ID=$(aws servicediscovery list-services --output text --region $REGION \
  --filter Name=NAMESPACE_ID,Values=${NAMESPACE_ID},Condition="EQ" \
  --query 'Services[*].[Id]')


###
# register new instance ip
###
echo "Register instance"
aws servicediscovery register-instance \
  --region $REGION \
  --service-id $SERVICE_ID \
  --instance-id $INSTANCE_ID \
  --attributes AWS_INSTANCE_IPV4=$INSTANCE_IP,AWS_INSTANCE_PORT=8080,AVAILABILITY_ZONE=$AZ

sleep 3

echo "List instances"
aws servicediscovery list-instances \
  --region $REGION \
  --service-id $SERVICE_ID

sleep 20

echo "Update Health Status"
aws servicediscovery get-instances-health-status \
  --region $REGION \
  --service-id $SERVICE_ID \
  --instances $INSTANCE_ID

aws servicediscovery update-instance-custom-health-status \
  --region $REGION \
  --service-id $SERVICE_ID \
  --instance-id $INSTANCE_ID \
  --status UNHEALTHY

sleep 30

aws servicediscovery get-instances-health-status \
  --region $REGION \
  --service-id $SERVICE_ID \
  --instances $INSTANCE_ID


###
# deregister existing instance ip
###
#aws servicediscovery deregister-instance \
#  --region $REGION \
#  --service-id $SERVICE_ID \
#  --instance-id $INSTANCE_ID
#
#sleep 3
#
#aws servicediscovery list-instances \
#  --region $REGION \
#  --service-id $SERVICE_ID
