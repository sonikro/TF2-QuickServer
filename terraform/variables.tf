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

# ===========================================
# AWS VARIABLES
# ===========================================

# No specific variables needed for AWS deployment
# All configuration is done directly in the modules
