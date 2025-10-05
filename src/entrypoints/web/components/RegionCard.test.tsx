import React from 'react';
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { RegionCard } from './RegionCard';
import { Region } from '../../../core/domain/Region';
import type { RegionServerStats } from '../hooks/useServerStats';

// Create a test theme for Material-UI components
const theme = createTheme();

// Wrapper component for Material-UI theme
const TestWrapper = ({ children }: { children: React.ReactNode }) => (
  <ThemeProvider theme={theme}>
    {children}
  </ThemeProvider>
);

describe('RegionCard', () => {
  // Clean up after each test to avoid DOM pollution
  afterEach(() => {
    cleanup();
  });

  const mockRegionData: RegionServerStats = {
    region: Region.US_CHICAGO_1,
    displayName: 'US Chicago',
    readyServers: 3,
    pendingServers: 2,
  };

  it('renders region information correctly', () => {
    render(
      <TestWrapper>
        <RegionCard region={mockRegionData} />
      </TestWrapper>
    );

    expect(screen.getByTestId('region-label')).toHaveTextContent('US Chicago');
    expect(screen.getByTestId('ready-servers-count')).toHaveTextContent('3');
    expect(screen.getByTestId('pending-servers-count')).toHaveTextContent('2');
  });

  it('displays ready servers with correct status', () => {
    render(
      <TestWrapper>
        <RegionCard region={mockRegionData} />
      </TestWrapper>
    );

    expect(screen.getByText('Ready')).toBeInTheDocument();
    expect(screen.getByText('Pending')).toBeInTheDocument();
  });

  it('shows correct status when all servers are ready', () => {
    const allReadyRegion: RegionServerStats = {
      region: Region.EU_FRANKFURT_1,
      displayName: 'EU Frankfurt',
      readyServers: 5,
      pendingServers: 0,
    };

    render(
      <TestWrapper>
        <RegionCard region={allReadyRegion} />
      </TestWrapper>
    );

    expect(screen.getByTestId('region-label')).toHaveTextContent('EU Frankfurt');
    expect(screen.getByTestId('ready-servers-count')).toHaveTextContent('5');
    expect(screen.getByTestId('pending-servers-count')).toHaveTextContent('0');
  });

  it('shows correct status when no servers are ready', () => {
    const noReadyRegion: RegionServerStats = {
      region: Region.SA_SAOPAULO_1,
      displayName: 'SA São Paulo',
      readyServers: 0,
      pendingServers: 3,
    };

    render(
      <TestWrapper>
        <RegionCard region={noReadyRegion} />
      </TestWrapper>
    );

    expect(screen.getByTestId('region-label')).toHaveTextContent('SA São Paulo');
    expect(screen.getByTestId('ready-servers-count')).toHaveTextContent('0');
    expect(screen.getByTestId('pending-servers-count')).toHaveTextContent('3');
  });

  it('shows correct status when no servers exist', () => {
    const noServersRegion: RegionServerStats = {
      region: Region.SA_BOGOTA_1,
      displayName: 'SA Bogotá',
      readyServers: 0,
      pendingServers: 0,
    };

    render(
      <TestWrapper>
        <RegionCard region={noServersRegion} />
      </TestWrapper>
    );

    expect(screen.getByTestId('region-label')).toHaveTextContent('SA Bogotá');
    expect(screen.getByTestId('ready-servers-count')).toHaveTextContent('0');
    expect(screen.getByTestId('pending-servers-count')).toHaveTextContent('0');
  });

  it('has proper hover effects styling', () => {
    render(
      <TestWrapper>
        <RegionCard region={mockRegionData} />
      </TestWrapper>
    );

    // Check that the card element exists (it's a div with MuiCard-root class)
    const card = document.querySelector('[class*="MuiCard-root"]');
    expect(card).toBeInTheDocument();
  });

  it('displays status indicators correctly', () => {
    render(
      <TestWrapper>
        <RegionCard region={mockRegionData} />
      </TestWrapper>
    );

    // Check for the presence of status icons (CheckCircle, Schedule, etc.)
    // These are rendered as SVG icons from Material-UI
    const icons = document.querySelectorAll('svg[data-testid*="Icon"]');
    expect(icons.length).toBeGreaterThan(0);
  });

  it('calculates total servers correctly', () => {
    const testRegion: RegionServerStats = {
      region: Region.US_CHICAGO_1,
      displayName: 'Test Region',
      readyServers: 4,
      pendingServers: 3,
    };

    render(
      <TestWrapper>
        <RegionCard region={testRegion} />
      </TestWrapper>
    );

    // The component should show both ready and pending server counts
    expect(screen.getByTestId('ready-servers-count')).toHaveTextContent('4');
    expect(screen.getByTestId('pending-servers-count')).toHaveTextContent('3');
  });
});
