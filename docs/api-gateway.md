# API Gateway Architecture

## Overview

The API runs on a self-hosted VM but is exposed through AWS API Gateway to avoid direct internet exposure. API Gateway provides TLS termination and rate limiting.

```
Client (HTTPS) → API Gateway → VM (HTTP)
```

## Why API Gateway?

- **TLS Termination**: AWS handles SSL certificates, VM only needs HTTP
- **Rate Limiting**: Protects VM from abuse (2 req/s, burst of 5)
- **Hide Backend**: VM address never exposed to clients
- **Cost Efficient**: Pay per request, no additional infrastructure needed

## Configuration

- **Type**: HTTP API (cheaper than REST API)
- **Routes**: `ANY /api/{proxy+}` forwards to backend VM
- **CORS**: Enabled for all origins
- **Authentication**: Handled in application (Auth0 JWT validation)

## Infrastructure

Managed via Terraform in `terraform/` directory:
- `api_gateway.tf` - Gateway configuration
- `variables.tf` - Variable definitions
- `terraform.tfvars` - Backend endpoint (gitignored)

### Terraform Variables

Add these to `terraform/terraform.tfvars`:

```hcl
# The internal HTTP endpoint of your VM (not exposed publicly)
backend_api_endpoint = "http://your-vm-hostname:3000"

# The public domain name for the API Gateway
api_gateway_domain_name = "your-api-domain.com"

# ARN of your ACM certificate for HTTPS (must be in us-east-1)
api_gateway_acm_certificate_arn = "arn:aws:acm:us-east-1:ACCOUNT_ID:certificate/CERT_ID"
```

**Note**: `backend_api_endpoint` is marked as sensitive and kept in `terraform.tfvars` which is gitignored to prevent exposing your VM's address.

