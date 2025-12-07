generate "backend" {
  path      = "backend.tf"
  if_exists = "overwrite_terragrunt"

  contents = <<EOF
terraform {
  required_version = ">= 1.7.0"

  backend "s3" {
    encrypt = true
  }
}
EOF
}

locals {
  aws_region = "us-east-1"
  project    = "tf2-quickserver"
  env        = "production"
}

inputs = {
  aws_region = local.aws_region
}

remote_state {
  backend = "s3"

  config = {
    encrypt        = true
    bucket         = "${local.project}-terraform-state"
    key            = "${path_relative_to_include()}/terraform.tfstate"
    region         = local.aws_region
    dynamodb_table = "${local.project}-terraform-locks"
  }

  generate = {
    path      = "backend.tf"
    if_exists = "overwrite_terragrunt"
  }
}
