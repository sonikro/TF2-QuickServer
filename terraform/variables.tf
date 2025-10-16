# ===========================================
# ORACLE CLOUD INFRASTRUCTURE VARIABLES
# ===========================================

variable "compartment_ocid" {
  description = "The OCID of the compartment"
  type        = string
}

variable "santiago_compartment_ocid" {
  description = "The OCID of the Santiago compartment"
  type        = string
}

variable "docker_username" {
  description = "Docker Hub username for pulling container images"
  type        = string
  sensitive   = true
}

variable "docker_password" {
  description = "Docker Hub password or access token for pulling container images"
  type        = string
  sensitive   = true
}

# ===========================================
# AWS VARIABLES
# ===========================================

# No specific variables needed for AWS deployment
# All configuration is done directly in the modules
