# Loop over each region and create a provider with alias
provider "oci" {
  alias  = "sa-saopaulo-1"
  region = "sa-saopaulo-1"
}


# Create modules for each region
module "network-sa-saopaulo-1" {
  source           = "./modules/network"
  region           = "sa-saopaulo-1"
  compartment_ocid = var.compartment_ocid

  providers = {
    oci = oci.sa-saopaulo-1
  }
}
