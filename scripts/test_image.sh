#!/bin/bash
# Usage: ./scripts/test_image.sh <image_name>
# This script runs a container from the given image and checks its health status.

set -euo pipefail

IMAGE_NAME="${1:-}"
CONTAINER_NAME="test-container-$(date +%s)"

if [[ -z "$IMAGE_NAME" ]]; then
  echo "Usage: $0 <image_name>"
  exit 2
fi

echo "[INFO] Starting container '$CONTAINER_NAME' from image '$IMAGE_NAME'..."
docker run -d --name "$CONTAINER_NAME" \
  -e ADMIN_LIST=STEAM_0:0:14581482 \
  -e RCON_PASSWORD=test \
  -e SRCDS_PASSWORD=test \
  -e SERVER_HOSTNAME="Test @ Sonikro Solutions" \
  -e SERVER_PASSWORD=mix \
  -e STV_PASSWORD=tv \
  "$IMAGE_NAME" \
  -enablefakeip +sv_pure 2 +maxplayers 24 +map cp_badlands

cleanup() {
  echo "[INFO] Cleaning up: removing container '$CONTAINER_NAME'..."
  docker rm -f "$CONTAINER_NAME" >/dev/null 2>&1 || true
}
trap cleanup EXIT

echo "[INFO] Waiting for container to become healthy (max 5 minutes)..."
for i in {1..60}; do
  running=$(docker inspect --format='{{.State.Running}}' "$CONTAINER_NAME" 2>/dev/null || echo "false")
  status=$(docker inspect --format='{{.State.Health.Status}}' "$CONTAINER_NAME" 2>/dev/null || echo "none")
  echo "[Attempt $i] Running: $running, Health: $status"
  if [[ "$running" == "false" ]]; then
    echo "[ERROR] Container stopped unexpectedly."; docker logs "$CONTAINER_NAME"; exit 1
  fi
  case "$status" in
    healthy)
      echo "[SUCCESS] Container is healthy!"; exit 0 ;;
    unhealthy)
      echo "[ERROR] Container is unhealthy!"; docker logs "$CONTAINER_NAME"; exit 1 ;;
    none)
      echo "[WARN] No healthcheck found, assuming healthy."; exit 0 ;;
  esac
  sleep 5
done
echo "[ERROR] Container did not become healthy in time."; docker logs "$CONTAINER_NAME"; exit 1