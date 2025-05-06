#!/bin/bash -xe
sudo yum install jq -y

OS_DOMAIN_HOST=$( jq -r '.OS_DOMAIN_HOST' /etc/config.json )
COGNITO_HOST=$( jq -r '.COGNITO_HOST' /etc/config.json )
VPC_BASE_IP=$( jq -r '.VPC_BASE_IP' /etc/config.json )

echo $OS_DOMAIN_HOST
echo $COGNITO_HOST
echo $VPC_BASE_IP


IFS='.' read -ra my_array <<< "$VPC_BASE_IP"
a=(${my_array[0]})
b=(${my_array[1]})
c=(${my_array[2]})
d=(${my_array[3]})

echo $(( ($a<<24) + ($b<<16) + ($c<<8) + $d )) >counter

# Read the counter, increment, and produce IP address
read ip <counter
echo $((++ip)) >counter
echo $((++ip)) >counter


printf -v RESOLVER "%d.%d.%d.%d" $(( (ip>>24)&255 )) $(( (ip>>16)&255 )) $(( (ip>>8)&255 )) $((ip&255))
echo $RESOLVER


sudo sed -i "s/my_domain_host/$OS_DOMAIN_HOST/" /etc/nginx/conf.d/default.conf
sudo sed -i "s/my_cognito_host/$COGNITO_HOST/" /etc/nginx/conf.d/default.conf
sudo sed -i "s/my_resolver_ip/$RESOLVER/" /etc/nginx/conf.d/default.conf

sudo systemctl start nginx
sudo systemctl enable nginx
sudo systemctl status nginx.service
