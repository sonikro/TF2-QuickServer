import { describe, expect, it } from 'vitest';
import { isLinkLocalIp } from './isLinkLocalIp';

describe('isLinkLocalIp', () => {
    it.each([
        { input: '169.254.249.16', expected: true },
        { input: '169.254.0.1', expected: true },
        { input: '169.1.2.3', expected: true },
    ])('should return true for link-local IP $input', ({ input, expected }) => {
        expect(isLinkLocalIp(input)).toBe(expected);
    });

    it.each([
        { input: '1.2.3.4', expected: false },
        { input: '8.8.8.8', expected: false },
        { input: '170.254.249.16', expected: false },
        { input: '168.254.249.16', expected: false },
    ])('should return false for non-link-local IP $input', ({ input, expected }) => {
        expect(isLinkLocalIp(input)).toBe(expected);
    });
});
