import { Server } from "../domain";

export interface ServerRepository {
    upsertServer(server: Server): Promise<void>;
    deleteServer(serverId: string): Promise<void>;
    findById(serverId: string): Promise<Server | null>;
    getAllServers(): Promise<Server[]>;
}