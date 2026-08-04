#!/bin/sh
set -e

RESOLVER_IP=$(awk '/^nameserver/ { print $2; exit }' /etc/resolv.conf)
RESOLVER_IP=${RESOLVER_IP:-127.0.0.11}
export RESOLVER_IP

envsubst '$RESOLVER_IP' < /etc/nginx/nginx.conf.template > /etc/nginx/nginx.conf

exec nginx -g 'daemon off;'
