import React from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  Chip,
  LinearProgress,
  useTheme
} from '@mui/material';
import {
  CheckCircle,
  Schedule,
  Dns
} from '@mui/icons-material';
import { RegionServerStats } from '../hooks/useServerStats';

interface RegionCardProps {
  region: RegionServerStats;
}

export const RegionCard: React.FC<RegionCardProps> = ({ region }) => {
  const theme = useTheme();
  
  const totalServers = region.readyServers + region.pendingServers;
  
  const getStatusColor = () => {
    if (totalServers === 0) return 'default';
    if (region.readyServers === totalServers) return 'success';
    if (region.readyServers > 0) return 'warning';
    return 'error';
  };

  return (
    <Card 
      sx={{ 
        height: '100%',
        transition: 'transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out',
        '&:hover': {
          transform: 'translateY(-4px)',
          boxShadow: theme.shadows[8],
        }
      }}
    >
      <CardContent>
        {/* Region Header */}
        <Box display="flex" alignItems="center" justifyContent="space-between" mb={3}>
          <Typography variant="h6" component="h3" fontWeight={600}>
            {region.displayName}
          </Typography>
          <Chip
            icon={<Dns />}
            label={totalServers === 0 ? 'No Servers' : `${totalServers} Total`}
            color={getStatusColor()}
            size="small"
          />
        </Box>

        {/* Ready Servers */}
        <Box mb={3}>
          <Box display="flex" alignItems="center" gap={1} mb={1}>
            <CheckCircle color="success" />
            <Typography variant="body2" color="text.secondary">
              Ready
            </Typography>
          </Box>
          <Typography variant="h3" fontWeight={700} color="success.main">
            {region.readyServers}
          </Typography>
        </Box>

        {/* Pending Servers */}
        <Box mb={3}>
          <Box display="flex" alignItems="center" gap={1} mb={1}>
            <Schedule color="warning" />
            <Typography variant="body2" color="text.secondary">
              Pending
            </Typography>
          </Box>
          <Typography variant="h3" fontWeight={700} color="warning.main">
            {region.pendingServers}
          </Typography>
        </Box>

        {/* Progress Bar */}
        {totalServers > 0 && (
          <Box>
            <Box display="flex" justifyContent="space-between" mb={1}>
              <Typography variant="body2" color="text.secondary">
                Ready Rate
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {Math.round((region.readyServers / totalServers) * 100)}%
              </Typography>
            </Box>
            <LinearProgress
              variant="determinate"
              value={(region.readyServers / totalServers) * 100}
              sx={{ 
                height: 8, 
                borderRadius: 4,
                bgcolor: theme.palette.grey[200]
              }}
              color="success"
            />
          </Box>
        )}

        {/* Region Code */}
        <Box mt={2} pt={2} borderTop={1} borderColor="divider">
          <Typography variant="caption" color="text.secondary">
            Region: {region.region.toUpperCase()}
          </Typography>
        </Box>
      </CardContent>
    </Card>
  );
};
