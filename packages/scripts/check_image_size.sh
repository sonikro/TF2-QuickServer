#!/bin/bash
# Usage: ./packages/scripts/check_image_size.sh <image_name> [max_size_gb]
#
# OCI Container Instances provide a fixed 15 GB ephemeral storage shared by the
# container image and the container's writable overlay. Oracle recommends the
# image stay under 7.5 GB so pull/unpack has headroom. Failing builds above the
# limit prevents pushing images that cannot start in production.
#
# Override the limit with OCI_MAX_IMAGE_SIZE_GB env var or the second argument.
#
set -euo pipefail

IMAGE_NAME="${1:-}"
MAX_SIZE_GB="${2:-${OCI_MAX_IMAGE_SIZE_GB:-14}}"

if [[ -z "$IMAGE_NAME" ]]; then
  echo "Usage: $0 <image_name> [max_size_gb]"
  exit 2
fi

if ! command -v docker >/dev/null 2>&1; then
  echo "[ERROR] docker is not available"; exit 2
fi

CID=$(docker create --entrypoint /bin/true "$IMAGE_NAME")
cleanup() {
  docker rm -f "$CID" >/dev/null 2>&1 || true
}
trap cleanup EXIT

echo "[INFO] Measuring extracted filesystem size of '$IMAGE_NAME' (this may take a while)..."
ROOTFS_BYTES=$(docker export "$CID" | wc -c)
INSPECT_BYTES=$(docker image inspect "$IMAGE_NAME" --format '{{.Size}}')

LIMIT_BYTES=$(awk -v gb="$MAX_SIZE_GB" 'BEGIN { printf "%.0f", gb * 1024 * 1024 * 1024 }')
ROOTFS_GB=$(awk -v b="$ROOTFS_BYTES" 'BEGIN { printf "%.2f", b / (1024 * 1024 * 1024) }')
INSPECT_GB=$(awk -v b="$INSPECT_BYTES" 'BEGIN { printf "%.2f", b / (1024 * 1024 * 1024) }')

echo "[INFO] Extracted filesystem: ${ROOTFS_GB} GB"
echo "[INFO] Engine-reported image size: ${INSPECT_GB} GB"
echo "[INFO] Max allowed (OCI ephemeral storage headroom): ${MAX_SIZE_GB} GB"

FAILURE=0
if (( ROOTFS_BYTES > LIMIT_BYTES )); then
  echo "[ERROR] Image extracted filesystem (${ROOTFS_GB} GB) exceeds the ${MAX_SIZE_GB} GB limit for OCI Container Instances."; FAILURE=1
fi
if (( INSPECT_BYTES > LIMIT_BYTES )); then
  echo "[ERROR] Image stored size (${INSPECT_GB} GB) exceeds the ${MAX_SIZE_GB} GB limit for OCI Container Instances."; FAILURE=1
fi

if (( FAILURE == 1 )); then
  echo "[ACTION] Trim image fat (maps janitorial pruning, unused binaries, docker build cache) before pushing."
  exit 1
fi

echo "[SUCCESS] Image fits within the OCI Container Instances ephemeral storage limit."
