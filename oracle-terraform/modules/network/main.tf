terraform {
  required_providers {
    oci = {
      source  = "hashicorp/oci"
      version = "~> 6.0"
    }
  }
}

data "oci_identity_availability_domains" "ads" {
  compartment_id = var.compartment_ocid
}

resource "oci_core_virtual_network" "vcn" {
  compartment_id = var.compartment_ocid
  cidr_block     = "10.0.0.0/16"
  display_name   = "TF2-QuickServer-vcn"
}

resource "oci_core_internet_gateway" "igw" {
  compartment_id = var.compartment_ocid
  display_name   = "TF2-QuickServer-igw"
  vcn_id         = oci_core_virtual_network.vcn.id
  enabled        = true
}

resource "oci_core_route_table" "public_rt" {
  compartment_id = var.compartment_ocid
  vcn_id         = oci_core_virtual_network.vcn.id
  display_name   = "TF2-QuickServer-public-rt"

  route_rules {
    destination       = "0.0.0.0/0"
    destination_type  = "CIDR_BLOCK"
    network_entity_id = oci_core_internet_gateway.igw.id
  }
}

resource "oci_core_subnet" "public_subnet" {
  compartment_id      = var.compartment_ocid
  availability_domain = data.oci_identity_availability_domains.ads.availability_domains[0].name
  cidr_block          = "10.0.1.0/24"
  display_name        = "TF2-QuickServer-public-subnet"
  vcn_id              = oci_core_virtual_network.vcn.id
  route_table_id      = oci_core_route_table.public_rt.id
  prohibit_public_ip_on_vnic = false
}

resource "oci_core_network_security_group" "nsg" {
  compartment_id = var.compartment_ocid
  vcn_id         = oci_core_virtual_network.vcn.id
  display_name   = "TF2-QuickServer-nsg"
}

resource "oci_core_network_security_group_security_rule" "tcp" {
  network_security_group_id = oci_core_network_security_group.nsg.id
  direction                 = "INGRESS"
  protocol                  = "6"
  source_type               = "CIDR_BLOCK"
  source                    = "0.0.0.0/0"

  tcp_options {
    destination_port_range {
      min = 27015
      max = 27020
    }
  }
}

resource "oci_core_network_security_group_security_rule" "udp" {
  network_security_group_id = oci_core_network_security_group.nsg.id
  direction                 = "INGRESS"
  protocol                  = "17"
  source_type               = "CIDR_BLOCK"
  source                    = "0.0.0.0/0"

  udp_options {
    destination_port_range {
      min = 27015
      max = 27020
    }
  }
}

resource "oci_core_network_security_group_security_rule" "egress" {
  network_security_group_id = oci_core_network_security_group.nsg.id
  direction                 = "EGRESS"
  protocol                  = "all"
  destination_type          = "CIDR_BLOCK"
  destination               = "0.0.0.0/0"
}
