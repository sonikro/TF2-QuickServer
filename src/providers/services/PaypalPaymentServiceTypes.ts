export interface PaypalCreateOrderResponse {
    id:     string;
    status: string;
    links:  Link[];
}

export interface Link {
    href:   string;
    rel:    string;
    method: string;
}
