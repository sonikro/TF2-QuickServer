import { ServerActivity } from "../domain/ServerActivity";

export interface ServerActivityRepository {
    upsert(serverActivity: ServerActivity): Promise<void>;
    deleteById(serverId: string): Promise<void>;
    findById(serverId: string): Promise<ServerActivity | null>;
    getAll(): Promise<ServerActivity[]>;
}