output "bucket_name" {
  description = "Name of the backup S3 bucket"
  value       = aws_s3_bucket.backup_bucket.id
}

output "bucket_arn" {
  description = "ARN of the backup S3 bucket"
  value       = aws_s3_bucket.backup_bucket.arn
}
