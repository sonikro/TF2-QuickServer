# FastDL Implementation Summary

## Overview

This implementation provides TF2-QuickServer with its own FastDL (Fast Download) infrastructure hosted on AWS S3, eliminating dependency on serveme.tf and ensuring all maps are available and up-to-date.

## What Was Implemented

### 1. Infrastructure (Terraform)

**Location**: `terraform/modules/aws/fastdl/`

Created a complete Terraform module that provisions:
- **S3 Bucket** with static website hosting enabled
- **Public Access Configuration** to allow players to download maps
- **CORS Configuration** for cross-origin requests
- **S3 Bucket Policy** granting public read access
- **Route53 DNS Record** pointing maps.sonikro.com to S3

**Integration**: The module is integrated into the main Terraform configuration in `terraform/main.tf` and uses the us-east-1 region.

### 2. CI/CD Pipeline (GitHub Actions)

**Location**: `.github/workflows/sync-fastdl.yaml`

Created an automated workflow that:
- Triggers on maps.json changes or manual dispatch
- Downloads all maps from maps.json
- Compresses maps with bzip2 (standard for Source engine FastDL)
- Syncs maps to S3 with proper cache headers
- Removes maps no longer in maps.json (--delete flag)
- Posts notification to Discord on success

**Key Features**:
- Uses GitHub Actions cache to avoid re-downloading unchanged maps
- Sets aggressive cache headers (1 year) for immutable map files
- Validates sync by listing uploaded files

### 3. Server Configuration

**Location**: 
- `variants/fat-standard-competitive-i386/Dockerfile`
- `variants/fat-standard-competitive-amd64/Dockerfile`

Updated the default `DOWNLOAD_URL` environment variable from:
```
DOWNLOAD_URL="https://fastdl.serveme.tf/"
```

To:
```
DOWNLOAD_URL="http://maps.sonikro.com/fastdl/"
```

This ensures all new TF2 servers automatically use the new FastDL endpoint.

### 4. Documentation

**Location**: `docs/FASTDL.md`

Created comprehensive documentation covering:
- Architecture overview
- Setup instructions
- Required secrets and variables
- Troubleshooting guide
- Cost estimation
- Benefits over previous solution

### 5. Validation Script

**Location**: `scripts/validate_maps.js`

Created a Node.js script that validates the structure of maps.json, ensuring:
- The file is valid JSON
- All entries are either strings or objects with name/url properties
- No malformed entries exist

### 6. Updated README

Updated the main README.md to reference the new FastDL functionality and link to the documentation.

## Configuration Required

To deploy this solution, the following needs to be configured:

### Terraform Variables

Add to `terraform.tfvars`:
```hcl
route53_hosted_zone_id = "Z1234567890ABC"  # Your Route53 hosted zone ID
```

Optional (have defaults):
```hcl
fastdl_bucket_name = "tf2-quickserver-fastdl"
fastdl_domain_name = "maps.sonikro.com"
```

### GitHub Secrets

Configure in repository settings:
- `AWS_ACCESS_KEY_ID`: AWS access key with S3 write permissions
- `AWS_SECRET_ACCESS_KEY`: AWS secret access key
- `FASTDL_BUCKET_NAME`: Name of S3 bucket (e.g., tf2-quickserver-fastdl)
- `DISCORD_RELEASE_WEBHOOK_URL`: Optional, for notifications

## Deployment Steps

1. **Deploy Infrastructure**:
   ```bash
   npm run terraform:deploy
   ```
   This will create the S3 bucket and DNS record.

2. **Configure GitHub Secrets**:
   Add the required secrets to the repository.

3. **Initial Map Sync**:
   - Push a change to maps.json, or
   - Manually trigger the "Sync Maps to FastDL S3" workflow

4. **Verify**:
   - Check that maps.sonikro.com resolves correctly
   - Test downloading a map: `curl http://maps.sonikro.com/fastdl/maps/cp_process_f12.bsp.bz2`

5. **Build and Deploy New Server Images**:
   The publish-variants workflow will automatically build images with the new FastDL URL.

## Benefits

1. **Independence**: No reliance on third-party FastDL services
2. **Consistency**: All servers use exactly the same map versions
3. **Automation**: Maps sync automatically when maps.json changes
4. **Cost-Effective**: S3 + Route53 costs approximately $1-2/month for typical usage
5. **Performance**: S3 provides fast, reliable downloads worldwide
6. **Simplicity**: No CDN needed, just S3 static website hosting

## Technical Details

### FastDL Structure

The S3 bucket follows Source engine FastDL conventions:
```
s3://tf2-quickserver-fastdl/
└── fastdl/
    └── maps/
        ├── cp_process_f12.bsp.bz2
        ├── koth_product_final.bsp.bz2
        └── ...
```

### How Source Engine FastDL Works

1. Server has `sv_downloadurl` set to `http://maps.sonikro.com/fastdl/`
2. When a player joins and is missing a map, the server tells the client to download it
3. Client requests: `http://maps.sonikro.com/fastdl/maps/<mapname>.bsp.bz2`
4. Client downloads, decompresses, and installs the map
5. Player joins the server

### Cache Configuration

Maps are served with:
- `Cache-Control: public, max-age=31536000, immutable`
- This tells browsers/clients to cache for 1 year
- Maps never change (new versions get new filenames), so this is safe

### Compression

- Maps are compressed with bzip2 at maximum compression (-9)
- Typical compression ratio: ~50% (100MB map → 50MB download)
- Source engine clients automatically decompress .bsp.bz2 files

## Future Enhancements

Potential improvements for the future:

1. **CloudFront CDN**: Add CloudFront distribution for even faster downloads globally
2. **Custom Domain HTTPS**: Use ACM certificate with CloudFront for HTTPS support
3. **Map Validation**: Verify downloaded maps are valid .bsp files before uploading
4. **Upload Monitoring**: Track map download statistics using CloudWatch/S3 access logs
5. **Automatic Cleanup**: Remove old/unused map versions after certain period

## Testing

To test the implementation:

1. **Terraform Validation**: `terraform validate` in terraform directory ✓
2. **Maps JSON Validation**: `node scripts/validate_maps.js` ✓
3. **YAML Linting**: `yamllint .github/workflows/sync-fastdl.yaml` ✓

Manual testing after deployment:
1. Deploy infrastructure with Terraform
2. Run the GitHub Actions workflow
3. Verify maps are accessible via curl/browser
4. Test with actual TF2 server and client

## Files Changed

- `.github/workflows/sync-fastdl.yaml` (new)
- `.gitignore` (updated)
- `README.md` (updated)
- `docs/FASTDL.md` (new)
- `scripts/validate_maps.js` (new)
- `terraform/main.tf` (updated)
- `terraform/outputs.tf` (updated)
- `terraform/variables.tf` (updated)
- `terraform/modules/aws/fastdl/main.tf` (new)
- `terraform/modules/aws/fastdl/outputs.tf` (new)
- `terraform/modules/aws/fastdl/variables.tf` (new)
- `variants/fat-standard-competitive-amd64/Dockerfile` (updated)
- `variants/fat-standard-competitive-i386/Dockerfile` (updated)

## Support

For issues or questions:
1. Check docs/FASTDL.md for troubleshooting
2. Review GitHub Actions workflow logs
3. Verify AWS credentials and permissions
4. Open a GitHub issue if problems persist
