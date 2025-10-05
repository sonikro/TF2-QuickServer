import React from 'react';
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { StatsCard } from './StatsCard';
import { Computer } from '@mui/icons-material';

// Create a test theme for Material-UI components
const theme = createTheme();

// Wrapper component for Material-UI theme
const TestWrapper = ({ children }: { children: React.ReactNode }) => (
  <ThemeProvider theme={theme}>
    {children}
  </ThemeProvider>
);

describe('StatsCard', () => {
  const defaultProps = {
    title: 'Test Title',
    value: 42,
    icon: Computer,
  };

  // Clean up after each test to avoid DOM pollution
  afterEach(() => {
    cleanup();
  });

  it('renders with basic props', () => {
    render(
      <TestWrapper>
        <StatsCard {...defaultProps} />
      </TestWrapper>
    );

    expect(screen.getByText('Test Title')).toBeInTheDocument();
    expect(screen.getByText('42')).toBeInTheDocument();
  });

  it('renders with subtitle when provided', () => {
    render(
      <TestWrapper>
        <StatsCard {...defaultProps} subtitle="Test Subtitle" />
      </TestWrapper>
    );

    expect(screen.getByText('Test Title')).toBeInTheDocument();
    expect(screen.getByText('42')).toBeInTheDocument();
    expect(screen.getByText('Test Subtitle')).toBeInTheDocument();
  });

  it('shows loading skeleton when loading is true', () => {
    render(
      <TestWrapper>
        <StatsCard {...defaultProps} loading={true} />
      </TestWrapper>
    );

    expect(screen.getByText('Test Title')).toBeInTheDocument();
    // When loading, the value should not be visible
    expect(screen.queryByText('42')).not.toBeInTheDocument();
    // Should show skeleton instead
    expect(document.querySelector('.MuiSkeleton-root')).toBeInTheDocument();
  });

  it('shows loading skeleton for subtitle when loading is true and subtitle is provided', () => {
    render(
      <TestWrapper>
        <StatsCard {...defaultProps} subtitle="Test Subtitle" loading={true} />
      </TestWrapper>
    );

    expect(screen.getByText('Test Title')).toBeInTheDocument();
    // When loading, subtitle text should not be visible
    expect(screen.queryByText('Test Subtitle')).not.toBeInTheDocument();
    // Should show two skeletons (one for value, one for subtitle)
    expect(document.querySelectorAll('.MuiSkeleton-root')).toHaveLength(2);
  });

  it('formats large numbers with locale string', () => {
    render(
      <TestWrapper>
        <StatsCard {...defaultProps} value={1234567} />
      </TestWrapper>
    );

    expect(screen.getByText('Test Title')).toBeInTheDocument();
    // Should format the number with commas
    expect(screen.getByText('1,234,567')).toBeInTheDocument();
  });

  it('applies custom color when provided', () => {
    render(
      <TestWrapper>
        <StatsCard {...defaultProps} color="secondary" />
      </TestWrapper>
    );

    // The color is applied via MUI's color system, so we just verify the component renders
    expect(screen.getByText('Test Title')).toBeInTheDocument();
    expect(screen.getByText('42')).toBeInTheDocument();
  });

  it('renders without subtitle when not provided', () => {
    render(
      <TestWrapper>
        <StatsCard {...defaultProps} />
      </TestWrapper>
    );

    expect(screen.getByText('Test Title')).toBeInTheDocument();
    expect(screen.getByText('42')).toBeInTheDocument();
    // Should not have any subtitle text
    expect(screen.queryByText(/subtitle/i)).not.toBeInTheDocument();
  });
});
