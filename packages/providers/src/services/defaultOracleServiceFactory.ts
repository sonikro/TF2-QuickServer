import * as oci from 'oci-sdk';
import { getRegionConfig, Region } from '@tf2qs/core';

/**
 * Factory function to create OCI Clients for a given region.
 * Creates containerClient, vncClient, and computeClient for the specified region.
 * Creates usageClient in the home region since the Usage API is tenancy-wide and must be called from home region.
 * 
 * @param region - The OCI region to connect to.
 * @returns An object containing containerClient, vncClient, computeClient for the region, and usageClient in home region.
 */
export function defaultOracleServiceFactory(region: Region) {
    const regionConfig = getRegionConfig(region);
    const homeRegion = regionConfig.homeRegion || region;
    
    const provider = new oci.common.ConfigFileAuthenticationDetailsProvider(process.env.OCI_CONFIG_FILE!, region)
    provider.setRegion(region);
    
    const containerClient = new oci.containerinstances.ContainerInstanceClient({ authenticationDetailsProvider: provider });
    const vncClient = new oci.core.VirtualNetworkClient({ authenticationDetailsProvider: provider });
    const computeClient = new oci.core.ComputeClient({ authenticationDetailsProvider: provider });
    
    const homeProvider = new oci.common.ConfigFileAuthenticationDetailsProvider(process.env.OCI_CONFIG_FILE!, homeRegion)
    homeProvider.setRegion(homeRegion);
    const usageClient = new oci.usageapi.UsageapiClient({ authenticationDetailsProvider: homeProvider });
    
    return {
        containerClient,
        vncClient,
        computeClient,
        usageClient
    }
}