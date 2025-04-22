import config from "config";

export interface OracleConfig {
    compartment_id: string;
    regions: { [key: string]: OracleRegionSettings };
}
export interface OracleRegionSettings {
    availability_domain: string;
    nsg_id: string;
    subnet_id: string;
}

export function getOracleConfig(): OracleConfig {
    return {
        compartment_id: config.get<string>(`compartment_id.value`),
        regions: {
            "sa-saopaulo-1": {
                availability_domain: config.get<string>(`sao_paulo_availability_domain.value`),
                nsg_id: config.get<string>(`sao_paulo_nsg_id.value`),
                subnet_id: config.get<string>(`sao_paulo_subnet_id.value`),
            },
            "us-chicago-1": {
                availability_domain: config.get<string>(`chicago_availability_domain.value`),
                nsg_id: config.get<string>(`chicago_nsg_id.value`),
                subnet_id: config.get<string>(`chicago_subnet_id.value`),
            },
            "sa-bogota-1": {
                availability_domain: config.get<string>(`bogota_availability_domain.value`),
                nsg_id: config.get<string>(`bogota_nsg_id.value`),
                subnet_id: config.get<string>(`bogota_subnet_id.value`),
            }
        },
    }
}