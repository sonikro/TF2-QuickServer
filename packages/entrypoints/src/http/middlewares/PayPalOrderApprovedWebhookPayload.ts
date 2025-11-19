export interface PayPalOrderApprovedWebhookPayload {
    id:               string;
    event_version:    string;
    create_time:      Date;
    resource_type:    string;
    resource_version: string;
    event_type:       string;
    summary:          string;
    resource:         Resource;
    links:            Link[];
}

export interface Link {
    href:   string;
    rel:    string;
    method: string;
}

export interface Resource {
    create_time:    Date;
    purchase_units: PurchaseUnit[];
    links:          Link[];
    id:             string;
    payment_source: PaymentSource;
    intent:         string;
    payer:          Payer;
    status:         string;
}

export interface Payer {
    name:          PayerName;
    email_address: string;
    payer_id:      string;
    address:       PayerAddress;
}

export interface PayerAddress {
    country_code: string;
}

export interface PayerName {
    given_name: string;
    surname:    string;
}

export interface PaymentSource {
    paypal: Paypal;
}

export interface Paypal {
    email_address:  string;
    account_id:     string;
    account_status: string;
    name:           PayerName;
    tax_info:       TaxInfo;
    address:        PayerAddress;
}

export interface TaxInfo {
    tax_id:      string;
    tax_id_type: string;
}

export interface PurchaseUnit {
    reference_id: string;
    amount:       Amount;
    payee:        Payee;
    shipping:     Shipping;
}

export interface Amount {
    currency_code: string;
    value:         string;
}

export interface Payee {
    email_address: string;
    merchant_id:   string;
    display_data:  DisplayData;
}

export interface DisplayData {
    brand_name: string;
}

export interface Shipping {
    name:    ShippingName;
    address: ShippingAddress;
}

export interface ShippingAddress {
    address_line_1: string;
    admin_area_2:   string;
    admin_area_1:   string;
    postal_code:    string;
    country_code:   string;
}

export interface ShippingName {
    full_name: string;
}
