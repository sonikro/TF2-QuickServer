import { Paper, Typography, Box, Button, Grid2 as Grid } from '@mui/material';
import { PlayArrow, Settings, Analytics } from '@mui/icons-material';

export default function HomePage() {
  return (
    <Box>
      <Typography variant="h4" component="h1" gutterBottom>
        Welcome to TF2 QuickServer Manager
      </Typography>
      
      <Typography variant="body1" paragraph>
        Next.js with Material-UI is working correctly. Manage and deploy your TF2 servers with ease.
      </Typography>

    </Box>
  );
}
