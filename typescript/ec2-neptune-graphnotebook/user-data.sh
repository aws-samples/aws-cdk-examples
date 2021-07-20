#!/bin/bash

# Configure these

# This should be set to the CN for the JupyterHub instance
export CERT_DATA="/C=US/ST=Washington/L=Seattle/O=AWS/CN=jupyter.local"
# This should be the bucket name that will hold the authenticator and user-data script
export SOURCES3="maleyjm-jwtvalidation-authenticator"
# This should be the filename for the authenticator you uploaded to the s3 bucket
export PYJWTAUTH="jwtvalidation_authenticator-0.0.37-py3-none-any.whl"

# TODO
# support for other linux amis
# function to configure cloudwatch logs for system/nginx/jupyter

export JUPYTERHUB_DIR=/opt/jupyterhub
export JUPYTERHUB_CONFIG=${JUPYTERHUB_DIR}/config/jupyterhub_config.py
function get_region() {
    export AWSREGION
    AWSREGION=$(curl -s http://169.254.169.254/latest/meta-data/placement/region)
}

function get_tags() {
    export INSTANCEID
    INSTANCEID=$(curl -s http://169.254.169.254/latest/meta-data/instance-id)
    export USERNAME
    USERNAME=$(aws --region "$AWSREGION" --output text ec2 describe-tags --filters Name=resource-id,Values="${INSTANCEID}" |grep USERNAME |awk '{print $5}')
}

function create_group() {
    echo Creating group jupyterhub
    if ! grep jupyterhub /etc/group 2>&1 1>/dev/null
    then
        groupadd jupyterhub
    else
        echo Group jupyterhub already exists
    fi
}

function create_user() {
    echo Creating user "$USERNAME"
    if ! grep "$USERNAME" /etc/passwd 2>&1 1>/dev/null
    then
        sudo /sbin/useradd -c "${USERNAME}" -m -d /home/"${USERNAME}" -g jupyterhub -s /bin/bash "$USERNAME"
    else
        echo User "$USERNAME" already exists
        exit 1
    fi
}

function install_python3() {
    sudo yum -y install python3
}

function setup_environment() {
    sudo mkdir -p  $JUPYTERHUB_DIR/config
    sudo chown -R ec2-user $JUPYTERHUB_DIR
    sudo -u ec2-user python3 -m venv $JUPYTERHUB_DIR/python_venv
}

function install_jupyter() {
    source $JUPYTERHUB_DIR/python_venv/bin/activate
    python3 -m pip install jupyter jupyterhub sudospawner
}

function install_graph_notebook() {
    source $JUPYTERHUB_DIR/python_venv/bin/activate
    python3 -m pip install graph-notebook
    python3 -m pip install -U tornado
}

function configure_graph_notebook() {
    source $JUPYTERHUB_DIR/python_venv/bin/activate
    jupyter nbextension install --py --sys-prefix graph_notebook.widgets
    jupyter nbextension enable  --py --sys-prefix graph_notebook.widgets
    python3 -m graph_notebook.static_resources.install
    python3 -m graph_notebook.nbextensions.install
    python3 -m graph_notebook.notebooks.install --destination $JUPYTERHUB_DIR/graph-notebook-sample  
}

function install_nodejs() {
    cd /tmp ||exit
    curl -O https://nodejs.org/dist/v14.17.0/node-v14.17.0-linux-x64.tar.xz
    tar -xvf node-v14.17.0-linux-x64.tar.xz
    sudo cp -R node-v14.17.0-linux-x64 /usr/local/bin/
    sudo ln -s /usr/local/bin/node-v14.17.0-linux-x64 /usr/local/bin/node
}

function install_npm_proxy() {
    cat << "EOF" > /tmp/install_node.sh
export PATH=$PATH:/usr/local/bin/node/bin
npm install -g configurable-http-proxy
EOF
    sudo chmod 755 /tmp/install_node.sh
    sudo /tmp/install_node.sh
}

# this function will be replaced once this authenticator makes it to pypi
function install_authenticator() {
    cd /tmp || exit
    aws s3 cp s3://${SOURCES3}/${PYJWTAUTH} ./
    source $JUPYTERHUB_DIR/python_venv/bin/activate
    python3 -m pip install /tmp/$PYJWTAUTH    
}

function jupyterhub_config() {
    echo Creating jupyterhub_config.py
    if ! [ -f $JUPYTERHUB_CONFIG ]
    then
        cat << EOF > $JUPYTERHUB_CONFIG
c.JupyterHub.authenticator_class = 'jwtvalidation-authenticator.JWTValidationAuthenticator'
c.Authenticator.admin_users = ['$USERNAME']
c.Authenticator.allowed_users = ['$USERNAME']
c.Authenticator.aws_region = '$AWSREGION'
c.JupyterHub.base_url = '/'
c.JupyterHub.bind_url = 'http://:8000'
c.Authenticator.auto_login = True
c.Authenticator.delete_invalid_users = True
EOF
    fi
    sudo chgrp -R jupyterhub $JUPYTERHUB_DIR
    sudo chmod -R 775 $JUPYTERHUB_DIR
    sudo cp -R $JUPYTERHUB_DIR/graph-notebook-sample /home/${USERNAME}
    sudo chown -R "$USERNAME" /home/"${USERNAME}"
}

function add_jupyterhub_service() {
    cat << "EOF" > /lib/systemd/system/jupyterhub.service 
[Unit]
Description=Jupyterhub
After=network-online.target

[Service]
User=ec2-user
Environment="VIRTUAL_ENV=/opt/jupyterhub/python_venv"
Environment="PATH=$VIRTUAL_ENV/bin:/usr/bin:/usr/local/bin/node/bin:$PATH"
ExecStart=/opt/jupyterhub/python_venv/bin/jupyterhub --JupyterHub.spawner_class=sudospawner.SudoSpawner
WorkingDirectory=/opt/jupyterhub/config

[Install]
WantedBy=multi-user.target
EOF
}

function generate_cert() {
    openssl req -newkey rsa:2048 -nodes -keyout jupyter.key -x509 -days 365 -out jupyter.crt -subj "${CERT_DATA}"
    sudo mkdir -p /etc/ssl/private
    sudo chmod 700 /etc/ssl/private
    sudo mv jupyter.key /etc/ssl/private
    sudo mv jupyter.crt /etc/ssl/certs
}

function install_nginx() {
    #sudo yum install nginx
    sudo amazon-linux-extras install nginx1
}

function configure_nginx() {
    cat << "EOF" > /etc/nginx/nginx.conf
user nginx;
worker_processes auto;
error_log /var/log/nginx/error.log;
pid /run/nginx.pid;

# Load dynamic modules. See /usr/share/doc/nginx/README.dynamic.
include /usr/share/nginx/modules/*.conf;

events {
    worker_connections 1024;
}

http {
    log_format  main  '$remote_addr - $remote_user [$time_local] "$request" '
                      '$status $body_bytes_sent "$http_referer" '
                      '"$http_user_agent" "$http_x_forwarded_for"';

    access_log  /var/log/nginx/access.log  main;

    sendfile            on;
    tcp_nopush          on;
    tcp_nodelay         on;
    keepalive_timeout   65;
    types_hash_max_size 4096;

    include             /etc/nginx/mime.types;
    default_type        application/octet-stream;

    # Load modular configuration files from the /etc/nginx/conf.d directory.
    # See http://nginx.org/en/docs/ngx_core_module.html#include
    # for more information.
    include /etc/nginx/conf.d/*.conf;

    server {
        listen       80;
        listen       [::]:80;
        server_name  _;
        return 301 https://$host$request_uri;
        root         /usr/share/nginx/html;

        # Load configuration files for the default server block.
        include /etc/nginx/default.d/*.conf;

        error_page 404 /404.html;
            location = /40x.html {
        }

        error_page 500 502 503 504 /50x.html;
           location = /50x.html {
        }
    }
   server {
        listen       443 ssl http2;
        listen       [::]:443 ssl http2;
        server_name  _;
        root         /usr/share/nginx/html;

        ssl_certificate "/etc/ssl/certs/jupyter.crt";
        ssl_certificate_key "/etc/ssl/private/jupyter.key";
        ssl_session_cache shared:SSL:1m;
        ssl_session_timeout  10m;
        ssl_protocols       TLSv1 TLSv1.1 TLSv1.2;
        ssl_ciphers         AES128-SHA:AES256-SHA:RC4-SHA:DES-CBC3-SHA:RC4-MD5;
        ssl_prefer_server_ciphers on;

        # Load configuration files for the default server block.
        include /etc/nginx/default.d/*.conf;

        error_page 404 /404.html;
            location = /40x.html {
        }

        error_page 500 502 503 504 /50x.html;
            location = /50x.html {
        }
    }
}
EOF

    cat << "EOF" > /etc/nginx/default.d/reverse.conf
location / {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;

        # websocket headers
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "Upgrade";
        proxy_set_header X-Scheme $scheme;

        proxy_buffering off;
}
EOF
}

function install_git() {
    sudo yum install -y git
}

function install_sudospawner() {
    cd /tmp/ || exit
    git clone https://github.com/jupyterhub/sudospawner.git
    cd sudospawner || exit
    source $JUPYTERHUB_DIR/python_venv/bin/activate
    python3 -m pip install -e .
}

function update_sudo_secure_path() {
    cat << "EOF" > /tmp/py_venv_path
Defaults secure_path="/sbin:/bin:/usr/sbin:/usr/bin:/opt/jupyterhub/python_venv/bin"
EOF
    sudo mv /tmp/py_venv_path /etc/sudoers.d/
}

function start_services() {
    systemctl enable jupyterhub
    systemctl enable nginx
    systemctl start jupyterhub
    systemctl start nginx
}
# script entry point
get_region
get_tags
create_group
create_user
install_python3
setup_environment
install_nodejs
install_npm_proxy
install_authenticator
install_jupyter
install_graph_notebook
configure_graph_notebook
add_jupyterhub_service
jupyterhub_config
install_nginx
configure_nginx
install_git
install_sudospawner
update_sudo_secure_path
generate_cert
start_services
