output "compartment_id" {
  value = var.compartment_ocid
}

output "sao_paulo_subnet_id" {
  value = module.network-sa-saopaulo-1.subnet_id
}

output "sao_paulo_availability_domain" {
  value = module.network-sa-saopaulo-1.availability_domain
}

output "sao_paulo_nsg_id" {
  value = module.network-sa-saopaulo-1.nsg_id
}