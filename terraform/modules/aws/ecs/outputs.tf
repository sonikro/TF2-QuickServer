output "cluster_name" {
  description = "Name of the ECS cluster in us-east-1 (N. Virginia) for Buenos Aires Local Zone deployments"
  value       = aws_ecs_cluster.main.name
}

output "cluster_arn" {
  description = "ARN of the ECS cluster in us-east-1 (N. Virginia) for Buenos Aires Local Zone deployments"
  value       = aws_ecs_cluster.main.arn
}

output "task_execution_role_arn" {
  description = "ARN of the ECS task execution role in us-east-1 (N. Virginia) for Buenos Aires Local Zone deployments"
  value       = aws_iam_role.ecs_task_execution_role.arn
}

output "task_role_arn" {
  description = "ARN of the ECS task role in us-east-1 (N. Virginia) for Buenos Aires Local Zone deployments"
  value       = aws_iam_role.ecs_task_role.arn
}
