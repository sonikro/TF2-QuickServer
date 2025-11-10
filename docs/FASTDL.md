# FastDL Infrastructure

## Overview

TF2-QuickServer uses a custom FastDL (Fast Download) server hosted on AWS S3 to provide maps to players. This ensures all maps are available and up-to-date across all servers.

## Architecture

- **S3 Bucket**: Static website hosting with public read access
- **Domain**: maps.sonikro.com (via Route53)
- **Endpoint**: http://maps.sonikro.com/fastdl/
- **Content**: All maps from maps.json, compressed with bzip2

## How It Works

1. Maps are defined in `maps.json` at the repository root
2. On push to main branch (when maps.json changes), a GitHub Actions workflow:
   - Downloads all maps from maps.json
   - Compresses them with bzip2 (reduces download size)
   - Syncs them to the S3 bucket under the `fastdl/maps/` path
   - Sets proper cache headers and content types
3. TF2 servers are configured with `sv_downloadurl "http://maps.sonikro.com/fastdl/"` in their server.cfg
4. When players join, missing maps are automatically downloaded from the FastDL server

## Infrastructure Setup

The FastDL infrastructure is managed via Terraform in `terraform/modules/aws/fastdl/`.

### Required Terraform Variables

Add these to your terraform.tfvars or environment:

```hcl
route53_hosted_zone_id = "Z1234567890ABC"  # Your Route53 hosted zone ID for sonikro.com
fastdl_bucket_name = "tf2-quickserver-fastdl"  # Optional: defaults to this value
fastdl_domain_name = "maps.sonikro.com"  # Optional: defaults to this value
```

### Deploy Infrastructure

```bash
npm run terraform:deploy
```

This creates:
- S3 bucket with public website hosting
- S3 bucket policy for public read access
- CORS configuration
- Route53 DNS record pointing to S3 website endpoint

## GitHub Secrets Required

For the sync-fastdl workflow to work, configure these secrets in your GitHub repository:

- `AWS_ACCESS_KEY_ID`: AWS access key with S3 write permissions
- `AWS_SECRET_ACCESS_KEY`: AWS secret access key
- `FASTDL_BUCKET_NAME`: Name of the S3 bucket (e.g., tf2-quickserver-fastdl)
- `DISCORD_RELEASE_WEBHOOK_URL`: Discord webhook for notifications (optional)

## Manual Map Sync

To manually trigger a map sync to S3:

1. Go to GitHub Actions tab
2. Select "Sync Maps to FastDL S3" workflow
3. Click "Run workflow"

## Adding New Maps

1. Add the map to `maps.json`:
   ```json
   [
       "cp_process_f12",
       "koth_product_final",
       {
           "name": "custom_map_v1",
           "url": "https://example.com/custom_map_v1.bsp"
       }
   ]
   ```

2. Commit and push to main branch
3. GitHub Actions will automatically:
   - Download the new map
   - Upload it to S3 FastDL
   - Remove any maps no longer in maps.json

## FastDL File Structure

The S3 bucket follows Source engine FastDL structure:

```
s3://tf2-quickserver-fastdl/
└── fastdl/
    └── maps/
        ├── cp_process_f12.bsp.bz2
        ├── koth_product_final.bsp.bz2
        └── ...
```

## Benefits Over serveme.tf FastDL

1. **Control**: We control which maps are available
2. **Consistency**: All servers use the same map versions
3. **Reliability**: No dependency on third-party FastDL
4. **Cost-effective**: S3 costs are minimal for this use case
5. **Automation**: Map updates are fully automated via CI/CD

## Troubleshooting

### Maps not downloading for players

1. Verify the S3 bucket is publicly accessible
2. Check that DNS is resolving correctly: `nslookup maps.sonikro.com`
3. Test downloading a map directly: `curl http://maps.sonikro.com/fastdl/maps/cp_process_f12.bsp.bz2`
4. Verify server.cfg has correct `sv_downloadurl` value

### Workflow failing

1. Check AWS credentials are valid and have S3 permissions
2. Verify FASTDL_BUCKET_NAME secret matches actual bucket name
3. Review workflow logs in GitHub Actions

## Cost Estimation

With typical usage (100 maps, ~1GB total, 1000 downloads/month):
- **S3 Storage**: ~$0.02/month
- **S3 Data Transfer**: ~$90/month for 1TB transfer (first 100GB free)
- **Route53**: $0.50/month per hosted zone record

Total: ~$1-2/month for low usage scenarios
