import { ServerActivityRepository } from "../repository/ServerActivityRepository";
import { ServerRepository } from "../repository/ServerRepository";
import { ServerManager } from "../services/ServerManager";
import { ServerCommander } from "../services/ServerCommander";
import { ServerStatus } from "../domain/ServerStatus";
import { EventLogger } from "../services/EventLogger";

export class TerminateEmptyServers {

    constructor(private readonly dependencies: {
        serverManager: ServerManager,
        serverRepository: ServerRepository
        serverActivityRepository: ServerActivityRepository,
        serverCommander: ServerCommander,
        eventLogger: EventLogger
    }) { }

    /**
     * Terminates servers that have been empty for a specified duration.
     * @param args - The arguments for the command.
     * @param args.minutesEmpty - The duration in minutes after which servers should be terminated.
     */
    public async execute(args: {
        minutesEmpty: number,
    }): Promise<void> {
        const { minutesEmpty } = args;
        const { serverManager, serverRepository, serverActivityRepository, serverCommander, eventLogger } = this.dependencies;

        // Fetch all servers
        const servers = await serverRepository.getAllServers();
        const serverActivities = await serverActivityRepository.getAll();

        const mergedServers = servers.map((server) => {
            const serverActivity = serverActivities.find((activity) => activity.serverId === server.serverId);
            return {
                ...server,
                ...serverActivity,
            };
        })

        // Delete servers that have been empty for the specified duration
        for (const server of mergedServers) {
            if (server.emptySince) {
                const emptyDuration = new Date().getTime() - server.emptySince.getTime();
                if (emptyDuration >= minutesEmpty * 60 * 1000) {
                    console.log(`Terminating server ${server.serverId} due to inactivity for ${minutesEmpty} minutes.`);
                    // Terminate the server
                    try {
                        await serverManager.deleteServer({
                            region: server.region,
                            serverId: server.serverId,
                        });
                        // Delete the server from the repository
                        await serverRepository.deleteServer(server.serverId);

                        // Remove the server from the mergedServers array
                        const index = mergedServers.findIndex((s) => s.serverId === server.serverId);
                        if (index !== -1) {
                            mergedServers.splice(index, 1);
                        }

                        // Log the event
                        await eventLogger.log({
                            eventMessage: `Server ${server.serverId} terminated due to inactivity for ${minutesEmpty} minutes.`,
                            actorId: server.createdBy!,
                        });
                    } catch (error) {
                        console.error(`Failed to terminate server ${server.serverId}:`, error);
                    }
                }
            }
        }


        // For the remaining servers, fetch the current status of each server and update the server activity
        for (const server of mergedServers) {
            try {
                const statusOutput = await serverCommander.query({
                    command: "status",
                    host: server.rconAddress,
                    password: server.rconPassword,
                    port: 27015,
                    timeout: 5000,
                })
                const serverStatus = new ServerStatus(statusOutput);
                if (serverStatus.numberOfPlayers === 0 && server.emptySince === null) {
                    console.log(`Server ${server.serverId} is empty.`);
                    server.emptySince = new Date();
                }
                
                if ((serverStatus.numberOfPlayers ?? 0) > 0) {
                    console.log(`Server ${server.serverId} is not empty.`);
                    server.emptySince = null;
                }
            } catch (error) {
                // If error happens, assume server is empty to avoid servers running forever
                console.error(`Error fetching status for server ${server.serverId}:`, error);
                server.emptySince = new Date();
            }

            server.lastCheckedAt = new Date();

            // Update the server activity repository
            await serverActivityRepository.upsert({
                serverId: server.serverId,
                emptySince: server.emptySince!,
                lastCheckedAt: server.lastCheckedAt!,
            });

        }
    }
}