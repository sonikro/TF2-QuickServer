#!/bin/bash
set -e

echo '==> Pre-loading Docker images...'

# Array of Docker images to pre-load
IMAGES=(
    "newrelic/infrastructure:latest"
    "sonikro/tf2-quickserver-shield:latest"
    "sonikro/fat-tf2-standard-competitive-i386:latest"
    "sonikro/fat-tf2-pickup:latest"
    "sonikro/fat-mge-tf:latest"
)

# Pull each image
for IMAGE in "${IMAGES[@]}"; do
    echo "==> Pulling ${IMAGE}..."
    sudo docker pull "${IMAGE}"
done

echo '==> Docker images pre-loaded successfully'
echo '==> Listing all pulled images:'
sudo docker images
