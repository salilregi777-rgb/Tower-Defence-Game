#!/bin/bash
set -eu
exec > /var/log/sylva-bootstrap.log 2>&1

apt-get update
DEBIAN_FRONTEND=noninteractive apt-get install -y openjdk-21-jdk git
git clone --depth 1 https://github.com/salilregi777-rgb/Tower-Defence-Game.git /opt/sylva

cat > /etc/systemd/system/sylva.service <<'UNIT'
[Unit]
Description=SYLVA Java game backend and Three.js site
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
WorkingDirectory=/opt/sylva/java
Environment=HOST_JAVA=0.0.0.0
Environment=PORT_JAVA=80
Environment=JAVA_TOOL_OPTIONS=-Xms64m -Xmx384m
ExecStart=/opt/sylva/java/run-backend.sh
Restart=always
RestartSec=5
User=root

[Install]
WantedBy=multi-user.target
UNIT

systemctl daemon-reload
systemctl enable --now sylva.service
