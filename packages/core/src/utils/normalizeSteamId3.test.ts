import { describe, expect, it } from 'vitest';
import { UserError } from '../errors/UserError';
import { normalizeSteamId3 } from './normalizeSteamId3';

describe('normalizeSteamId3', () => {
    it.each([
        { input: '[U:1:29162964]', expected: 'U:1:29162964' },
        { input: 'U:1:29162964', expected: 'U:1:29162964' },
        { input: 'STEAM_0:1:12345', expected: 'U:1:24691' },
    ])('should normalize $input to $expected', ({ input, expected }) => {
        expect(normalizeSteamId3(input)).toBe(expected);
    });

    it('should trim surrounding whitespace before normalizing', () => {
        expect(normalizeSteamId3('  U:1:29162964  ')).toBe('U:1:29162964');
    });

    it.each([
        { input: 'garbage' },
        { input: '29162964' },
        { input: '[g:1:123]' },
    ])('should throw UserError for invalid input $input', ({ input }) => {
        expect(() => normalizeSteamId3(input)).toThrow(UserError);
    });
});
