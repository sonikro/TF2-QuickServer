'use client';

import {
    Dns,
} from '@mui/icons-material';
import {
    Alert,
    Box,
    Card,
    CardContent,
    Grid,
    LinearProgress,
    Typography
} from '@mui/material';
import React from 'react';

import { RegionCard } from '../../components/RegionCard';
import { StatsCard } from '../../components/StatsCard';
import { useServerStats } from '../../hooks/useServerStats';

export default function StatusPage() {
  const { data: serverStats, loading: serverLoading, error: serverError } = useServerStats();

  if (serverError) {
    return (
      <Box p={3}>
        <Alert severity="error">
          {serverError}
        </Alert>
      </Box>
    );
  }

  return (
    <Box p={3}>
      {/* Page Header */}
      <Box mb={4}>
        <Typography variant="h3" component="h1" fontWeight={700} gutterBottom>
          Server Status Dashboard
        </Typography>
        <Typography variant="h6" color="text.secondary">
          Real-time server status across all regions
        </Typography>
      </Box>

      {/* Total Servers Summary */}
      <Grid container spacing={3} mb={4}>
        <Grid size={{ xs: 12, md: 4 }}>
          <StatsCard
            title="Total Servers"
            value={serverStats?.totalServers || 0}
            subtitle="All regions"
            icon={Dns}
            color="primary"
            loading={serverLoading}
          />
        </Grid>
      </Grid>

      {/* Server Regions */}
      <Grid container spacing={3} mb={4}>
        {serverLoading ? (
          <Grid size={{ xs: 12 }}>
            <Card>
              <CardContent>
                <Box display="flex" justifyContent="center" p={4}>
                  <LinearProgress sx={{ width: '100%', maxWidth: 300 }} />
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ) : (
          serverStats?.regions.map((region) => (
            <Grid key={region.region} size={{ xs: 12, sm: 6, md: 4 }}>
              <RegionCard region={region} />
            </Grid>
          ))
        )}
      </Grid>
    </Box>
  );
}
