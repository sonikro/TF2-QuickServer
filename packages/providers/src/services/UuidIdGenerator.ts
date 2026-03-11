import { IdGenerator } from '@tf2qs/core';
import { randomUUID } from 'crypto';

export class UuidIdGenerator implements IdGenerator {
    generate(): string {
        return randomUUID();
    }
}
