variable "bucket_name" {
  description = "Name of the S3 bucket for the landing page assets"
  type        = string
}

variable "domain_name" {
  description = "Custom domain name for the landing page (e.g., app.quickserver.sonikro.com)"
  type        = string
}

variable "hosted_zone_id" {
  description = "Route53 hosted zone ID for the domain (sonikro.com)"
  type        = string
}

variable "acm_certificate_arn" {
  description = "ACM certificate ARN for HTTPS (must be in us-east-1 for CloudFront)"
  type        = string
}
