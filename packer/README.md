# TF2-QuickServer VM Images

This directory contains Packer templates for building custom Oracle Cloud Infrastructure (OCI) VM images for TF2-QuickServer.

## Overview

This is the base VM image that contains:
- Ubuntu 22.04 LTS
- Docker CE and Docker Compose
- Pre-downloaded Docker images for faster VM startup

## Why VM Images Instead of Container Instances?

We had to use VM images instead of Oracle Container Instances because OCI Container Instances use Oracle Linux, which is incompatible with some TF2 server extensions such as SRCTV+.

With this approach we can use the Ubuntu kernel instead and have more control over the machine running the server.

## How It Works

This image is designed to work similarly to OCI Container Instances. When creating a VM from this image, you simply pass a docker-compose specification in the cloud-init script, and all containers will start automatically.

The image contains:
1. A systemd service (`docker-compose-startup.service`) that runs on boot
2. A startup script that waits for `/opt/tf2-quickserver/docker-compose.yml`
3. Pre-loaded Docker images to speed up container startup

## Usage

### Building the Image

```bash
cd packer
packer validate .
packer build .
```

The image will be named `tf2-quickserver-vm` in your OCI compartment.

### Cleaning Up Old Images

Over time, multiple `tf2-quickserver-vm` images will accumulate in your OCI compartments. Use the cleanup script to remove old images and keep only the latest one in each region:

```bash
cd packages/scripts
yarn run cleanup:oracle:images
```

To preview what will be deleted without actually removing anything, use the dry-run flag:

```bash
yarn run cleanup:oracle:images -d
# or
yarn run cleanup:oracle:images --dry-run
```

The script will:
1. Scan all configured Oracle regions
2. List all `tf2-quickserver-vm` images in each region
3. Keep the most recent image in each region
4. Delete all older images (unless running in dry-run mode)

**Note:** Ensure `OCI_CONFIG_FILE` environment variable is set before running the cleanup script.

### Launching a VM with Cloud-Init

When creating a VM instance from this image, pass a cloud-init script that writes the docker-compose.yml file:

```yaml
#cloud-config

write_files:
  - path: /opt/tf2-quickserver/docker-compose.yml
    permissions: '0644'
    owner: root:root
    content: |
      version: '3.8'

      services:
        tf2-server:
          image: sonikro/fat-tf2-standard-competitive-amd64:latest
          container_name: tf2-server
          restart: always
          network_mode: host
          environment:
            SERVER_HOSTNAME: "My TF2 Server"
            SERVER_PASSWORD: "password123"
            RCON_PASSWORD: "rconpass"
            STV_NAME: "My TV"
            STV_PASSWORD: "tvpass"
            DEFAULT_5CP_CFG: "fbtf_6v6_5cp.cfg"
            DEFAULT_KOTH_CFG: "fbtf_6v6_koth.cfg"
          cap_add:
            - ALL
          command: >
            -enablefakeip
            +sv_pure 2
            +maxplayers 24
            +map cp_process_f12
          
        shield:
          image: sonikro/tf2-quickserver-shield:latest
          container_name: shield
          restart: always
          network_mode: host
          environment:
            MAXBYTES: "2000000"
            SRCDS_PASSWORD: "rconpass"
            NSG_NAME: "my-server-nsg"
            COMPARTMENT_ID: "ocid1.compartment.oc1.."
            VCN_ID: "ocid1.vcn.oc1.."
          depends_on:
            - tf2-server
            
        newrelic-infra:
          image: newrelic/infrastructure:latest
          container_name: newrelic-infra
          restart: always
          network_mode: host
          environment:
            NRIA_LICENSE_KEY: "your-license-key"
            NRIA_DISPLAY_NAME: "TF2-Server-us-chicago-1"
            NRIA_OVERRIDE_HOSTNAME: "tf2-server-us-chicago-1"
```

### Using OCI CLI

```bash
oci compute instance launch \
  --compartment-id <compartment-ocid> \
  --availability-domain <ad-name> \
  --subnet-id <subnet-ocid> \
  --image-id <image-ocid-from-manifest.json> \
  --shape VM.Standard.E4.Flex \
  --shape-config '{"ocpus":1,"memoryInGBs":4}' \
  --user-data-file cloud-init.yaml
```

### Monitoring

Once the VM starts, you can monitor the startup process:

```bash
# Watch the systemd service
sudo journalctl -u docker-compose-startup.service -f

# Check the startup log
sudo tail -f /var/log/tf2-quickserver-startup.log

# Verify containers are running
docker ps
```

## Pre-loaded Images

The following Docker images are pre-loaded to speed up VM startup:

- `newrelic/infrastructure:latest` - Infrastructure monitoring
- `sonikro/tf2-quickserver-shield:latest` - DDoS protection
- `sonikro/fat-tf2-standard-competitive-i386:latest` - 32-bit TF2 server
- `sonikro/fat-tf2-pickup:latest` - TF2 Pickup server
- `sonikro/fat-mge-tf:latest` - MGE server

## Requirements

- Packer 1.14.0+
- Oracle Cloud Infrastructure (OCI) account
- OCI CLI configured with valid credentials
- Network configuration (VCN, subnet, security groups)

## Notes

- The image name is always `tf2-quickserver-vm` - each build replaces the previous image
- The systemd service waits up to 5 minutes for the docker-compose.yml file
- All containers use `network_mode: host`
- The ubuntu user is added to the docker group for non-root access
