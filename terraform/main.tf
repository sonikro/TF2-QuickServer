# ===========================================
# TERRAFORM PROVIDERS CONFIGURATION
# ===========================================

terraform {
  required_providers {
    oci = {
      source  = "oracle/oci"
      version = "~> 6.0"
    }
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

# ===========================================
# ORACLE CLOUD INFRASTRUCTURE PROVIDERS
# ===========================================

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

provider "oci" {
  alias  = "eu-frankfurt-1"
  region = "eu-frankfurt-1"
  config_file_profile = "eu-frankfurt-1"
}

# ===========================================
# AWS PROVIDERS
# ===========================================

# AWS Provider for us-east-1 (N. Virginia) region
# This will create infrastructure in us-east-1 with a Local Zone subnet in Buenos Aires
provider "aws" {
  alias  = "us-east-1"
  region = "us-east-1"
}

# ===========================================
# ORACLE CLOUD INFRASTRUCTURE MODULES
# ===========================================

# Create modules for each region
module "oci-network-sa-saopaulo-1" {
  source           = "./modules/oci/network"
  compartment_ocid = var.compartment_ocid

  providers = {
    oci = oci.sa-saopaulo-1
  }
}

module "oci-network-us-chicago-1" {
  source           = "./modules/oci/network"
  compartment_ocid = var.compartment_ocid

  providers = {
    oci = oci.us-chicago-1
  }
}

module "oci-network-sa-bogota-1" {
  source           = "./modules/oci/network"
  compartment_ocid = var.compartment_ocid

  providers = {
    oci = oci.sa-bogota-1
  }
}

module "oci-network-sa-santiago-1" {
  source           = "./modules/oci/network"
  compartment_ocid = var.santiago_compartment_ocid

  providers = {
    oci = oci.sa-santiago-1
  }
}

module "oci-network-eu-frankfurt-1" {
  source           = "./modules/oci/network"
  compartment_ocid = var.santiago_compartment_ocid

  providers = {
    oci = oci.eu-frankfurt-1
  }
}

# Create IAM Policies for each Root Region
module "oci-iam-us-chicago-1" {
  source           = "./modules/oci/iam"
  compartment_ocid = var.compartment_ocid

  providers = {
    oci = oci.us-chicago-1
  }
}

module "oci-iam-sa-santiago-1" {
  source           = "./modules/oci/iam"
  compartment_ocid = var.santiago_compartment_ocid

  providers = {
    oci = oci.sa-santiago-1
  }
}

# ===========================================
# AWS MODULES
# ===========================================

# Create network module for us-east-1 (N. Virginia) region with Buenos Aires Local Zone subnet
module "aws-network-us-east-1" {
  source = "./modules/aws/network"

  providers = {
    aws = aws.us-east-1
  }
}

# Create ECS module for us-east-1 (N. Virginia) region to support Buenos Aires Local Zone deployments
module "aws-ecs-us-east-1" {
  source = "./modules/aws/ecs"

  providers = {
    aws = aws.us-east-1
  }
}
