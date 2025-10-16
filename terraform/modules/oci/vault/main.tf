terraform {
  required_providers {
    oci = {
      source  = "oracle/oci"
      version = "~> 6.0"
    }
  }
}

# Create Vault
resource "oci_kms_vault" "container_registry_vault" {
  compartment_id = var.compartment_ocid
  display_name   = "TF2-QuickServer-Container-Registry-Vault"
  vault_type     = "DEFAULT"
}

# Create Master Encryption Key for the vault
resource "oci_kms_key" "container_registry_key" {
  compartment_id      = var.compartment_ocid
  display_name        = "TF2-QuickServer-Container-Registry-Key"
  management_endpoint = oci_kms_vault.container_registry_vault.management_endpoint

  key_shape {
    algorithm = "AES"
    length    = 32
  }
}

# Create Secret with Docker Hub credentials
resource "oci_vault_secret" "docker_hub_credentials" {
  compartment_id = var.compartment_ocid
  vault_id       = oci_kms_vault.container_registry_vault.id
  key_id         = oci_kms_key.container_registry_key.id
  secret_name    = "TF2-QuickServer-Docker-Hub-Credentials"
  description    = "Docker Hub credentials for pulling container images"

  secret_content {
    content_type = "BASE64"
    # The secret must be a JSON string with username and password fields
    content = base64encode(jsonencode({
      username = var.docker_username
      password = var.docker_password
    }))
  }
}
