import { describe, it, expect } from 'vitest';
import { interpolateString } from './interpolateString';

describe('interpolateString', () => {
    it('should replace single variable with provided value', () => {
        const result = interpolateString('Hello {name}', { name: 'World' });
        expect(result).toBe('Hello World');
    });

    it('should replace multiple variables with provided values', () => {
        const result = interpolateString(
            'Server {serverId} at {rconAddress}:{hostPort}',
            { serverId: 'srv-123', rconAddress: '192.168.1.1', hostPort: 27015 }
        );
        expect(result).toBe('Server srv-123 at 192.168.1.1:27015');
    });

    it('should handle repeated variables', () => {
        const result = interpolateString(
            '{value} and {value}',
            { value: 'test' }
        );
        expect(result).toBe('test and test');
    });

    it('should leave unmapped variables unchanged', () => {
        const result = interpolateString(
            'Value: {exists}, Missing: {notExists}',
            { exists: 'found' }
        );
        expect(result).toBe('Value: found, Missing: {notExists}');
    });

    it('should handle empty template', () => {
        const result = interpolateString('', { key: 'value' });
        expect(result).toBe('');
    });

    it('should handle template with no variables', () => {
        const result = interpolateString('No variables here', { key: 'value' });
        expect(result).toBe('No variables here');
    });

    it('should handle empty data object', () => {
        const result = interpolateString('Hello {name}', {});
        expect(result).toBe('Hello {name}');
    });

    it('should convert non-string values to strings', () => {
        const result = interpolateString(
            'Player count: {count}, Status: {ready}',
            { count: 24, ready: true }
        );
        expect(result).toBe('Player count: 24, Status: true');
    });

    it('should handle multiline templates with variables', () => {
        const result = interpolateString(
            'Server: {serverId}\nAddress: {rconAddress}:{hostPort}\nPassword: {rconPassword}',
            {
                serverId: 'srv-001',
                rconAddress: '10.0.0.1',
                hostPort: 27015,
                rconPassword: 'secret123'
            }
        );
        expect(result).toBe(
            'Server: srv-001\nAddress: 10.0.0.1:27015\nPassword: secret123'
        );
    });

    it('should handle nested braces correctly', () => {
        const result = interpolateString(
            'Data: {key}',
            { key: '{nested}' }
        );
        expect(result).toBe('Data: {nested}');
    });

    it('should handle variables with underscores and numbers', () => {
        const result = interpolateString(
            'Values: {var_1}, {var2_name}',
            { var_1: 'first', var2_name: 'second' }
        );
        expect(result).toBe('Values: first, second');
    });
});
