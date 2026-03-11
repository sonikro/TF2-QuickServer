import { CreateServerForClient, CreateServerForClientParams } from '@tf2qs/core';
import { GenericTaskProcessor } from './GenericTaskProcessor';

export type CreateServerForClientTaskData = CreateServerForClientParams;

export function createServerForClientTaskProcessor(
    createServerForClient: CreateServerForClient
): GenericTaskProcessor<CreateServerForClientTaskData> {
    return new GenericTaskProcessor({
        useCase: createServerForClient,
        taskName: 'create-server-for-client',
    });
}
