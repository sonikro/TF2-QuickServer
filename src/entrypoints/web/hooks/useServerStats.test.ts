import React from 'react';
import { describe, it, expect, afterEach, vi, beforeEach } from 'vitest';
import { renderHook, cleanup, waitFor, act } from '@testing-library/react';
import { useServerStats } from './useServerStats';
import * as serverActions from '../app/actions/serverActions';
import { Region } from '../../../core/domain/Region';

// Mock the server actions module
vi.mock('../app/actions/serverActions', () => ({
  getServerStatsAction: vi.fn(),
}));

const mockServerStatsData = {
  totalServers: 5,
  regions: [
    {
      region: Region.US_CHICAGO_1,
      displayName: 'US Chicago',
      readyServers: 2,
      pendingServers: 1,
    },
    {
      region: Region.EU_FRANKFURT_1, 
      displayName: 'EU Frankfurt',
      readyServers: 1,
      pendingServers: 1,
    },
  ],
};

describe('useServerStats', () => {
  const getServerStatsActionMock = vi.mocked(serverActions.getServerStatsAction);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
    vi.clearAllTimers();
  });

  it('should fetch server stats on mount', async () => {
    getServerStatsActionMock.mockResolvedValue(mockServerStatsData);

    const { result } = renderHook(() => useServerStats());

    // Initially should be loading
    expect(result.current.loading).toBe(true);
    expect(result.current.data).toBe(null);
    expect(result.current.error).toBe(null);

    // Wait for the async operation to complete
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // Should have data after loading
    expect(result.current.data).toEqual(mockServerStatsData);
    expect(result.current.error).toBe(null);
    expect(result.current.lastUpdated).toBeInstanceOf(Date);
    expect(getServerStatsActionMock).toHaveBeenCalledTimes(1);
  });

  it('should handle fetch errors', async () => {
    const errorMessage = 'Failed to fetch server stats';
    getServerStatsActionMock.mockRejectedValue(new Error(errorMessage));

    const { result } = renderHook(() => useServerStats());

    // Initially should be loading
    expect(result.current.loading).toBe(true);

    // Wait for the async operation to complete
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // Should have error after loading
    expect(result.current.data).toBe(null);
    expect(result.current.error).toBe(errorMessage);
    expect(result.current.lastUpdated).toBe(null);
  });

  it('should handle non-Error objects in catch', async () => {
    getServerStatsActionMock.mockRejectedValue('String error');

    const { result } = renderHook(() => useServerStats());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toBe('Failed to fetch server stats');
  });

  it('should provide a refresh function that resets loading and error', async () => {
    getServerStatsActionMock.mockResolvedValue(mockServerStatsData);

    const { result } = renderHook(() => useServerStats());

    // Wait for initial load
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // Call refresh
    act(() => {
      result.current.refresh();
    });

    // Should reset loading state
    expect(result.current.loading).toBe(true);
    expect(result.current.error).toBe(null);
  });

  it('should export types correctly', () => {
    // This test just verifies that the types are exported and accessible
    const { result } = renderHook(() => useServerStats());
    
    // These should be properly typed - if data is null, totalServers is undefined
    expect(result.current.data).toBe(null);
    expect(result.current.loading).toBe(true);
    expect(result.current.error).toBe(null);
    expect(result.current.lastUpdated).toBe(null);
    expect(typeof result.current.refresh).toBe('function');
  });
});
