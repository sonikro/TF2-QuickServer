import { useState, useEffect } from 'react';
import { Region } from '../../../core/domain/Region';

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

// Custom hook to fetch server statistics
export const useServerStats = () => {
  const [data, setData] = useState<ServerStatsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchServerStats = async () => {
      try {
        setLoading(true);
        setError(null);

        // Fetch from API route
        const response = await fetch('/api/server-stats');
        if (!response.ok) {
          throw new Error(`Failed to fetch server stats: ${response.status}`);
        }
        
        const serverStats = await response.json();
        setData(serverStats);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch server stats');
      } finally {
        setLoading(false);
      }
    };

    fetchServerStats();

    // Set up polling to refresh data every 30 seconds
    const intervalId = setInterval(fetchServerStats, 30000);

    return () => clearInterval(intervalId);
  }, []);

  return { data, loading, error };
};
