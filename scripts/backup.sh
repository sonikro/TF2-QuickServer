#!/bin/bash

set -euo pipefail

BACKUP_DIR="${BACKUP_DIR:-.}"
S3_BUCKET="${S3_BUCKET}"
S3_REGION="${S3_REGION:-us-east-1}"
BACKUP_NAME="tf2-quickserver-$(date +%Y%m%d-%H%M%S)"
BACKUP_PATH="/tmp/${BACKUP_NAME}.tar.gz"

if [ -z "$S3_BUCKET" ]; then
    echo "Error: S3_BUCKET environment variable is not set"
    exit 1
fi

echo "[$(date +'%Y-%m-%d %H:%M:%S')] Starting backup of $BACKUP_DIR"

tar czf "$BACKUP_PATH" \
    -C "$(dirname "$BACKUP_DIR")" \
    "$(basename "$BACKUP_DIR")"

BACKUP_SIZE=$(du -h "$BACKUP_PATH" | cut -f1)
echo "[$(date +'%Y-%m-%d %H:%M:%S')] Backup created: $BACKUP_PATH ($BACKUP_SIZE)"

echo "[$(date +'%Y-%m-%d %H:%M:%S')] Uploading to S3: s3://$S3_BUCKET/$BACKUP_NAME.tar.gz"
aws s3 cp "$BACKUP_PATH" "s3://$S3_BUCKET/$BACKUP_NAME.tar.gz" \
    --region "$S3_REGION" \
    --storage-class STANDARD_IA

echo "[$(date +'%Y-%m-%d %H:%M:%S')] Upload complete"

echo "[$(date +'%Y-%m-%d %H:%M:%S')] Existing backups in bucket:"
aws s3api list-objects-v2 \
    --bucket "$S3_BUCKET" \
    --region "$S3_REGION" \
    --query 'Contents[].{Key:Key, Size:Size, LastModified:LastModified}' \
    --output table

rm -f "$BACKUP_PATH"
echo "[$(date +'%Y-%m-%d %H:%M:%S')] Backup completed successfully"
