#!/bin/sh

yum install docker -y
yum install -y amazon-efs-utils

# makes a directory
mkdir /nextclouddata
mount -t efs fs-d48c7f8c:/ /nextclouddata


# enable and start docker
systemctl enable docker
systemctl start docker

# bootstraps "docker compose"
curl -L "https://github.com/docker/compose/releases/download/1.25.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
chmod +x /usr/local/bin/docker-compose
ln -s /usr/local/bin/docker-compose /usr/bin/docker-compose
usermod -aG docker ec2-user

# Gets local-persist
curl -fsSL https://raw.githubusercontent.com/CWSpear/local-persist/master/scripts/install.sh | bash
docker volume create -d local-persist -o mountpoint=/nextclouddata/nextcloud-data --name=nextcloud-data

# Heredoc for a docker-compose.yaml file
cat << 'EOF' > /home/ec2-user/docker-compose.yaml
version: '2'

volumes:
  nextcloud-data:
    external: true

services:
  app:
    image: nextcloud
    ports:
      - 8080:80
    volumes:
      - nextcloud-data:/var/www/html
    restart: always
    environment:
      - MYSQL_DATABASE=nextcloud
      - MYSQL_USER=test
      - MYSQL_PASSWORD=c5nk_iU[sCoF[2ENQT4;,{*R1%.Ngp
      - MYSQL_HOST=rr1wr5o5m6h29hu.cdtowjdbuoax.eu-central-1.rds.amazonaws.com
EOF

docker-compose -f /home/ec2-user/docker-compose.yaml up
