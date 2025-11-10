terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

resource "aws_s3_bucket" "fastdl" {
  bucket = var.bucket_name
}

resource "aws_s3_bucket_website_configuration" "fastdl" {
  bucket = aws_s3_bucket.fastdl.id

  index_document {
    suffix = "index.html"
  }

  error_document {
    key = "error.html"
  }
}

resource "aws_s3_bucket_public_access_block" "fastdl" {
  bucket = aws_s3_bucket.fastdl.id

  block_public_acls       = false
  block_public_policy     = false
  ignore_public_acls      = false
  restrict_public_buckets = false
}

resource "aws_s3_bucket_policy" "fastdl" {
  bucket = aws_s3_bucket.fastdl.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid       = "PublicReadGetObject"
        Effect    = "Allow"
        Principal = "*"
        Action    = "s3:GetObject"
        Resource  = "${aws_s3_bucket.fastdl.arn}/*"
      }
    ]
  })

  depends_on = [aws_s3_bucket_public_access_block.fastdl]
}

resource "aws_s3_bucket_cors_configuration" "fastdl" {
  bucket = aws_s3_bucket.fastdl.id

  cors_rule {
    allowed_headers = ["*"]
    allowed_methods = ["GET", "HEAD"]
    allowed_origins = ["*"]
    expose_headers  = ["ETag"]
    max_age_seconds = 3600
  }
}

resource "aws_route53_record" "fastdl" {
  zone_id = var.hosted_zone_id
  name    = var.domain_name
  type    = "A"

  alias {
    name                   = aws_s3_bucket_website_configuration.fastdl.website_domain
    zone_id                = aws_s3_bucket.fastdl.hosted_zone_id
    evaluate_target_health = false
  }
}
