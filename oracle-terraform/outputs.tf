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

output "sao_paulo_vnc_id" {
  value = module.network-sa-saopaulo-1.vnc_id
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

output "chicago_vnc_id" {
  value = module.network-us-chicago-1.vnc_id
}

# Bogotá Region
output "bogota_subnet_id" {
  value = module.network-sa-bogota-1.subnet_id
}
output "bogota_availability_domain" {
  value = module.network-sa-bogota-1.availability_domain
}
output "bogota_nsg_id" {
  value = module.network-sa-bogota-1.nsg_id
}
output "bogota_vnc_id" {
  value = module.network-sa-bogota-1.vnc_id
}

# Santiago Region
output "santiago_subnet_id" {
  value = module.network-sa-santiago-1.subnet_id
}
output "santiago_availability_domain" {
  value = module.network-sa-santiago-1.availability_domain
}
output "santiago_nsg_id" {
  value = module.network-sa-santiago-1.nsg_id
}
output "santiago_compartment_id" {
  value = var.santiago_compartment_ocid
}
output "santiago_vnc_id" {
  value = module.network-sa-santiago-1.vnc_id
}
