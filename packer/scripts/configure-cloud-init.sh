#!/bin/bash
set -e

echo "==> Configuring cloud-init for docker-compose startup..."

# Create directory for TF2 QuickServer files
sudo mkdir -p /opt/tf2-quickserver

# Create startup script that will be triggered by systemd
cat << 'EOF' | sudo tee /opt/tf2-quickserver/startup.sh
#!/bin/bash
set -e

COMPOSE_FILE="/opt/tf2-quickserver/docker-compose.yml"
LOG_FILE="/var/log/tf2-quickserver-startup.log"

exec > >(tee -a "$LOG_FILE") 2>&1

echo "[$(date)] TF2-QuickServer startup script initiated"

# Wait for cloud-init to write the compose file
MAX_WAIT=300
ELAPSED=0
while [ ! -f "$COMPOSE_FILE" ]; do
  if [ $ELAPSED -ge $MAX_WAIT ]; then
    echo "[$(date)] ERROR: Timeout waiting for docker-compose.yml from cloud-init"
    exit 1
  fi
  echo "[$(date)] Waiting for docker-compose.yml from cloud-init..."
  sleep 5
  ELAPSED=$((ELAPSED + 5))
done

echo "[$(date)] Found docker-compose.yml, starting containers..."

cd /opt/tf2-quickserver

# Pull images first
docker compose pull

# Start containers
docker compose up -d

echo "[$(date)] TF2 Server containers started successfully!"
docker compose ps

# Follow logs (optional - can be disabled if you don't want continuous logging)
# docker compose logs -f
EOF

sudo chmod +x /opt/tf2-quickserver/startup.sh

echo "==> Cloud-init configuration complete!"
