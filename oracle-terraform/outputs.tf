output "compartment_id" {
  value = var.compartment_ocid
}

# São Paulo Region
output "sao_paulo_subnet_id" {
  value = module.network-sa-saopaulo-1.subnet_id
}

output "sao_paulo_availability_domain" {
  value = module.network-sa-saopaulo-1.availability_domain
}

output "sao_paulo_nsg_id" {
  value = module.network-sa-saopaulo-1.nsg_id
}

# Chicago Region
output "chicago_subnet_id" {
  value = module.network-us-chicago-1.subnet_id
}

output "chicago_availability_domain" {
  value = module.network-us-chicago-1.availability_domain
}

output "chicago_nsg_id" {
  value = module.network-us-chicago-1.nsg_id
}
