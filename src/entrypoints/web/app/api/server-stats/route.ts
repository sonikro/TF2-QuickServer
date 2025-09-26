import { NextResponse } from 'next/server';
import { getRegions, getRegionDisplayName, Region } from '../../../../../core/domain/Region';

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

// Generate mock data using real regions
const generateMockServerStats = (): ServerStatsData => {
  const regions = getRegions();
  const regionStats: RegionServerStats[] = regions.map(region => ({
    region,
    displayName: getRegionDisplayName(region),
    readyServers: Math.floor(Math.random() * 10) + 1, // 1-10 ready servers
    pendingServers: Math.floor(Math.random() * 3), // 0-2 pending servers
  }));

  const totalServers = regionStats.reduce(
    (sum, region) => sum + region.readyServers + region.pendingServers,
    0
  );

  return {
    regions: regionStats,
    totalServers,
  };
};

export async function GET() {
  try {
    // This runs on the server side, so config library will work
    const serverStats = generateMockServerStats();
    return NextResponse.json(serverStats);
  } catch (error) {
    console.error('Failed to fetch server stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch server stats' },
      { status: 500 }
    );
  }
}
