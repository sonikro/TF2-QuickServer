import * as oci from 'oci-sdk'; // Replace with the actual OCI SDK import

/**
 * Factory function to create an OCI Client for a given region.
 * @param region - The OCI region to connect to.
 * @returns An instance of the OCI Client configured for the specified region.
 */
export function defaultOracleServiceFactory(region: string) {

    const provider = new oci.common.ConfigFileAuthenticationDetailsProvider(process.env.OCI_CONFIG_FILE!)
    provider.setRegion(region);
    const containerClient = new oci.containerinstances.ContainerInstanceClient({ authenticationDetailsProvider: provider });
    const vncClient = new oci.core.VirtualNetworkClient({ authenticationDetailsProvider: provider });
    return {
        containerClient,
        vncClient
    }
}