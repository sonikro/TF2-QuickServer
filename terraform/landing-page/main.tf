# ===========================================
# LANDING PAGE - S3 + CloudFront + Route53
# ===========================================
# Standalone terraform configuration for hosting the TF2-QuickServer
# landing page on a private S3 bucket served via CloudFront with HTTPS.
#
# The site is built by the web package (packages/web/) as a Next.js static
# export. Run `npm run build:web` before applying this configuration.
#
# Usage:
#   cd terraform/landing-page
#   terraform init
#   terraform apply -var="hosted_zone_id=Z..."
# ===========================================

# ===========================================
# RANDOM SUFFIX FOR UNIQUE BUCKET NAME
# ===========================================

resource "random_id" "bucket_suffix" {
  byte_length = 6
}

# ===========================================
# S3 BUCKET (PRIVATE)
# ===========================================

resource "aws_s3_bucket" "landing_page" {
  bucket        = "${var.bucket_name}-${random_id.bucket_suffix.hex}"
  force_destroy = true
}

resource "aws_s3_bucket_public_access_block" "landing_page" {
  bucket = aws_s3_bucket.landing_page.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
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

# ===========================================
# LANDING PAGE FILES (NEXT.JS STATIC EXPORT)
# ===========================================

locals {
  web_out_dir = "${path.module}/../../packages/web/out"
  web_files   = fileset(local.web_out_dir, "**")

  mime_types = {
    ".html"  = "text/html; charset=utf-8"
    ".js"    = "application/javascript"
    ".css"   = "text/css"
    ".json"  = "application/json"
    ".png"   = "image/png"
    ".svg"   = "image/svg+xml"
    ".webp"  = "image/webp"
    ".jpg"   = "image/jpeg"
    ".jpeg"  = "image/jpeg"
    ".gif"   = "image/gif"
    ".ico"   = "image/x-icon"
    ".txt"   = "text/plain"
    ".woff2"  = "font/woff2"
    ".woff"  = "font/woff"
    ".ttf"   = "font/ttf"
    ".otf"   = "font/otf"
    ".map"   = "application/json"
    ".xml"   = "application/xml"
  }
}

resource "aws_s3_object" "web_files" {
  for_each = local.web_files

  bucket        = aws_s3_bucket.landing_page.id
  key           = each.value
  source        = "${local.web_out_dir}/${each.value}"
  content_type  = try(local.mime_types[regex("\\.[^.]+$", each.value)], "application/octet-stream")
  etag          = filemd5("${local.web_out_dir}/${each.value}")
  cache_control = can(regex("^_next/", each.value)) ? "max-age=604800" : "max-age=3600"
}

# ===========================================
# CLOUDFRONT ORIGIN ACCESS IDENTITY
# ===========================================

resource "aws_cloudfront_origin_access_identity" "landing_page" {
  comment = "OAI for ${var.domain_name}"
}

# ===========================================
# S3 BUCKET POLICY (CLOUDFRONT OAI ONLY)
# ===========================================

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

# ===========================================
# ACM CERTIFICATE (DNS VALIDATION)
# ===========================================

resource "aws_acm_certificate" "landing_page" {
  domain_name       = var.domain_name
  validation_method = "DNS"

  lifecycle {
    create_before_destroy = true
  }
}

resource "aws_route53_record" "cert_validation" {
  for_each = {
    for dvo in aws_acm_certificate.landing_page.domain_validation_options : dvo.domain_name => {
      name   = dvo.resource_record_name
      record = dvo.resource_record_value
      type   = dvo.resource_record_type
    }
  }

  allow_overwrite = true
  name            = each.value.name
  records         = [each.value.record]
  ttl             = 60
  type            = each.value.type
  zone_id         = var.hosted_zone_id
}

resource "aws_acm_certificate_validation" "landing_page" {
  certificate_arn         = aws_acm_certificate.landing_page.arn
  validation_record_fqdns = [for record in aws_route53_record.cert_validation : record.fqdn]
}

# ===========================================
# CLOUDFRONT DISTRIBUTION
# ===========================================

data "aws_cloudfront_cache_policy" "caching_optimized" {
  name = "Managed-CachingOptimized"
}

resource "aws_cloudfront_distribution" "landing_page" {
  enabled             = true
  is_ipv6_enabled     = true
  http_version        = "http2and3"
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
    allowed_methods  = ["GET", "HEAD"]
    cached_methods   = ["GET", "HEAD"]
    target_origin_id = "S3-LandingPage"

    cache_policy_id = data.aws_cloudfront_cache_policy.caching_optimized.id

    viewer_protocol_policy = "redirect-to-https"
    compress               = true
  }

  price_class = "PriceClass_100"

  custom_error_response {
    error_code         = 404
    response_code      = 404
    response_page_path = "/404.html"
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  viewer_certificate {
    acm_certificate_arn      = aws_acm_certificate_validation.landing_page.certificate_arn
    ssl_support_method       = "sni-only"
    minimum_protocol_version = "TLSv1.2_2021"
  }

  depends_on = [
    aws_s3_object.web_files,
  ]
}

# ===========================================
# ROUTE53 DNS RECORD
# ===========================================

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
