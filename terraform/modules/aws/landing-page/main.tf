terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

resource "aws_s3_bucket" "landing_page" {
  bucket = var.bucket_name
}

resource "aws_s3_bucket_public_access_block" "landing_page" {
  bucket = aws_s3_bucket.landing_page.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_policy" "landing_page" {
  bucket = aws_s3_bucket.landing_page.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid       = "CloudFrontOAIRead"
        Effect    = "Allow"
        Principal = {
          AWS = aws_cloudfront_origin_access_identity.landing_page.iam_arn
        }
        Action   = "s3:GetObject"
        Resource = "${aws_s3_bucket.landing_page.arn}/*"
      }
    ]
  })

  depends_on = [aws_s3_bucket_public_access_block.landing_page]
}

resource "aws_s3_bucket_versioning" "landing_page" {
  bucket = aws_s3_bucket.landing_page.id

  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "landing_page" {
  bucket = aws_s3_bucket.landing_page.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

resource "aws_cloudfront_origin_access_identity" "landing_page" {
  comment = "OAI for ${var.domain_name}"
}

resource "aws_cloudfront_distribution" "landing_page" {
  enabled             = true
  is_ipv6_enabled     = true
  default_root_object = "index.html"
  aliases             = [var.domain_name]

  origin {
    domain_name = aws_s3_bucket.landing_page.bucket_regional_domain_name
    origin_id   = "S3-LandingPage"

    s3_origin_config {
      origin_access_identity = aws_cloudfront_origin_access_identity.landing_page.cloudfront_access_identity_path
    }
  }

  default_cache_behavior {
    allowed_methods  = ["GET", "HEAD", "OPTIONS"]
    cached_methods   = ["GET", "HEAD", "OPTIONS"]
    target_origin_id = "S3-LandingPage"

    forwarded_values {
      query_string = false

      cookies {
        forward = "none"
      }
    }

    viewer_protocol_policy = "redirect-to-https"
    min_ttl                = 0
    default_ttl            = 3600
    max_ttl                = 86400
    compress               = true
  }

  price_class = "PriceClass_200"

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
}

resource "aws_route53_record" "landing_page" {
  zone_id = var.hosted_zone_id
  name    = var.domain_name
  type    = "A"

  alias {
    name                   = aws_cloudfront_distribution.landing_page.domain_name
    zone_id                = aws_cloudfront_distribution.landing_page.hosted_zone_id
    evaluate_target_health = false
  }
}
