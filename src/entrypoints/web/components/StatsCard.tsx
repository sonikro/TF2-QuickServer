import React from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  Skeleton,
  SvgIconProps
} from '@mui/material';

interface StatsCardProps {
  title: string;
  value: number;
  subtitle?: string;
  icon: React.ComponentType<SvgIconProps>;
  color?: 'primary' | 'secondary' | 'error' | 'warning' | 'info' | 'success';
  loading?: boolean;
}

export const StatsCard: React.FC<StatsCardProps> = ({
  title,
  value,
  subtitle,
  icon: Icon,
  color = 'primary',
  loading = false
}) => {
  return (
    <Card 
      sx={{ 
        height: '100%',
        transition: 'all 0.2s ease-in-out',
        '&:hover': {
          transform: 'translateY(-2px)',
          boxShadow: 4,
        }
      }}
    >
      <CardContent>
        <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
          <Typography variant="h6" component="h2" color="text.secondary">
            {title}
          </Typography>
          <Icon 
            sx={{ 
              fontSize: 32,
              color: theme => theme.palette[color].main,
              opacity: 0.7
            }} 
          />
        </Box>
        
        <Box>
          {loading ? (
            <Skeleton variant="text" width="60%" height={48} />
          ) : (
            <Typography 
              variant="h3" 
              component="div" 
              fontWeight={700}
              color={color}
              gutterBottom
            >
              {value.toLocaleString()}
            </Typography>
          )}
          
          {subtitle && !loading && (
            <Typography variant="body2" color="text.secondary">
              {subtitle}
            </Typography>
          )}
          
          {subtitle && loading && (
            <Skeleton variant="text" width="40%" />
          )}
        </Box>
      </CardContent>
    </Card>
  );
};
