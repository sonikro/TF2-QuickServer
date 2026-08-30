export function isLinkLocalIp(ip: string): boolean {
    return ip.startsWith('169.');
}
