variable "bucket_name" {
  description = "Name of the S3 bucket for FastDL"
  type        = string
}

variable "domain_name" {
  description = "Domain name for the FastDL endpoint (e.g., maps.sonikro.com)"
  type        = string
}

variable "hosted_zone_id" {
  description = "Route53 hosted zone ID for the domain"
  type        = string
}

variable "acm_certificate_arn" {
  description = "ACM certificate ARN for HTTPS (must be in us-east-1 for CloudFront)"
  type        = string
}
