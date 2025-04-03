#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { Tags } from 'aws-cdk-lib';
import appConfig from 'config';
import { config } from 'dotenv';
import { TF2GlobalStack } from '../lib/tf2-global-stack';
import { TF2RegionalStack } from '../lib/tf2-regional-stack';

// Load environment variables from .env file
config();

// Initialize the CDK app
const app = new cdk.App();

// Add default tags to all resources
Tags.of(app).add('Project', 'TF2-QuickServer');

// Deploy the Global Maps Stack
const globalStack = createGlobalMapsStack(app);
// Deploy regional stacks based on configuration
createRegionalStacks(app, [globalStack]);

// Deploy the Map Files Stack

/**
 * Creates the Global Maps Stack.
 */
function createGlobalMapsStack(app: cdk.App): TF2GlobalStack {
  return new TF2GlobalStack(app, 'Tf2MapsStack', {
    crossRegionReferences: true,
    env: {
      account: process.env.AWS_ACCOUNT_ID,
      region: 'us-east-1', // Global resources should be in us-east-1
    },
  });
}

/**
 * Creates regional stacks based on the configuration.
 */
function createRegionalStacks(app: cdk.App, dependsOn: cdk.Stack[]): cdk.Stack[] {
  const regionsConfig = appConfig.get<Record<string, { enabled: boolean }>>('aws.regions');
  const regionalStacks: cdk.Stack[] = [];

  for (const [region, { enabled }] of Object.entries(regionsConfig)) {
    if (!enabled) continue;

    const quickServerStack = new TF2RegionalStack(app, `Tf2QuickServerStack-${region}`, {
      env: {
        account: process.env.AWS_ACCOUNT_ID,
        region: region,
      },
    });

    dependsOn.forEach((stack) => {
      quickServerStack.addDependency(stack);
    })

    regionalStacks.push(quickServerStack);
    console.log(`Stack created for region: ${region}`);
  }

  return regionalStacks;
}