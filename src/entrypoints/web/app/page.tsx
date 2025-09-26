import { BarChart, PlayArrow, Settings } from '@mui/icons-material';
import { Box, Button, Grid, Paper, Typography } from '@mui/material';
import Link from 'next/link';

export default function HomePage() {
  return (
    <Box>
      <Typography variant="h4" component="h1" gutterBottom>
        Welcome to TF2 QuickServer Manager
      </Typography>
      
      <Typography variant="body1" paragraph>
        Next.js with Material-UI is working correctly. Manage and deploy your TF2 servers with ease.
      </Typography>

      <Grid container spacing={2} sx={{ mt: 3 }}>
        <Grid size={{ xs: 12, sm: 6, md: 4 }}>
          <Paper elevation={2} sx={{ p: 3, textAlign: 'center', transition: 'all 0.3s', '&:hover': { elevation: 4 } }}>
            <BarChart sx={{ fontSize: 48, color: 'primary.main', mb: 2 }} />
            <Typography variant="h6" gutterBottom>
              Server Status
            </Typography>
            <Typography variant="body2" color="text.secondary" paragraph>
              Monitor your TF2 servers across all regions with real-time status updates showing ready and pending servers.
            </Typography>
            <Button 
              variant="contained" 
              component={Link}
              href="/status"
              startIcon={<BarChart />}
              fullWidth
            >
              View Dashboard
            </Button>
          </Paper>
        </Grid>
        
        <Grid size={{ xs: 12, sm: 6, md: 4 }}>
          <Paper elevation={2} sx={{ p: 3, textAlign: 'center', transition: 'all 0.3s', '&:hover': { elevation: 4 } }}>
            <PlayArrow sx={{ fontSize: 48, color: 'success.main', mb: 2 }} />
            <Typography variant="h6" gutterBottom>
              Deploy Servers
            </Typography>
            <Typography variant="body2" color="text.secondary" paragraph>
              Quickly deploy new TF2 servers in your preferred regions with custom configurations.
            </Typography>
            <Button 
              variant="outlined" 
              startIcon={<PlayArrow />}
              fullWidth
              disabled
            >
              Coming Soon
            </Button>
          </Paper>
        </Grid>
        
        <Grid size={{ xs: 12, sm: 6, md: 4 }}>
          <Paper elevation={2} sx={{ p: 3, textAlign: 'center', transition: 'all 0.3s', '&:hover': { elevation: 4 } }}>
            <Settings sx={{ fontSize: 48, color: 'warning.main', mb: 2 }} />
            <Typography variant="h6" gutterBottom>
              Server Management
            </Typography>
            <Typography variant="body2" color="text.secondary" paragraph>
              Configure, monitor, and manage your existing TF2 servers with ease.
            </Typography>
            <Button 
              variant="outlined" 
              startIcon={<Settings />}
              fullWidth
              disabled
            >
              Coming Soon
            </Button>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
}
