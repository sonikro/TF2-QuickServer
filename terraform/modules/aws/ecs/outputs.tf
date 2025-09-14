output "cluster_name" {
  description = "Name of the ECS cluster"
  value       = aws_ecs_cluster.main.name
}

output "cluster_arn" {
  description = "ARN of the ECS cluster"
  value       = aws_ecs_cluster.main.arn
}

output "task_execution_role_arn" {
  description = "ARN of the ECS task execution role"
  value       = aws_iam_role.ecs_task_execution_role.arn
}

output "task_role_arn" {
  description = "ARN of the ECS task role"
  value       = aws_iam_role.ecs_task_role.arn
}

output "instance_profile_arn" {
  description = "ARN of the ECS instance profile"
  value       = aws_iam_instance_profile.ecs_instance_profile.arn
}

output "log_group_name" {
  description = "Name of the CloudWatch log group for ECS containers"
  value       = aws_cloudwatch_log_group.ecs_log_group.name
}
