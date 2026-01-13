#!/bin/bash
set -e

echo "==> Optimizing Docker daemon configuration..."

# Create optimized Docker daemon config
sudo mkdir -p /etc/docker

sudo tee /etc/docker/daemon.json > /dev/null << 'EOF'
{
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "10m",
    "max-file": "3",
    "labels": "service=tf2-server"
  },
  "storage-driver": "overlay2",
  "live-restore": true,
  "userland-proxy": false,
  "icc": false,
  "ip-forward": false,
  "ip-masq": false,
  "iptables": false,
  "ipv6": false,
  "bridge": "none",
  "default-ulimits": {
    "nofile": {
      "Name": "nofile",
      "Hard": 65535,
      "Soft": 65535
    },
    "nproc": {
      "Name": "nproc",
      "Hard": 65535,
      "Soft": 65535
    }
  },
  "debug": false,
  "log-level": "warn",
  "max-concurrent-downloads": 5,
  "storage-opts": [
    "overlay2.override_kernel_check=true"
  ],
  "disable-legacy-registry": true,
  "features": {
    "buildkit": true
  }
}
EOF

echo "==> Docker daemon configuration applied"

# Optimize Docker systemd service
sudo mkdir -p /etc/systemd/system/docker.service.d

sudo tee /etc/systemd/system/docker.service.d/99-optimize.conf > /dev/null << 'EOF'
[Service]
ExecStartPost=/sbin/iptables -I FORWARD -s 0.0.0.0/0 -d 0.0.0.0/0 -j ACCEPT
MemoryAccounting=yes
MemoryLimit=infinity
CPUQuota=95%
TasksMax=infinity
TimeoutStopSec=120
Restart=always
RestartSec=5
EOF

# Reload systemd to apply the changes
sudo systemctl daemon-reload

# Restart Docker to apply new configuration
sudo systemctl restart docker

echo "==> Docker optimization complete!"
echo "==> Verifying Docker daemon..."
docker info | grep -E "Storage Driver|Live Restore|Debug|Log Driver"
