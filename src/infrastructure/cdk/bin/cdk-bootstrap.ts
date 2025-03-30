import { execSync } from 'child_process';
import config from 'config';
import { config as dotenvConfig } from 'dotenv';
dotenvConfig();

// AWS Account ID
const AWS_ACCOUNT_ID = process.env.AWS_ACCOUNT_ID as string;

// Get regions from configuration
const regionsConfig: Record<string, { enabled: boolean }> = config.get('aws.regions');

for (const [region, { enabled }] of Object.entries(regionsConfig)) {
    if (!enabled) continue;

    console.log(`Bootstrapping region: ${region}`);
    execSync(`npx cdk bootstrap aws://${AWS_ACCOUNT_ID}/${region}`, { stdio: 'inherit' });
}
