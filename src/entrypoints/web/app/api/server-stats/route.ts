import { NextResponse } from 'next/server';
import { getRegions, getRegionDisplayName, Region } from '../../../../../core/domain/Region';
import { SQLiteServerRepository } from '../../../../../providers/repository/SQliteServerRepository';
import { KnexConnectionManager } from '../../../../../providers/repository/KnexConnectionManager';

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

// Fetch real server stats from database
const getServerStats = async (): Promise<ServerStatsData> => {
  const serverRepository = new SQLiteServerRepository({
    knex: KnexConnectionManager.client,
  });

  // Fetch all servers from the database
  const allServers = await serverRepository.getAllServers();
  
  // Get all regions
  const regions = getRegions();
  
  // Group servers by region and calculate stats
  const regionStats: RegionServerStats[] = regions.map(region => {
    const regionServers = allServers.filter(server => server.region === region);
    const readyServers = regionServers.filter(server => server.status === 'ready').length;
    const pendingServers = regionServers.filter(server => server.status === 'pending').length;
    
    return {
      region,
      displayName: getRegionDisplayName(region),
      readyServers,
      pendingServers,
    };
  });

  const totalServers = allServers.length;

  return {
    regions: regionStats,
    totalServers,
  };
};

export async function GET() {
  try {

    const serverStats = await getServerStats();
    
    return NextResponse.json(serverStats);
  } catch (error) {
    console.error('Failed to fetch server stats from database:', error);

    return NextResponse.json(
      { error: 'Failed to fetch server stats' },
      { status: 500 }
    );
  }
}
