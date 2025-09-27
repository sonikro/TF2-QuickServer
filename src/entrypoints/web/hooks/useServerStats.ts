import { useState, useEffect } from 'react';
import { getServerStatsAction, ServerStatsData, RegionServerStats } from '../app/actions/serverActions';

// Re-export types for convenience
export type { RegionServerStats, ServerStatsData };

// Custom hook to fetch server statistics using Server Actions
export const useServerStats = () => {
  const [data, setData] = useState<ServerStatsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  useEffect(() => {
    const fetchServerStats = async () => {
      try {
        setLoading(true);
        setError(null);
        const serverStats = await getServerStatsAction();
        setData(serverStats);
        setLastUpdated(new Date());
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to fetch server stats';
        setError(errorMessage);
        console.error('Error fetching server stats:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchServerStats();

    // Set up polling to refresh data every 30 seconds
    const intervalId = setInterval(fetchServerStats, 30000);

    return () => clearInterval(intervalId);
  }, []);

  return { 
    data, 
    loading, 
    error, 
    lastUpdated,
    // Helper to manually refresh data
    refresh: () => {
      setLoading(true);
      setError(null);
    }
  };
};
