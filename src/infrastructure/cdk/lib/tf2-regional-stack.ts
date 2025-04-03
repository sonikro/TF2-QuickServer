import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as efs from 'aws-cdk-lib/aws-efs';
import * as events from "aws-cdk-lib/aws-events";
import * as eventsTargets from "aws-cdk-lib/aws-events-targets";
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as s3 from 'aws-cdk-lib/aws-s3';
import { Construct } from 'constructs';
import * as path from 'path';
import { CdkConfig, getCdkConfig } from '../../../domain/CDKConfig';
import * as s3deploy from 'aws-cdk-lib/aws-s3-deployment';


export class TF2RegionalStack extends cdk.Stack {
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

    const bucket = s3.Bucket.fromBucketName(this, 'Tf2MapsBucket', this.cdkConfig.bucketName);
    // Deploy files from the "maps" directory under the current working directory to the "maps" folder in the S3 bucket
    new s3deploy.BucketDeployment(this, 'DeployMapFiles', {
      sources: [s3deploy.Source.asset(`${process.cwd()}/maps`)],
      destinationBucket: bucket,
      destinationKeyPrefix: 'maps/', // Upload to the "maps" folder in the bucket
      ephemeralStorageSize: cdk.Size.mebibytes(5120), // 5 gb of ephemeral storage to support all maps
      memoryLimit: 5120, // 5 gb of memory to support all maps
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

    const efsSecurityGroup = new ec2.SecurityGroup(this, 'EFSSecurityGroup', {
      vpc: vpc,
      allowAllOutbound: true, // Allow outbound traffic on all ports
      securityGroupName: 'TF2-QuickServerEFS-SG',
    });

    // Add an inbound rule to allow connections on port 2049
    efsSecurityGroup.addIngressRule(ec2.Peer.anyIpv4(), ec2.Port.tcp(2049), 'Allow NFS Connections');

    // Create an EFS File System
    const fileSystem = new efs.FileSystem(this, 'TF2QuickServerEFS', {
      vpc,
      performanceMode: efs.PerformanceMode.GENERAL_PURPOSE,
      throughputMode: efs.ThroughputMode.BURSTING,
      fileSystemName: this.cdkConfig.efsName,
    });

    const accessPoint = fileSystem.addAccessPoint('AccessPoint', {
      createAcl: {
        ownerUid: '1000',
        ownerGid: '1000',
        permissions: '750',
      },
      posixUser: {
        uid: '1000',
        gid: '1000',
      },
    });

    // Create a Lambda function to copy files from S3 to EFS
    const s3ToEfsLambda = new lambda.Function(this, 'S3ToEfsLambda', {
      functionName: 'S3ToEfsLambda',
      description: 'Lambda function to copy files from S3 to EFS',
      memorySize: 2048,
      timeout: cdk.Duration.minutes(15),
      runtime: lambda.Runtime.NODEJS_LATEST,
      handler: 'index.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, 'lambda')), // Path to Lambda code
      vpc,
      securityGroups: [efsSecurityGroup],
      filesystem: lambda.FileSystem.fromEfsAccessPoint(accessPoint, '/mnt/efs'),
      environment: {
        BUCKET_NAME: this.cdkConfig.bucketName,
        EFS_MOUNT_PATH: '/mnt/efs',
      },
      allowPublicSubnet: true, // Lambdas in public subnets have no internet access, but we don't need it
    });

    // Grant the Lambda function permissions to read from the S3 bucket using the bucket name
    bucket.grantRead(s3ToEfsLambda);

    // Triggers the lambda function 
    new events.Rule(this, "DeploymentHook", {
      eventPattern: {
        detailType: ["CloudFormation Stack Status Change"],
        source: ["aws.cloudformation"],
        detail: {
          "stack-id": [cdk.Stack.of(this).stackId],
          "status-details": {
            status: ["CREATE_COMPLETE", "UPDATE_COMPLETE"],
          },
        },
      },
      targets: [new eventsTargets.LambdaFunction(s3ToEfsLambda)],
    });

  }
}