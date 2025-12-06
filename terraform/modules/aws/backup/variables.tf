variable "bucket_name" {
  description = "Name of the S3 bucket for backups"
  type        = string
}

variable "environment" {
  description = "Environment name"
  type        = string
  default     = "production"
}

variable "retention_days" {
  description = "Number of days to retain backups before deletion"
  type        = number
  default     = 7
}
