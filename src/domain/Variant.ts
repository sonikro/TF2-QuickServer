export enum Variant {
    StandardCompetitive = "standard-competitive",
}

export function isValidVariant(variant: string): variant is Variant {
    return Object.values(Variant).includes(variant as Variant);
}
