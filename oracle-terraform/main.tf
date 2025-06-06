# Loop over each region and create a provider with alias
provider "oci" {
  alias  = "sa-saopaulo-1"
  region = "sa-saopaulo-1"
  config_file_profile = "sa-saopaulo-1"
}

provider "oci" {
  alias  = "us-chicago-1"
  region = "us-chicago-1"
  config_file_profile = "us-chicago-1"
}

provider "oci" {
  alias  = "sa-bogota-1"
  region = "sa-bogota-1"
  config_file_profile = "sa-bogota-1"
}

provider "oci" {
  alias  = "sa-santiago-1"
  region = "sa-santiago-1"
  config_file_profile = "sa-santiago-1"
}

# Create modules for each region
module "network-sa-saopaulo-1" {
  source           = "./modules/network"
  compartment_ocid = var.compartment_ocid

  providers = {
    oci = oci.sa-saopaulo-1
  }
}

module "network-us-chicago-1" {
  source           = "./modules/network"
  compartment_ocid = var.compartment_ocid

  providers = {
    oci = oci.us-chicago-1
  }
}

module "network-sa-bogota-1" {
  source           = "./modules/network"
  compartment_ocid = var.compartment_ocid

  providers = {
    oci = oci.sa-bogota-1
  }
}

module "network-sa-santiago-1" {
  source           = "./modules/network"
  compartment_ocid = var.santiago_compartment_ocid

  providers = {
    oci = oci.sa-santiago-1
  }
}

# Create IAM Policies for each Root Region

module "iam-us-chicago-1" {
  source           = "./modules/iam"
  compartment_ocid = var.compartment_ocid

  providers = {
    oci = oci.us-chicago-1
  }
}

module "iam-sa-santiago-1" {
  source           = "./modules/iam"
  compartment_ocid = var.santiago_compartment_ocid

  providers = {
    oci = oci.sa-santiago-1
  }
}