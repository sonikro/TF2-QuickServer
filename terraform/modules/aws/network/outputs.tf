output "vpc_id" {
  description = "ID of the VPC in us-east-1 (N. Virginia) region"
  value       = aws_vpc.main.id
}

output "subnet_id" {
  description = "ID of the Buenos Aires Local Zone subnet (us-east-1-bue-1a) within us-east-1 (N. Virginia)"
  value       = aws_subnet.local_zone_subnet.id
}

output "subnet_cidr_block" {
  description = "CIDR block of the Buenos Aires Local Zone subnet within us-east-1 (N. Virginia)"
  value       = aws_subnet.local_zone_subnet.cidr_block
}

output "internet_gateway_id" {
  description = "ID of the Internet Gateway for us-east-1 (N. Virginia) VPC"
  value       = aws_internet_gateway.igw.id
}

output "route_table_id" {
  description = "ID of the public route table for us-east-1 (N. Virginia) region"
  value       = aws_route_table.public_rt.id
}

output "availability_zone" {
  description = "Availability zone of the Buenos Aires Local Zone (us-east-1-bue-1a) within us-east-1 (N. Virginia)"
  value       = aws_subnet.local_zone_subnet.availability_zone
}
