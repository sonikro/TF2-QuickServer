#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { Tf2QuickServerStack } from '../lib/tf2-quickserver-stack';
import { Tags } from 'aws-cdk-lib';
import { config } from 'dotenv';
import appConfig from 'config';

// Load environment variables from .env file
config();

const app = new cdk.App();

// Add default tags to all resources
Tags.of(app).add('Project', 'TF2-QuickServer');

// Get regions from the configuration
const regionsConfig = appConfig.get<Record<string, { enabled: boolean }>>("aws.regions");

for (const [region, { enabled }] of Object.entries(regionsConfig)) {
  if (!enabled) continue;

  // Deploy a stack for each enabled region
  new Tf2QuickServerStack(app, `Tf2QuickServerStack-${region}`, {
    env: {
      account: process.env.AWS_ACCOUNT_ID,
      region: region,
    },
  });

  console.log(`Stack created for region: ${region}`);
}
