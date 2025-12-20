#!/usr/bin/env bash

HTTPS_PID=$(sudo lsof -t -i:4443)

if [ -n "$HTTPS_PID" ]; then
  sudo kill -9 $HTTPS_PID
  echo "Stopped backend on port 4443"
fi
