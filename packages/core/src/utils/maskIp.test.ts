import { describe, expect, it } from 'vitest';
import { maskIp } from './maskIp';

const FULL_IPV4_PATTERN = /\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}/;

describe('maskIp', () => {
    it.each([
        { input: '192.168.1.5', expected: 'x.x.1.5' },
        { input: '10.0.0.1', expected: 'x.x.0.1' },
        { input: '8.8.8.8', expected: 'x.x.8.8' },
        { input: '0.0.0.0', expected: 'x.x.0.0' },
        { input: '255.255.255.255', expected: 'x.x.255.255' },
        { input: 'not-an-ip', expected: 'x.x.x.x' },
        { input: '', expected: 'x.x.x.x' },
        { input: '1.2.3.4.5', expected: 'x.x.x.x' },
        { input: '1.2.3', expected: 'x.x.x.x' },
        { input: '256.1.1.1', expected: 'x.x.x.x' },
        { input: '1.256.1.1', expected: 'x.x.x.x' },
        { input: '999.1.1.1', expected: 'x.x.x.x' },
        { input: '1.2.3.4:5', expected: 'x.x.x.x' },
        { input: '192.168.1.5::', expected: 'x.x.x.x' },
        { input: '2001:db8::1', expected: 'x.x.x.x' },
        { input: '::1', expected: 'x.x.x.x' },
        { input: '::ffff:192.168.1.5', expected: 'x.x.x.x' },
    ])('should mask $input as $expected', ({ input, expected }) => {
        expect(maskIp(input)).toBe(expected);
    });

    it.each([
        '192.168.1.5::',
        '10.0.0.1::',
        '255.255.255.255::',
        '1:192.168.1.5::',
        '1:2:192.168.1.5::',
        '169.254.1.1::',
        '::',
        '::1',
        '1::',
        '::192.168.1.5',
        '1:2:3:4:5:6:192.168.1.5',
        '1:2:3:4:5:6:7:192.168.1.5',
        '192.168.1.5:192.168.1.5::',
        'ffff:ffff:ffff:ffff:ffff:ffff:192.168.1.5',
        '0:0:0:0:0:0:192.168.1.5',
        '256.256.256.256',
        '999.1.1.1',
        '2001:db8::1',
    ])('should never render a full dotted-quad IPv4 for adversarial input $input', (input) => {
        expect(maskIp(input)).not.toMatch(FULL_IPV4_PATTERN);
    });
});
