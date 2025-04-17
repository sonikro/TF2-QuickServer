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