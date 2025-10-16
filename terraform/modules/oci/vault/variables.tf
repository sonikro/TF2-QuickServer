variable "compartment_ocid" {
  description = "The OCID of the compartment"
  type        = string
}

variable "docker_username" {
  description = "Docker Hub username"
  type        = string
  sensitive   = true
}

variable "docker_password" {
  description = "Docker Hub password or access token"
  type        = string
  sensitive   = true
}
