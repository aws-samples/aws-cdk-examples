#!/bin/bash -xe
sudo su
amazon-linux-extras install nginx1 -y
systemctl enable nginx
## Installing a self-signed certificate here.
## To-do: For Production - Get an SSL certificate from a certificate authority (CA) to configure SSL for NGINX
openssl req -x509 -nodes -days 365 -newkey rsa:2048 -keyout /etc/nginx/cert.key -out /etc/nginx/cert.crt -subj /C=US/ST=./L=./O=./CN=.
