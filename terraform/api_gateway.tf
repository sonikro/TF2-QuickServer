# ===========================================
# API GATEWAY - HTTP API with TLS Termination and Rate Limiting
# ===========================================
# This configures an AWS API Gateway HTTP API that acts as a reverse proxy
# to a self-hosted backend API, providing:
# - HTTPS/TLS termination
# - Rate limiting via usage plans
# - Custom domain name support
# ===========================================

# Create the HTTP API Gateway
resource "aws_apigatewayv2_api" "quickserver_api" {
  name          = "tf2-quickserver-api"
  protocol_type = "HTTP"
  description   = "API Gateway proxy for TF2 QuickServer backend"

  cors_configuration {
    allow_origins = ["*"]
    allow_methods = ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"]
    allow_headers = ["*"]
    max_age       = 300
  }

  provider = aws.us-east-1
}

# Create integration with backend API
resource "aws_apigatewayv2_integration" "backend_integration" {
  api_id           = aws_apigatewayv2_api.quickserver_api.id
  integration_type = "HTTP_PROXY"
  integration_uri  = "${var.backend_api_endpoint}/{proxy}"

  integration_method = "ANY"
  request_parameters = {
    "overwrite:path" = "$request.path"
  }

  provider = aws.us-east-1
}

# Create route for /api/* paths
resource "aws_apigatewayv2_route" "api_proxy_route" {
  api_id    = aws_apigatewayv2_api.quickserver_api.id
  route_key = "ANY /api/{proxy+}"
  target    = "integrations/${aws_apigatewayv2_integration.backend_integration.id}"

  provider = aws.us-east-1
}

# Create default stage with throttling
resource "aws_apigatewayv2_stage" "default_stage" {
  api_id      = aws_apigatewayv2_api.quickserver_api.id
  name        = "$default"
  auto_deploy = true

  default_route_settings {
    throttling_burst_limit = 5
    throttling_rate_limit  = 2
  }

  provider = aws.us-east-1
}

# Custom domain name configuration
resource "aws_apigatewayv2_domain_name" "api_domain" {
  domain_name = var.api_gateway_domain_name

  domain_name_configuration {
    certificate_arn = var.api_gateway_acm_certificate_arn
    endpoint_type   = "REGIONAL"
    security_policy = "TLS_1_2"
  }

  provider = aws.us-east-1
}

# Map the custom domain to the API Gateway stage
resource "aws_apigatewayv2_api_mapping" "api_mapping" {
  api_id      = aws_apigatewayv2_api.quickserver_api.id
  domain_name = aws_apigatewayv2_domain_name.api_domain.id
  stage       = aws_apigatewayv2_stage.default_stage.id

  provider = aws.us-east-1
}

# Route53 record to point custom domain to API Gateway
resource "aws_route53_record" "api_gateway_dns" {
  zone_id = var.route53_hosted_zone_id
  name    = var.api_gateway_domain_name
  type    = "A"

  alias {
    name                   = aws_apigatewayv2_domain_name.api_domain.domain_name_configuration[0].target_domain_name
    zone_id                = aws_apigatewayv2_domain_name.api_domain.domain_name_configuration[0].hosted_zone_id
    evaluate_target_health = false
  }

  provider = aws.us-east-1
}
