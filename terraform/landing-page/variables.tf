variable "bucket_name" {
  description = "Name of the S3 bucket for landing page assets"
  type        = string
  default     = "tf2-quickserver-landing-page"
}

variable "domain_name" {
  description = "Custom domain name for the landing page (e.g., landing.quickserver.sonikro.com)"
  type        = string
  default     = "landing.quickserver.sonikro.com"
}

variable "hosted_zone_id" {
  description = "Route53 hosted zone ID for sonikro.com"
  type        = string
  sensitive   = true
}
