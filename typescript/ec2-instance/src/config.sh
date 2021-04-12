#!/bin/bash -xe

# HOMEDIR=/home/ec2-user
# yum update -y
# yum install net-tools -y
# yum install wget -y
# yum -y install make gcc gcc-c++ make subversion libxml2-devel ncurses-devel openssl-devel vim-enhanced man glibc-devel autoconf libnewt kernel-devel kernel-headers linux-headers openssl-devel zlib-devel libsrtp libsrtp-devel uuid libuuid-devel mariadb-server jansson-devel libsqlite3x libsqlite3x-devel epel-release.noarch bash-completion bash-completion-extras unixODBC unixODBC-devel libtool-ltdl libtool-ltdl-devel mysql-connector-odbc mlocate libiodbc sqlite sqlite-devel sql-devel.i686 sqlite-doc.noarch sqlite-tcl.x86_64 patch libedit-devel
# cd /tmp
# wget https://downloads.asterisk.org/pub/telephony/asterisk/asterisk-16-current.tar.gz
# tar xvzf asterisk-16-current.tar.gz 
# cd asterisk-16*/
# ./configure --libdir=/usr/lib64 --with-jansson-bundled
# make -j$(nproc) menuselect.makeopts
# menuselect/menuselect \
#         --disable BUILD_NATIVE \
#         --disable chan_sip \
#         --disable chan_skinny \
#         --enable cdr_csv \
#         --enable res_snmp \
#         --enable res_http_websocket \
#         menuselect.makeopts \
# make -j$(nproc)
# make -j$(nproc) install
# make -j$(nproc) basic-pbx
# touch /etc/redhat-release
# make -j$(nproc) config
# ldconfig
# groupadd asterisk
# useradd -r -d /var/lib/asterisk -g asterisk asterisk
# usermod -aG audio,dialout asterisk
# chown -R asterisk.asterisk /etc/asterisk
# chown -R asterisk.asterisk /var/{lib,log,spool}/asterisk

# systemctl start asterisk