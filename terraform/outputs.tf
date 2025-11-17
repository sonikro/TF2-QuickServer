# ===========================================
# ORACLE CLOUD INFRASTRUCTURE OUTPUTS
# ===========================================

output "compartment_id" {
  value = var.compartment_ocid
}

# São Paulo Region
output "sao_paulo_subnet_id" {
  value = module.oci-network-sa-saopaulo-1.subnet_id
}

output "sao_paulo_availability_domain" {
  value = module.oci-network-sa-saopaulo-1.availability_domain
}

output "sao_paulo_nsg_id" {
  value = module.oci-network-sa-saopaulo-1.nsg_id
}

output "sao_paulo_vnc_id" {
  value = module.oci-network-sa-saopaulo-1.vnc_id
}

output "sao_paulo_secret_id" {
  value     = module.oci-vault-sa-saopaulo-1.secret_id
  sensitive = true
}

# Chicago Region
output "chicago_subnet_id" {
  value = module.oci-network-us-chicago-1.subnet_id
}

output "chicago_availability_domain" {
  value = module.oci-network-us-chicago-1.availability_domain
}

output "chicago_nsg_id" {
  value = module.oci-network-us-chicago-1.nsg_id
}

output "chicago_vnc_id" {
  value = module.oci-network-us-chicago-1.vnc_id
}

output "chicago_secret_id" {
  value     = module.oci-vault-us-chicago-1.secret_id
  sensitive = true
}

# Bogotá Region
output "bogota_subnet_id" {
  value = module.oci-network-sa-bogota-1.subnet_id
}
output "bogota_availability_domain" {
  value = module.oci-network-sa-bogota-1.availability_domain
}
output "bogota_nsg_id" {
  value = module.oci-network-sa-bogota-1.nsg_id
}
output "bogota_vnc_id" {
  value = module.oci-network-sa-bogota-1.vnc_id
}
output "bogota_secret_id" {
  value     = module.oci-vault-sa-bogota-1.secret_id
  sensitive = true
}

# Santiago Region
output "santiago_subnet_id" {
  value = module.oci-network-sa-santiago-1.subnet_id
}
output "santiago_availability_domain" {
  value = module.oci-network-sa-santiago-1.availability_domain
}
output "santiago_nsg_id" {
  value = module.oci-network-sa-santiago-1.nsg_id
}
output "santiago_compartment_id" {
  value = var.santiago_compartment_ocid
}
output "santiago_vnc_id" {
  value = module.oci-network-sa-santiago-1.vnc_id
}
output "santiago_secret_id" {
  value     = module.oci-vault-sa-santiago-1.secret_id
  sensitive = true
}

# Frankfurt Region
output "frankfurt_compartment_id" {
  value = var.santiago_compartment_ocid
}
output "frankfurt_subnet_id" {
  value = module.oci-network-eu-frankfurt-1.subnet_id
}
output "frankfurt_availability_domain" {
  value = module.oci-network-eu-frankfurt-1.availability_domain
}
output "frankfurt_nsg_id" {
  value = module.oci-network-eu-frankfurt-1.nsg_id
}
output "frankfurt_vnc_id" {
  value = module.oci-network-eu-frankfurt-1.vnc_id
}
output "frankfurt_secret_id" {
  value     = module.oci-vault-eu-frankfurt-1.secret_id
  sensitive = true
}

# Sydney Region
output "sydney_compartment_id" {
  value = var.santiago_compartment_ocid
}
output "sydney_subnet_id" {
  value = module.oci-network-ap-sydney-1.subnet_id
}
output "sydney_availability_domain" {
  value = module.oci-network-ap-sydney-1.availability_domain
}
output "sydney_nsg_id" {
  value = module.oci-network-ap-sydney-1.nsg_id
}
output "sydney_vnc_id" {
  value = module.oci-network-ap-sydney-1.vnc_id
}
output "sydney_secret_id" {
  value     = module.oci-vault-ap-sydney-1.secret_id
  sensitive = true
}

# ===========================================
# AWS OUTPUTS
# ===========================================

# US East 1 (N. Virginia) - Buenos Aires Local Zone outputs
output "buenos_aires_vpc_id" {
  description = "VPC ID for us-east-1 (N. Virginia) region used by Buenos Aires Local Zone"
  value       = module.aws-network-us-east-1.vpc_id
}

output "buenos_aires_subnet_id" {
  description = "Subnet ID for Buenos Aires Local Zone (us-east-1-bue-1a) within us-east-1 (N. Virginia)"
  value       = module.aws-network-us-east-1.subnet_id
}

output "buenos_aires_subnet_cidr_block" {
  description = "CIDR block of the Buenos Aires Local Zone subnet within us-east-1 (N. Virginia)"
  value       = module.aws-network-us-east-1.subnet_cidr_block
}

output "buenos_aires_internet_gateway_id" {
  description = "Internet Gateway ID for us-east-1 (N. Virginia) VPC used by Buenos Aires Local Zone"
  value       = module.aws-network-us-east-1.internet_gateway_id
}

output "buenos_aires_route_table_id" {
  description = "Route table ID for Buenos Aires Local Zone subnet within us-east-1 (N. Virginia)"
  value       = module.aws-network-us-east-1.route_table_id
}

# ECS outputs for us-east-1 (N. Virginia) region
output "buenos_aires_cluster_name" {
  description = "ECS cluster name in us-east-1 (N. Virginia) for Buenos Aires Local Zone deployment"
  value       = module.aws-ecs-us-east-1.cluster_name
}

output "buenos_aires_cluster_arn" {
  description = "ECS cluster ARN in us-east-1 (N. Virginia) for Buenos Aires Local Zone deployment"
  value       = module.aws-ecs-us-east-1.cluster_arn
}

output "buenos_aires_task_execution_role_arn" {
  description = "ECS task execution role ARN in us-east-1 (N. Virginia) for Buenos Aires Local Zone deployment"
  value       = module.aws-ecs-us-east-1.task_execution_role_arn
}

output "buenos_aires_task_role_arn" {
  description = "ECS task role ARN in us-east-1 (N. Virginia) for Buenos Aires Local Zone deployment"
  value       = module.aws-ecs-us-east-1.task_role_arn
}

output "buenos_aires_instance_profile_arn" {
  description = "ECS instance profile ARN in us-east-1 (N. Virginia) for Buenos Aires Local Zone deployment"
  value       = module.aws-ecs-us-east-1.instance_profile_arn
}

output "buenos_aires_log_group_name" {
  description = "CloudWatch log group name for ECS containers in us-east-1 (N. Virginia) for Buenos Aires Local Zone deployment"
  value       = module.aws-ecs-us-east-1.log_group_name
}

# Lima Region
output "lima_vpc_id" {
  description = "VPC ID for us-east-1 (N. Virginia) region used by Lima Local Zone"
  value       = module.aws-network-us-east-1-lima.vpc_id
}

output "lima_subnet_id" {
  description = "Subnet ID for Lima Local Zone (us-east-1-lim-1a) within us-east-1 (N. Virginia)"
  value       = module.aws-network-us-east-1-lima.subnet_id
}

output "lima_subnet_cidr_block" {
  description = "CIDR block of the Lima Local Zone subnet within us-east-1 (N. Virginia)"
  value       = module.aws-network-us-east-1-lima.subnet_cidr_block
}

output "lima_internet_gateway_id" {
  description = "Internet Gateway ID for us-east-1 (N. Virginia) VPC used by Lima Local Zone"
  value       = module.aws-network-us-east-1-lima.internet_gateway_id
}

output "lima_route_table_id" {
  description = "Route table ID for Lima Local Zone subnet within us-east-1 (N. Virginia)"
  value       = module.aws-network-us-east-1-lima.route_table_id
}

# ECS outputs for us-east-1 (N. Virginia) region
output "lima_cluster_name" {
  description = "ECS cluster name in us-east-1 (N. Virginia) for Lima Local Zone deployment"
  value       = module.aws-ecs-us-east-1.cluster_name
}

output "lima_cluster_arn" {
  description = "ECS cluster ARN in us-east-1 (N. Virginia) for Lima Local Zone deployment"
  value       = module.aws-ecs-us-east-1.cluster_arn
}

output "lima_task_execution_role_arn" {
  description = "ECS task execution role ARN in us-east-1 (N. Virginia) for Lima Local Zone deployment"
  value       = module.aws-ecs-us-east-1.task_execution_role_arn
}

output "lima_task_role_arn" {
  description = "ECS task role ARN in us-east-1 (N. Virginia) for Lima Local Zone deployment"
  value       = module.aws-ecs-us-east-1.task_role_arn
}

output "lima_instance_profile_arn" {
  description = "ECS instance profile ARN in us-east-1 (N. Virginia) for Lima Local Zone deployment"
  value       = module.aws-ecs-us-east-1.instance_profile_arn
}

output "lima_log_group_name" {
  description = "CloudWatch log group name for ECS containers in us-east-1 (N. Virginia) for Lima Local Zone deployment"
  value       = module.aws-ecs-us-east-1.log_group_name
}

# ===========================================
# FASTDL OUTPUTS
# ===========================================

output "fastdl_bucket_name" {
  description = "Name of the S3 bucket for FastDL"
  value       = module.aws-fastdl-us-east-1.bucket_name
}

output "fastdl_bucket_arn" {
  description = "ARN of the S3 bucket for FastDL"
  value       = module.aws-fastdl-us-east-1.bucket_arn
}

output "fastdl_website_endpoint" {
  description = "Website endpoint URL for the S3 bucket"
  value       = module.aws-fastdl-us-east-1.website_endpoint
}

output "fastdl_url" {
  description = "Full FastDL URL to be used in server configuration"
  value       = module.aws-fastdl-us-east-1.fastdl_url
}

# ===========================================
# API GATEWAY OUTPUTS
# ===========================================

output "api_gateway_endpoint" {
  description = "API Gateway endpoint URL"
  value       = aws_apigatewayv2_api.quickserver_api.api_endpoint
}

output "api_gateway_custom_domain" {
  description = "Custom domain name for the API Gateway"
  value       = aws_apigatewayv2_domain_name.api_domain.domain_name
}

output "api_gateway_id" {
  description = "API Gateway ID"
  value       = aws_apigatewayv2_api.quickserver_api.id
}
