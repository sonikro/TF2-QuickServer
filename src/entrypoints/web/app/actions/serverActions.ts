'use server';

import { GetServerStatsUseCase, RegionServerStats, ServerStatsData } from '../../../../core/usecase/GetServerStats';
import { SQLiteServerRepository } from '../../../../providers/repository/SQliteServerRepository';
import { KnexConnectionManager } from '../../../../providers/repository/KnexConnectionManager';

// Re-export types for convenience
export type { RegionServerStats, ServerStatsData };

// Server Action - runs on the server, never exposed to client
// Uses clean architecture: entrypoint -> use case -> repository
export async function getServerStatsAction(): Promise<ServerStatsData> {
  // Dependency injection - instantiate repository and use case
  const serverRepository = new SQLiteServerRepository({
    knex: KnexConnectionManager.client,
  });

  const getServerStatsUseCase = new GetServerStatsUseCase({
    serverRepository,
  });

  // Execute the use case
  return await getServerStatsUseCase.execute();
}