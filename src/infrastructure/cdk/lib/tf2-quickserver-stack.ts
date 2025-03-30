import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import { Construct } from 'constructs';
import { CdkConfig, getCdkConfig } from '../../../domain/CDKConfig';

export class Tf2QuickServerStack extends cdk.Stack {
  private readonly cdkConfig: CdkConfig;
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    this.cdkConfig = getCdkConfig();

    // Create a VPC with public subnets only (no NAT Gateways)
    const vpc = new ec2.Vpc(this, 'TF2QuickServerVpc', {
      vpcName: this.cdkConfig.vpcName,
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
    const cluster = new ecs.Cluster(this, 'TF2QuickServerCluster', {
      clusterName: this.cdkConfig.ecsClusterName,
      vpc, // Attach the VPC to the ECS Cluster
    });

    // Creates a Standard Security Group
    const securityGroup = new ec2.SecurityGroup(this, 'TF2QuickServerSG', {
      vpc,
      allowAllOutbound: true,
      description: 'Standard Security Group for TF2 Quick Server',
      securityGroupName: this.cdkConfig.sgName,
    });

    // Allow TCP traffic from port range 27015-27020 from all sources
    securityGroup.addIngressRule(ec2.Peer.anyIpv4(), ec2.Port.tcpRange(27015, 27020), 'Allow TCP traffic on ports 27015-27020');

    // Allow UDP traffic from port range 27015-27020 from all sources
    securityGroup.addIngressRule(ec2.Peer.anyIpv4(), ec2.Port.udpRange(27015, 27020), 'Allow UDP traffic on ports 27015-27020');
  }
}