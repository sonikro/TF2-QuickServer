terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

# ECS Cluster in us-east-1 (N. Virginia) region for Buenos Aires Local Zone deployments
resource "aws_ecs_cluster" "main" {
  name = "tf2-quickserver-cluster"

  setting {
    name  = "containerInsights"
    value = "enabled"
  }

  tags = {
    Name        = "TF2-QuickServer-cluster"
    Description = "ECS cluster in us-east-1 N.Virginia for Buenos Aires Local Zone deployments"
    Region      = "us-east-1"
    LocalZone   = "Buenos Aires us-east-1-bue-1a"
  }
}

# ECS Cluster Capacity Providers - Fargate only
resource "aws_ecs_cluster_capacity_providers" "main" {
  cluster_name = aws_ecs_cluster.main.name

  capacity_providers = ["FARGATE", "FARGATE_SPOT"]

  default_capacity_provider_strategy {
    base              = 1
    weight            = 100
    capacity_provider = "FARGATE"
  }
}

# ECS Task Execution Role for us-east-1 (N. Virginia) region
resource "aws_iam_role" "ecs_task_execution_role" {
  name = "tf2-quickserver-ecs-task-execution-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "ecs-tasks.amazonaws.com"
        }
      }
    ]
  })

  tags = {
    Name        = "TF2-QuickServer-task-execution-role"
    Description = "ECS task execution role for us-east-1 N.Virginia serving Buenos Aires Local Zone"
    Region      = "us-east-1"
  }
}

# Attach the AWS managed policy for ECS task execution
resource "aws_iam_role_policy_attachment" "ecs_task_execution_role_policy" {
  role       = aws_iam_role.ecs_task_execution_role.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
}

# ECS Task Role for us-east-1 (N. Virginia) region (for the application itself)
resource "aws_iam_role" "ecs_task_role" {
  name = "tf2-quickserver-ecs-task-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "ecs-tasks.amazonaws.com"
        }
      }
    ]
  })

  tags = {
    Name        = "TF2-QuickServer-task-role"
    Description = "ECS task role for us-east-1 N.Virginia serving Buenos Aires Local Zone"
    Region      = "us-east-1"
  }
}

# Policy for the task role (if the TF2 server needs specific AWS permissions)
resource "aws_iam_role_policy" "ecs_task_role_policy" {
  name = "tf2-quickserver-task-policy"
  role = aws_iam_role.ecs_task_role.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents",
          "logs:DescribeLogStreams",
          "logs:DescribeLogGroups"
        ]
        Resource = "*"
      }
    ]
  })
}
