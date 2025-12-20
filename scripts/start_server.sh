#!/usr/bin/env bash
set -e

start_server() {
    cd /home/ubuntu/shazoom/shazoom

    export CERT_KEY="/etc/letsencrypt/live/localport.online/privkey.pem"
    export CERT_FILE="/etc/letsencrypt/live/localport.online/fullchain.pem"

    go build -tags netgo -ldflags '-s -w' -o app

    nohup ./app serve -proto https -p 4443 > backend.log 2>&1 &
    echo "Backend started on https://localhost:4443"
}

start_server
