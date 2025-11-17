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

variable "fastdl_bucket_name" {
  description = "Name of the S3 bucket for FastDL"
  type        = string
}

variable "fastdl_domain_name" {
  description = "Domain name for the FastDL endpoint"
  type        = string
  default     = "maps.sonikro.com"
}

variable "route53_hosted_zone_id" {
  description = "Route53 hosted zone ID for sonikro.com domain"
  type        = string
}

variable "fastdl_acm_certificate_arn" {
  description = "ARN of the ACM certificate for FastDL HTTPS (must be in us-east-1)"
  type        = string
}

# ===========================================
# API GATEWAY VARIABLES
# ===========================================

variable "backend_api_endpoint" {
  description = "The backend API endpoint URL"
  type        = string
  sensitive   = true
}

variable "api_gateway_domain_name" {
  description = "Custom domain name for the API Gateway"
  type        = string
}

variable "api_gateway_acm_certificate_arn" {
  description = "ARN of the ACM certificate for API Gateway HTTPS (must be in us-east-1)"
  type        = string
}
