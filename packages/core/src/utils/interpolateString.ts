export function interpolateString(template: string, data: Record<string, unknown> | Record<string, any>): string {
    return template.replace(/\{([^}]+)\}/g, (match, key) => {
        const value = data[key];
        return value !== undefined ? String(value) : match;
    });
}
