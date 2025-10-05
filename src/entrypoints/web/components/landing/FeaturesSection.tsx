import {
  CloudQueue,
  Language,
  Public,
  Security,
  Speed,
  Timer
} from '@mui/icons-material';
import {
  Box,
  Card,
  CardContent,
  Grid,
  Typography
} from '@mui/material';

const features = [
  {
    icon: <Timer sx={{ fontSize: 48, color: 'primary.main' }} />,
    title: 'Quick Deployment',
    description: 'Deploy TF2 servers from scratch in just 3 minutes with simple Discord commands.'
  },
  {
    icon: <Public sx={{ fontSize: 48, color: 'success.main' }} />,
    title: 'Global Multi-Cloud',
    description: 'Deploy across Oracle Cloud and AWS Local Zones for optimal latency worldwide.'
  },
  {
    icon: <Security sx={{ fontSize: 48, color: 'error.main' }} />,
    title: 'DDoS Protection',
    description: 'Built-in TF2-QuickServer-Shield provides real-time DDoS monitoring and blocking.'
  },
  {
    icon: <CloudQueue sx={{ fontSize: 48, color: 'info.main' }} />,
    title: 'Containerized',
    description: 'Each server runs in isolated Docker containers for maximum security and reliability.'
  },
  {
    icon: <Speed sx={{ fontSize: 48, color: 'warning.main' }} />,
    title: 'Cost Efficient',
    description: 'Automatic termination of idle servers after 10 minutes to optimize costs.'
  },
  {
    icon: <Language sx={{ fontSize: 48, color: 'secondary.main' }} />,
    title: 'SDR Support',
    description: 'Full Steam Datagram Relay support for optimized network routing.'
  }
];

export default function FeaturesSection() {
  return (
    <Box sx={{ mb: 8 }}>
      <Typography variant="h3" component="h2" textAlign="center" fontWeight={600} gutterBottom>
        ✨ Key Features
      </Typography>
      <Typography variant="h6" textAlign="center" color="text.secondary" paragraph sx={{ mb: 5 }}>
        Everything you need to deploy and manage TF2 servers effortlessly
      </Typography>

      <Grid container spacing={4}>
        {features.map((feature, index) => (
          <Grid size={{ xs: 12, md: 6, lg: 4 }} key={index}>
            <Card
              elevation={3}
              sx={{
                height: '100%',
                transition: 'all 0.3s',
                '&:hover': {
                  elevation: 8,
                  transform: 'translateY(-4px)'
                }
              }}
            >
              <CardContent sx={{ textAlign: 'center', p: 4 }}>
                <Box sx={{ mb: 3 }}>
                  {feature.icon}
                </Box>
                <Typography variant="h6" fontWeight={600} gutterBottom>
                  {feature.title}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {feature.description}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
}
