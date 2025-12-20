#!/usr/bin/env bash
set -e

sudo apt-get update -y

# Go
sudo apt-get install -y golang-go

# Node + npm
sudo apt-get install -y nodejs npm

# ffmpeg (required for audio processing)
sudo apt-get install -y ffmpeg

# Certbot (only for HTTPS)
DOMAIN="localport.online"
EMAIL="prayushgiri@gmail.com"
CERT_DIR="/etc/letsencrypt/live/$DOMAIN"

if [ ! -d "$CERT_DIR" ]; then
    sudo apt-get install -y certbot
    sudo certbot certonly \
      --standalone \
      -d $DOMAIN \
      --email $EMAIL \
      --agree-tos \
      --non-interactive
fi
