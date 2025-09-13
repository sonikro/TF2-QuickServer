resource "oci_identity_dynamic_group" "container_instances" {
  compartment_id = var.compartment_ocid
  name           = "container-instances-dynamic-group"
  description    = "Dynamic group for all container instances"
  matching_rule  = "ALL {resource.type = 'containerinstance'}"
}

resource "oci_identity_policy" "container_instances_nsg_policy" {
  compartment_id = var.compartment_ocid
  name           = "container-instances-nsg-policy"
  description    = "Allow container instances to manage network security groups"
  statements     = [
    "Allow dynamic-group ${oci_identity_dynamic_group.container_instances.name} to manage network-security-groups in compartment id ${var.compartment_ocid}"
  ]
}
