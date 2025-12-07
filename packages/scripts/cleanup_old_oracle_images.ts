import path from 'path';
import {config}  from 'dotenv';
import * as oci from 'oci-sdk';
import { getRegions, Region, getCloudProvider, CloudProvider, getOracleConfig } from '@tf2qs/core';
import { defaultOracleServiceFactory } from '@tf2qs/providers';

const rootDir = path.resolve(__dirname, '../../');
config({ path: path.resolve(rootDir, '.env') });

type ImageInfo = {
    id: string;
    displayName: string;
    timeCreated: Date;
    region: Region;
};

const listImagesInRegion = async (params: { 
    computeClient: oci.core.ComputeClient;
    compartmentId: string;
    region: Region;
}): Promise<ImageInfo[]> => {
    const { computeClient, compartmentId, region } = params;
    
    const request: oci.core.requests.ListImagesRequest = {
        compartmentId,
        displayName: 'tf2-quickserver-vm'
    };
    
    const response = await computeClient.listImages(request);
    
    return response.items.map(image => ({
        id: image.id,
        displayName: image.displayName || '',
        timeCreated: new Date(image.timeCreated),
        region
    }));
};

const deleteImage = async (params: {
    computeClient: oci.core.ComputeClient;
    imageId: string;
}): Promise<void> => {
    const { computeClient, imageId } = params;
    
    const request: oci.core.requests.DeleteImageRequest = {
        imageId
    };
    
    await computeClient.deleteImage(request);
};

const cleanupOldImages = async (params: {
    dryRun: boolean;
}): Promise<void> => {
    const { dryRun } = params;
    
    const regions = getRegions().filter(region => 
        getCloudProvider(region) === CloudProvider.ORACLE
    );
    
    const oracleConfig = getOracleConfig();
    
    console.log(`Scanning ${regions.length} Oracle regions for tf2-quickserver-vm images...`);
    console.log(`Dry run mode: ${dryRun}`);
    console.log('');
    
    let totalImagesFound = 0;
    let totalImagesToDelete = 0;
    let totalImagesDeleted = 0;
    
    for (const region of regions) {
        console.log(`Checking region: ${region}`);
        
        const oracleRegionConfig = oracleConfig.regions[region];
        if (!oracleRegionConfig) {
            console.log(`  Region ${region} not configured in Oracle config, skipping`);
            console.log('');
            continue;
        }
        
        const compartmentId = oracleRegionConfig.compartment_id;
        const { computeClient } = defaultOracleServiceFactory(region);
        
        const images = await listImagesInRegion({ 
            computeClient, 
            compartmentId, 
            region 
        });
        
        totalImagesFound += images.length;
        
        if (images.length === 0) {
            console.log(`  No images found`);
            console.log('');
            continue;
        }
        
        console.log(`  Found ${images.length} image(s)`);
        
        const sortedImages = images.sort((a, b) => 
            b.timeCreated.getTime() - a.timeCreated.getTime()
        );
        
        const latestImage = sortedImages[0];
        const imagesToDelete = sortedImages.slice(1);
        
        console.log(`  Latest image: ${latestImage.id} (${latestImage.timeCreated.toISOString()})`);
        
        if (imagesToDelete.length > 0) {
            console.log(`  Images to delete: ${imagesToDelete.length}`);
            totalImagesToDelete += imagesToDelete.length;
            
            for (const image of imagesToDelete) {
                console.log(`    - ${image.id} (${image.timeCreated.toISOString()})`);
                
                if (!dryRun) {
                    try {
                        await deleteImage({ computeClient, imageId: image.id });
                        console.log(`      ✓ Deleted`);
                        totalImagesDeleted++;
                    } catch (error) {
                        console.error(`      ✗ Failed to delete: ${error}`);
                    }
                } else {
                    console.log(`      [DRY RUN] Would delete`);
                }
            }
        }
        
        console.log('');
    }
    
    console.log('Summary:');
    console.log(`  Total images found: ${totalImagesFound}`);
    console.log(`  Images to delete: ${totalImagesToDelete}`);
    
    if (!dryRun) {
        console.log(`  Images deleted: ${totalImagesDeleted}`);
        console.log(`  Failed deletions: ${totalImagesToDelete - totalImagesDeleted}`);
    } else {
        console.log(`  (Dry run - no images were deleted)`);
    }
};

const main = async (): Promise<void> => {
    const dryRun = process.argv.includes('--dry-run') || process.argv.includes('-d');
    
    if (!process.env.OCI_CONFIG_FILE) {
        console.error('Error: OCI_CONFIG_FILE environment variable is required');
        process.exit(1);
    }
    
    try {
        await cleanupOldImages({ dryRun });
    } catch (error) {
        console.error('Error during cleanup:', error);
        process.exit(1);
    }
};

main();
