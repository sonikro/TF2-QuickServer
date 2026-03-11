import { CreateServerForClient, CreateServerForClientParams } from '@tf2qs/core';
import { GenericTaskProcessor } from './GenericTaskProcessor';

export type CreateServerForClientTaskData = CreateServerForClientParams;

export function createCreateServerForClientTaskProcessor(
    createServerForClient: CreateServerForClient
): GenericTaskProcessor<CreateServerForClientTaskData> {
    return new GenericTaskProcessor({
        useCase: createServerForClient,
        taskName: 'create-server-for-client',
    });
}
