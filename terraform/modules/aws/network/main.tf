terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

# Get available zones for us-east-1 (N. Virginia) region
data "aws_availability_zones" "available" {
  state = "available"
}

# Create VPC in us-east-1 (N. Virginia) region
resource "aws_vpc" "main" {
  cidr_block           = "10.0.0.0/16"
  enable_dns_hostnames = true
  enable_dns_support   = true

  tags = {
    Name        = "TF2-QuickServer-vpc"
    Description = "VPC in us-east-1 N.Virginia for Buenos Aires Local Zone deployment"
  }
}

# Create Internet Gateway for us-east-1 (N. Virginia) VPC
resource "aws_internet_gateway" "igw" {
  vpc_id = aws_vpc.main.id

  tags = {
    Name        = "TF2-QuickServer-igw"
    Description = "Internet Gateway for us-east-1 N.Virginia VPC serving Buenos Aires Local Zone"
  }
}

# Create Route Table for public subnet in us-east-1 (N. Virginia)
resource "aws_route_table" "public_rt" {
  vpc_id = aws_vpc.main.id

  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.igw.id
  }

  tags = {
    Name        = "TF2-QuickServer-public-rt"
    Description = "Public route table for us-east-1 N.Virginia serving Buenos Aires Local Zone"
  }
}

# Create subnet in Buenos Aires Local Zone (us-east-1-bue-1a)
# This is a Local Zone subnet within the us-east-1 (N. Virginia) region
resource "aws_subnet" "buenos_aires_subnet" {
  vpc_id                  = aws_vpc.main.id
  cidr_block              = "10.0.1.0/24"
  availability_zone       = "us-east-1-bue-1a"
  map_public_ip_on_launch = true

  tags = {
    Name        = "TF2-QuickServer-buenos-aires-subnet"
    Description = "Buenos Aires Local Zone subnet us-east-1-bue-1a within us-east-1 N.Virginia region"
    LocalZone   = "Buenos Aires"
    ParentRegion = "us-east-1"
  }
}

# Associate the route table with the subnet
resource "aws_route_table_association" "public_rta" {
  subnet_id      = aws_subnet.buenos_aires_subnet.id
  route_table_id = aws_route_table.public_rt.id
}
