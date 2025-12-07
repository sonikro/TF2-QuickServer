# tf2-base.pkr.hcl
# Main Packer template for building TF2-QuickServer base images
# These images come pre-installed with Docker and Docker Compose,
# ready to receive docker-compose.yml via cloud-init at runtime

# ===========================================
# PACKER CONFIGURATION
# ===========================================
packer {
  required_version = ">= 1.14.0"
  
  required_plugins {
    oracle = {
      version = ">= 1.1.1"
      source  = "github.com/hashicorp/oracle"
    }
  }
}

# ===========================================
# VARIABLES
# ===========================================

# Global variables
variable "image_version" {
  type        = string
  description = "Version tag for the image (e.g., v1.0.0)"
  default     = "v1.0.0"
}

# Chicago (us-chicago-1) - Default compartment
variable "chicago_compartment_ocid" {
  type        = string
  description = "Compartment OCID for us-chicago-1"
}

variable "chicago_subnet_ocid" {
  type        = string
  description = "Subnet OCID for us-chicago-1"
}

variable "chicago_availability_domain" {
  type        = string
  description = "Availability domain for us-chicago-1"
}

# São Paulo (sa-saopaulo-1)
variable "sao_paulo_compartment_ocid" {
  type        = string
  description = "Compartment OCID for sa-saopaulo-1"
}

variable "sao_paulo_subnet_ocid" {
  type        = string
  description = "Subnet OCID for sa-saopaulo-1"
}

variable "sao_paulo_availability_domain" {
  type        = string
  description = "Availability domain for sa-saopaulo-1"
}

# Bogotá (sa-bogota-1)
variable "bogota_compartment_ocid" {
  type        = string
  description = "Compartment OCID for sa-bogota-1"
}

variable "bogota_subnet_ocid" {
  type        = string
  description = "Subnet OCID for sa-bogota-1"
}

variable "bogota_availability_domain" {
  type        = string
  description = "Availability domain for sa-bogota-1"
}

# Santiago (sa-santiago-1) - Santiago compartment
variable "santiago_compartment_ocid" {
  type        = string
  description = "Compartment OCID for sa-santiago-1"
}

variable "santiago_subnet_ocid" {
  type        = string
  description = "Subnet OCID for sa-santiago-1"
}

variable "santiago_availability_domain" {
  type        = string
  description = "Availability domain for sa-santiago-1"
}

# Frankfurt (eu-frankfurt-1) - Santiago compartment
variable "frankfurt_compartment_ocid" {
  type        = string
  description = "Compartment OCID for eu-frankfurt-1"
}

variable "frankfurt_subnet_ocid" {
  type        = string
  description = "Subnet OCID for eu-frankfurt-1"
}

variable "frankfurt_availability_domain" {
  type        = string
  description = "Availability domain for eu-frankfurt-1"
}

# Sydney (ap-sydney-1) - Sydney compartment
variable "sydney_compartment_ocid" {
  type        = string
  description = "Compartment OCID for ap-sydney-1"
}

variable "sydney_subnet_ocid" {
  type        = string
  description = "Subnet OCID for ap-sydney-1"
}

variable "sydney_availability_domain" {
  type        = string
  description = "Availability domain for ap-sydney-1"
}

# ===========================================
# LOCALS
# ===========================================
locals {
  # Timestamp for build metadata only
  timestamp = formatdate("YYYYMMDD-hhmm", timestamp())
  
  # Common image name (static, will be replaced on each build)
  image_name_prefix = "tf2-quickserver-vm"
  
  # Build shape (using flex shape for building)
  build_shape        = "VM.Standard.E4.Flex"
  build_shape_ocpus  = 2
  build_shape_memory = 8
}

# ===========================================
# SOURCES - All Oracle Regions
# ===========================================

source "oracle-oci" "chicago" {
  access_cfg_file_account = "us-chicago-1"
  region                  = "us-chicago-1"
  compartment_ocid        = var.chicago_compartment_ocid
  availability_domain     = var.chicago_availability_domain
  subnet_ocid             = var.chicago_subnet_ocid
  
  base_image_filter {
    display_name_search = "^Canonical-Ubuntu-22.04-Minimal-2025"
  }
  
  shape = local.build_shape
  shape_config {
    ocpus         = local.build_shape_ocpus
    memory_in_gbs = local.build_shape_memory
  }
  
  image_name   = local.image_name_prefix
  ssh_username = "ubuntu"
}

source "oracle-oci" "sao_paulo" {
  access_cfg_file_account = "sa-saopaulo-1"
  region                  = "sa-saopaulo-1"
  compartment_ocid        = var.sao_paulo_compartment_ocid
  availability_domain     = var.sao_paulo_availability_domain
  subnet_ocid             = var.sao_paulo_subnet_ocid
  
  base_image_filter {
    display_name_search = "^Canonical-Ubuntu-22.04-Minimal-2025"
  }
  
  shape = local.build_shape
  shape_config {
    ocpus         = local.build_shape_ocpus
    memory_in_gbs = local.build_shape_memory
  }
  
  image_name   = local.image_name_prefix
  ssh_username = "ubuntu"
}

source "oracle-oci" "bogota" {
  access_cfg_file_account = "sa-bogota-1"
  region                  = "sa-bogota-1"
  compartment_ocid        = var.bogota_compartment_ocid
  availability_domain     = var.bogota_availability_domain
  subnet_ocid             = var.bogota_subnet_ocid
  
  base_image_filter {
    display_name_search = "^Canonical-Ubuntu-22.04-Minimal-2025"
  }
  
  shape = local.build_shape
  shape_config {
    ocpus         = local.build_shape_ocpus
    memory_in_gbs = local.build_shape_memory
  }
  
  image_name   = local.image_name_prefix
  ssh_username = "ubuntu"
}

source "oracle-oci" "santiago" {
  access_cfg_file_account = "sa-santiago-1"
  region                  = "sa-santiago-1"
  compartment_ocid        = var.santiago_compartment_ocid
  availability_domain     = var.santiago_availability_domain
  subnet_ocid             = var.santiago_subnet_ocid
  
  base_image_filter {
    display_name_search = "^Canonical-Ubuntu-22.04-Minimal-2025"
  }
  
  shape = local.build_shape
  shape_config {
    ocpus         = local.build_shape_ocpus
    memory_in_gbs = local.build_shape_memory
  }
  
  image_name   = local.image_name_prefix
  ssh_username = "ubuntu"
}

source "oracle-oci" "frankfurt" {
  access_cfg_file_account = "eu-frankfurt-1"
  region                  = "eu-frankfurt-1"
  compartment_ocid        = var.frankfurt_compartment_ocid
  availability_domain     = var.frankfurt_availability_domain
  subnet_ocid             = var.frankfurt_subnet_ocid
  
  base_image_filter {
    display_name_search = "^Canonical-Ubuntu-22.04-Minimal-2025"
  }
  
  shape = local.build_shape
  shape_config {
    ocpus         = local.build_shape_ocpus
    memory_in_gbs = local.build_shape_memory
  }
  
  image_name   = local.image_name_prefix
  ssh_username = "ubuntu"
}

source "oracle-oci" "sydney" {
  access_cfg_file_account = "ap-sydney-1"
  region                  = "ap-sydney-1"
  compartment_ocid        = var.sydney_compartment_ocid
  availability_domain     = var.sydney_availability_domain
  subnet_ocid             = var.sydney_subnet_ocid
  
  base_image_filter {
    display_name_search = "^Canonical-Ubuntu-22.04-Minimal-2025"
  }
  
  shape = local.build_shape
  shape_config {
    ocpus         = local.build_shape_ocpus
    memory_in_gbs = local.build_shape_memory
  }
  
  image_name   = local.image_name_prefix
  ssh_username = "ubuntu"
}

# ===========================================
# BUILD CONFIGURATION
# ===========================================
build {
  # Build for all Oracle regions in parallel
  sources = [
    "source.oracle-oci.chicago",
    "source.oracle-oci.sao_paulo",
    "source.oracle-oci.bogota",
    "source.oracle-oci.santiago",
    "source.oracle-oci.frankfurt",
    "source.oracle-oci.sydney"
  ]
  
  # ===========================================
  # PROVISIONING STEPS
  # ===========================================
  
  # Step 1: Wait for cloud-init and disable unattended-upgrades
  provisioner "shell" {
    inline = [
      "echo 'Waiting for cloud-init to complete...'",
      "cloud-init status --wait || true",
      "echo 'Disabling unattended-upgrades...'",
      "sudo systemctl stop unattended-upgrades || true",
      "sudo systemctl disable unattended-upgrades || true",
      "sudo systemctl mask unattended-upgrades || true",
      "sudo pkill -9 -f unattended-upgrade || true",
      "echo 'Waiting for apt locks to be released...'",
      "while sudo fuser /var/lib/dpkg/lock-frontend >/dev/null 2>&1 || sudo fuser /var/lib/apt/lists/lock >/dev/null 2>&1 || sudo fuser /var/cache/apt/archives/lock >/dev/null 2>&1; do",
      "  echo 'Waiting for apt locks... (checking all locks)'",
      "  sleep 5",
      "done",
      "echo 'Waiting an additional 10 seconds for any pending apt operations...'",
      "sleep 10",
      "echo 'All apt locks released, ready to provision'"
    ]
  }
  
  # Step 2: Update system packages
  provisioner "shell" {
    inline = [
      "echo '==> Updating system packages...'",
      "sudo apt-get update",
      "sudo DEBIAN_FRONTEND=noninteractive apt-get upgrade -y -o Dpkg::Options::='--force-confdef' -o Dpkg::Options::='--force-confold'",
      "echo '==> System update complete'"
    ]
  }
  
  # Step 3: Install Docker and Docker Compose
  provisioner "shell" {
    script = "scripts/install-docker.sh"
  }
  
  # Step 4: Pre-load Docker images
  provisioner "shell" {
    script = "scripts/preload-docker-images.sh"
  }
  
  # Step 5: Configure cloud-init for docker-compose startup
  provisioner "shell" {
    script = "scripts/configure-cloud-init.sh"
  }
  
  # Step 6: Upload systemd service file
  provisioner "file" {
    source      = "files/docker-compose-startup.service"
    destination = "/tmp/docker-compose-startup.service"
  }
  
  # Step 7: Install and enable the systemd service
  provisioner "shell" {
    inline = [
      "echo '==> Installing systemd service...'",
      "sudo mv /tmp/docker-compose-startup.service /etc/systemd/system/",
      "sudo systemctl daemon-reload",
      "sudo systemctl enable docker-compose-startup.service",
      "echo '==> Systemd service installed and enabled'"
    ]
  }
  
  # Step 8: Clean up to reduce image size
  provisioner "shell" {
    inline = [
      "echo '==> Cleaning up...'",
      "sudo apt-get clean",
      "sudo apt-get autoremove -y",
      "sudo rm -rf /var/lib/apt/lists/*",
      "sudo rm -rf /tmp/*",
      "sudo rm -rf /var/tmp/*",
      "echo '==> Cleanup complete'"
    ]
  }
  
  # ===========================================
  # POST-PROCESSORS
  # ===========================================
  
  # Generate manifest with image OCID
  post-processor "manifest" {
    output     = "manifest.json"
    strip_path = true
    custom_data = {
      version    = var.image_version
      created_at = local.timestamp
    }
  }
}
