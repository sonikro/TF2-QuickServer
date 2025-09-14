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
    value = "disabled"
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

# ECS Instance Role for EC2 instances in the ECS cluster
resource "aws_iam_role" "ecs_instance_role" {
  name = "tf2-quickserver-ecs-instance-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "ec2.amazonaws.com"
        }
      }
    ]
  })

}

# Attach the Amazon ECS Container Instance policy
resource "aws_iam_role_policy_attachment" "ecs_instance_role_policy" {
  role       = aws_iam_role.ecs_instance_role.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonEC2ContainerServiceforEC2Role"
}

# Additional policy for SSM access (helpful for debugging)
resource "aws_iam_role_policy_attachment" "ecs_instance_ssm_policy" {
  role       = aws_iam_role.ecs_instance_role.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore"
}

# Create IAM instance profile for ECS instances
resource "aws_iam_instance_profile" "ecs_instance_profile" {
  name = "tf2-quickserver-ecsInstanceRole"
  role = aws_iam_role.ecs_instance_role.name

}

# ===========================================
# CLOUDWATCH LOG GROUP
# ===========================================

resource "aws_cloudwatch_log_group" "ecs_log_group" {
  name              = "/ecs/tf2-quickserver"
  retention_in_days = 7

  }
}
