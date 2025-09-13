output "vcn_id" {
  value = oci_core_virtual_network.vcn.id
}

output "subnet_id" {
  value = oci_core_subnet.public_subnet.id
}

output "subnet_cidr_block" {
  value = oci_core_subnet.public_subnet.cidr_block
}

output "nsg_id" {
  value = oci_core_network_security_group.nsg.id
}

output "availability_domain" {
  value = data.oci_identity_availability_domains.ads.availability_domains[0].name
}

output "vnc_id" {
  value = oci_core_virtual_network.vcn.id
}