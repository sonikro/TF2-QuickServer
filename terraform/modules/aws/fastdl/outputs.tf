output "bucket_name" {
  description = "Name of the S3 bucket for FastDL"
  value       = aws_s3_bucket.fastdl.id
}

output "bucket_arn" {
  description = "ARN of the S3 bucket for FastDL"
  value       = aws_s3_bucket.fastdl.arn
}

output "website_endpoint" {
  description = "Website endpoint URL for the S3 bucket"
  value       = aws_s3_bucket_website_configuration.fastdl.website_endpoint
}

output "website_domain" {
  description = "Website domain for the S3 bucket"
  value       = aws_s3_bucket_website_configuration.fastdl.website_domain
}

output "cloudfront_domain_name" {
  description = "CloudFront distribution domain name"
  value       = aws_cloudfront_distribution.fastdl.domain_name
}

output "cloudfront_distribution_id" {
  description = "CloudFront distribution ID"
  value       = aws_cloudfront_distribution.fastdl.id
}

output "fastdl_url" {
  description = "Full FastDL URL to be used in server configuration"
  value       = "https://${var.domain_name}/fastdl/"
}
