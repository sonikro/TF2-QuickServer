import * as cdk from 'aws-cdk-lib';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import { Construct } from 'constructs';

export class Tf2QuickServerStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Create a VPC with public subnets only (no NAT Gateways)
    const vpc = new ec2.Vpc(this, 'TF2QuickServerVpc', {
      maxAzs: 2, // Number of availability zones
      natGateways: 0, // Disable NAT Gateways, since they cost money
      subnetConfiguration: [
        {
          name: 'PublicSubnet',
          subnetType: ec2.SubnetType.PUBLIC, // Public subnets only
          cidrMask: 24, 
        },
      ],
    });

    // Create an ECS Cluster in the VPC
    new ecs.Cluster(this, 'TF2QuickServerCluster', {
      clusterName: 'TF2-QuickServer-Cluster',
      vpc, // Attach the VPC to the ECS Cluster
    });
  }
}