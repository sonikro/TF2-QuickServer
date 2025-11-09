import * as oci from 'oci-sdk';
import { getRegionConfig, Region } from '../../core/domain/Region';

/**
 * Factory function to create OCI Clients for a given region.
 * Creates containerClient and vncClient for the specified region.
 * Creates usageClient in the home region since the Usage API is tenancy-wide and must be called from home region.
 * 
 * @param region - The OCI region to connect to.
 * @returns An object containing containerClient, vncClient for the region, and usageClient in home region.
 */
export function defaultOracleServiceFactory(region: Region) {
    const regionConfig = getRegionConfig(region);
    const homeRegion = regionConfig.homeRegion || region;
    
    const provider = new oci.common.ConfigFileAuthenticationDetailsProvider(process.env.OCI_CONFIG_FILE!, region)
    provider.setRegion(region);
    
    const containerClient = new oci.containerinstances.ContainerInstanceClient({ authenticationDetailsProvider: provider });
    const vncClient = new oci.core.VirtualNetworkClient({ authenticationDetailsProvider: provider });
    
    const homeProvider = new oci.common.ConfigFileAuthenticationDetailsProvider(process.env.OCI_CONFIG_FILE!, homeRegion)
    homeProvider.setRegion(homeRegion);
    const usageClient = new oci.usageapi.UsageapiClient({ authenticationDetailsProvider: homeProvider });
    
    return {
        containerClient,
        vncClient,
        usageClient
    }
}