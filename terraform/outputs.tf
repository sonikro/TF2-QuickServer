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
