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

resource "aws_s3_bucket_lifecycle_configuration" "fastdl" {
  bucket = aws_s3_bucket.fastdl.id

  rule {
    id     = "intelligent-tiering"
    status = "Enabled"

    filter {}

    transition {
      days          = 0
      storage_class = "INTELLIGENT_TIERING"
    }
  }
}

resource "aws_cloudfront_distribution" "fastdl" {
  origin {
    domain_name = aws_s3_bucket_website_configuration.fastdl.website_endpoint
    origin_id   = "S3-FastDL"

    custom_origin_config {
      http_port              = 80
      https_port             = 443
      origin_protocol_policy = "http-only"
      origin_ssl_protocols   = ["TLSv1.2"]
    }
  }

  enabled             = true
  is_ipv6_enabled     = true
  default_root_object = "index.html"

  default_cache_behavior {
    allowed_methods  = ["GET", "HEAD"]
    cached_methods   = ["GET", "HEAD"]
    target_origin_id = "S3-FastDL"

    forwarded_values {
      query_string = false

      cookies {
        forward = "none"
      }
    }

    viewer_protocol_policy = "redirect-to-https"
    min_ttl                = 0
    default_ttl            = 86400
    max_ttl                = 31536000
    compress               = true
  }

  price_class = "PriceClass_100"

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  viewer_certificate {
    acm_certificate_arn      = var.acm_certificate_arn
    ssl_support_method       = "sni-only"
    minimum_protocol_version = "TLSv1.2_2021"
  }

  aliases = [var.domain_name]

  depends_on = [aws_s3_bucket_website_configuration.fastdl]
}

resource "aws_route53_record" "fastdl" {
  zone_id = var.hosted_zone_id
  name    = var.domain_name
  type    = "A"

  alias {
    name                   = aws_cloudfront_distribution.fastdl.domain_name
    zone_id                = aws_cloudfront_distribution.fastdl.hosted_zone_id
    evaluate_target_health = false
  }
}
