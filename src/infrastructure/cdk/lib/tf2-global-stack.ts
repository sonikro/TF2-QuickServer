import * as cdk from 'aws-cdk-lib';
import * as s3 from 'aws-cdk-lib/aws-s3';
import { Construct } from 'constructs';
import { CdkConfig, getCdkConfig } from '../../../domain';

export class TF2GlobalStack extends cdk.Stack {
    public readonly bucket: s3.Bucket;
    private readonly cdkConfig: CdkConfig;
    constructor(scope: Construct, id: string, props?: cdk.StackProps) {
        super(scope, id, props);

        this.cdkConfig = getCdkConfig();

        // Create an S3 bucket
        this.bucket = new s3.Bucket(this, 'Tf2MapsBucket', {
            versioned: false,
            bucketName: this.cdkConfig.bucketName,
            removalPolicy: cdk.RemovalPolicy.DESTROY,
            autoDeleteObjects: true, // Automatically delete objects when the bucket is destroyed
            publicReadAccess: true, // Make the bucket public
            websiteIndexDocument: 'index.html', // Optional: Enable static website hosting,
            blockPublicAccess: new s3.BlockPublicAccess({
                blockPublicAcls: false,
                ignorePublicAcls: true,
                blockPublicPolicy: false,
                restrictPublicBuckets: false,
            }),
        });

    }
}
