locals {
  aws_region = "us-east-1"
}

terraform_version_constraint = ">= 1.8, < 2.0"

remote_state {
  backend = "s3"
  config = {
    bucket         = "tf2-quickserver-terraform-state"
    key            = "landing-page/terraform.tfstate"
    region         = local.aws_region
    encrypt        = true
    dynamodb_table = "tf2-quickserver-terraform-locks"
  }
}

generate "provider" {
  path      = "provider-generated.tf"
  if_exists = "overwrite_terragrunt"
  contents  = <<EOF
provider "aws" {
  region = "${local.aws_region}"
}
EOF
}
