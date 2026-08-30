export function maskIp(ipAddress: string): string {
    const ipv4Match = ipAddress.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
    if (ipv4Match && ipv4Match.slice(1, 5).every(octet => Number(octet) <= 255)) {
        const [, , , o3, o4] = ipv4Match;
        return `x.x.${o3}.${o4}`;
    }

    return 'x.x.x.x';
}
