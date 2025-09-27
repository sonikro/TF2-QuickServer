import { Region, getRegions, getRegionDisplayName } from "../domain/Region";
import { Server } from "../domain/DeployedServer";
import { ServerRepository } from "../repository/ServerRepository";
import { logger } from "../../telemetry/otel";
import { OperationTracingService } from "../../telemetry/OperationTracingService";

export interface RegionServerStats {
  region: Region;
  displayName: string;
  readyServers: number;
  pendingServers: number;
}

export interface ServerStatsData {
  regions: RegionServerStats[];
  totalServers: number;
}

export interface GetServerStatsUseCaseDependencies {
  serverRepository: ServerRepository;
}

// Use case for getting server statistics across all regions
export class GetServerStatsUseCase {
  private tracingService = new OperationTracingService();

  constructor(private dependencies: GetServerStatsUseCaseDependencies) {}

  async execute(): Promise<ServerStatsData> {
    return await this.tracingService.executeWithTracing(
      "get-server-stats-usecase",
      "server-stats",
      async (span) => {
        try {
          logger.emit({
            severityText: "INFO",
            body: "Executing GetServerStatsUseCase",
            attributes: {
              operation: "get-server-stats-usecase",
              source: "core-layer"
            }
          });

          const { serverRepository } = this.dependencies;

          // Fetch all servers from the database
          const allServers = await serverRepository.getAllServers();
          span.setAttribute("total_servers_fetched", allServers.length);
          
          // Get all regions
          const regions = getRegions();
          span.setAttribute("regions_count", regions.length);
          
          // Group servers by region and calculate stats
          const regionStats: RegionServerStats[] = regions.map(region => {
            const regionServers = allServers.filter((server: Server) => server.region === region);
            const readyServers = regionServers.filter((server: Server) => server.status === 'ready').length;
            const pendingServers = regionServers.filter((server: Server) => server.status === 'pending').length;
            
            return {
              region,
              displayName: getRegionDisplayName(region),
              readyServers,
              pendingServers,
            };
          });

          const totalServers = allServers.length;

          logger.emit({
            severityText: "INFO",
            body: "GetServerStatsUseCase executed successfully",
            attributes: {
              operation: "get-server-stats-usecase",
              source: "core-layer",
              totalServers,
              regionsCount: regions.length
            }
          });

          return {
            regions: regionStats,
            totalServers,
          };
        } catch (error) {
          logger.emit({
            severityText: "ERROR",
            body: "Failed to execute GetServerStatsUseCase",
            attributes: {
              operation: "get-server-stats-usecase",
              source: "core-layer",
              error: error instanceof Error ? error.message : String(error)
            }
          });
          throw new Error('Failed to get server statistics');
        }
      }
    );
  }
}