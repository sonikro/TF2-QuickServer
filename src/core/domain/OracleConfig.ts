import config from "config";

export interface OracleConfig {
    regions: { [key: string]: OracleRegionSettings };
}
export interface OracleRegionSettings {
    availability_domain: string;
    nsg_id: string;
    subnet_id: string;
    compartment_id: string;
    vnc_id: string;
}

export function getOracleConfig(): OracleConfig {
    return {
        regions: {
            "sa-saopaulo-1": {
                availability_domain: config.get<string>(`sao_paulo_availability_domain.value`),
                nsg_id: config.get<string>(`sao_paulo_nsg_id.value`),
                subnet_id: config.get<string>(`sao_paulo_subnet_id.value`),
                compartment_id: config.get<string>(`compartment_id.value`),
                vnc_id: config.get<string>(`sao_paulo_vnc_id.value`),
            },
            "us-chicago-1": {
                availability_domain: config.get<string>(`chicago_availability_domain.value`),
                nsg_id: config.get<string>(`chicago_nsg_id.value`),
                subnet_id: config.get<string>(`chicago_subnet_id.value`),
                compartment_id: config.get<string>(`compartment_id.value`),
                vnc_id: config.get<string>(`chicago_vnc_id.value`),
            },
            "sa-bogota-1": {
                availability_domain: config.get<string>(`bogota_availability_domain.value`),
                nsg_id: config.get<string>(`bogota_nsg_id.value`),
                subnet_id: config.get<string>(`bogota_subnet_id.value`),
                compartment_id: config.get<string>(`compartment_id.value`),
                vnc_id: config.get<string>(`bogota_vnc_id.value`),
            },
            "sa-santiago-1": {
                availability_domain: config.get<string>(`santiago_availability_domain.value`),
                nsg_id: config.get<string>(`santiago_nsg_id.value`),
                subnet_id: config.get<string>(`santiago_subnet_id.value`),
                compartment_id: config.get<string>(`santiago_compartment_id.value`),
                vnc_id: config.get<string>(`santiago_vnc_id.value`),
            },
            "eu-frankfurt-1": {
                availability_domain: config.get<string>(`frankfurt_availability_domain.value`),
                nsg_id: config.get<string>(`frankfurt_nsg_id.value`),
                subnet_id: config.get<string>(`frankfurt_subnet_id.value`),
                compartment_id: config.get<string>(`santiago_compartment_id.value`),
                vnc_id: config.get<string>(`frankfurt_vnc_id.value`),
            }
        },
    }
}