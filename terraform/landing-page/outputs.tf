output "bucket_name" {
  description = "Name of the S3 bucket for landing page"
  value       = aws_s3_bucket.landing_page.id
}

output "bucket_arn" {
  description = "ARN of the S3 bucket for landing page"
  value       = aws_s3_bucket.landing_page.arn
}

output "cloudfront_domain_name" {
  description = "CloudFront distribution domain name"
  value       = aws_cloudfront_distribution.landing_page.domain_name
}

output "cloudfront_distribution_id" {
  description = "CloudFront distribution ID"
  value       = aws_cloudfront_distribution.landing_page.id
}

output "landing_page_url" {
  description = "Full landing page URL"
  value       = "https://${var.domain_name}"
}
