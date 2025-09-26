#!/bin/bash

# Helper script to update the 2v2mge whitelist
# This script downloads the latest whitelist from whitelist.tf and updates the local file

WHITELIST_ID="18462"
WHITELIST_URL="https://whitelist.tf/download/custom_whitelist_${WHITELIST_ID}.txt"
OUTPUT_FILE="$(dirname "$0")/../variants/base/tf/cfg/2v2mge_whitelist.txt"

echo "Downloading 2v2mge whitelist (ID: $WHITELIST_ID)..."
echo "URL: $WHITELIST_URL"
echo "Output: $OUTPUT_FILE"

# Ensure the output directory exists
mkdir -p "$(dirname "$OUTPUT_FILE")"

# Try different methods to download
if command -v curl >/dev/null 2>&1; then
    echo "Downloading with curl..."
    if curl -f -s -o "$OUTPUT_FILE" "$WHITELIST_URL"; then
        echo "✓ Successfully downloaded whitelist to $OUTPUT_FILE"
        echo "  The 2v2mge configuration is already set to use this whitelist."
        echo "  Whitelist ID: $WHITELIST_ID"
        exit 0
    else
        echo "✗ Failed to download with curl"
    fi
fi

if command -v wget >/dev/null 2>&1; then
    echo "Downloading with wget..."
    if wget -q -O "$OUTPUT_FILE" "$WHITELIST_URL"; then
        echo "✓ Successfully downloaded whitelist to $OUTPUT_FILE"
        echo "  The 2v2mge configuration is already set to use this whitelist."
        echo "  Whitelist ID: $WHITELIST_ID"
        exit 0
    else
        echo "✗ Failed to download with wget"
    fi
fi

echo ""
echo "✗ Failed to download whitelist automatically."
echo "  Please manually download the whitelist from:"
echo "  $WHITELIST_URL"
echo ""
echo "  And save it to:"
echo "  $OUTPUT_FILE"
echo ""
echo "  The 2v2mge configuration has been updated to reference whitelist ID $WHITELIST_ID"
exit 1