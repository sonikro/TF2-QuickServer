export function maskIp(ipAddress: string): string {
    const ipv4Match = ipAddress.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
    if (ipv4Match && ipv4Match.slice(1, 5).every(octet => Number(octet) <= 255)) {
        const [, o1, o2, o3] = ipv4Match;
        return `${o1}.${o2}.${o3}.x`;
    }

    if (isValidIpv6(ipAddress)) {
        if (ipAddress.includes('::')) {
            const head = ipAddress.split('::')[0];
            if (head === '') {
                return '::x';
            }
            return `${head.split(':').slice(0, 3).join(':')}::x`;
        }
        return `${ipAddress.split(':').slice(0, 3).join(':')}:x`;
    }

    return 'x.x.x.x';
}

function isValidIpv6(ipAddress: string): boolean {
    const doubleColonCount = ipAddress.split('::').length - 1;
    if (doubleColonCount > 1) {
        return false;
    }

    const [left, right] = ipAddress.split('::');
    const leftGroups = left === '' ? [] : left.split(':');
    const rightGroups = right === undefined || right === '' ? [] : right.split(':');
    const groups = [...leftGroups, ...rightGroups];

    if (groups.length === 0) {
        return false;
    }

    let groupCount = 0;
    for (let index = 0; index < groups.length; index++) {
        const group = groups[index];
        if (index === groups.length - 1 && (rightGroups.length > 0 || doubleColonCount === 0) && isValidIpv4Tail(group)) {
            groupCount += 2;
        } else if (/^[0-9a-fA-F]{1,4}$/.test(group)) {
            groupCount += 1;
        } else {
            return false;
        }
    }

    return doubleColonCount === 1 ? groupCount <= 7 : groupCount === 8;
}

function isValidIpv4Tail(value: string): boolean {
    const octets = value.split('.');
    return octets.length === 4 && octets.every(octet => /^\d{1,3}$/.test(octet) && Number(octet) <= 255);
}
