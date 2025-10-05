import {
  Avatar,
  Box,
  Grid,
  Paper,
  Typography
} from '@mui/material';

const steps = [
  { step: '1', title: 'Join Discord', description: 'Join our Discord server or use the bot in partnered guilds' },
  { step: '2', title: 'Run Command', description: 'Execute /create-server sa-saopaulo-1 to deploy' },
  { step: '3', title: 'Select Variant', description: 'Choose your server type (e.g., standard-competitive)' },
  { step: '4', title: 'Get Server Info', description: 'Receive connection details with SDR and direct addresses' },
  { step: '5', title: 'Play!', description: 'Join with friends and start fragging!' }
];

export default function HowItWorksSection() {
  return (
    <Box sx={{ mb: 8 }}>
      <Typography variant="h3" component="h2" textAlign="center" fontWeight={600} gutterBottom>
        🧐 How It Works
      </Typography>
      <Typography variant="h6" textAlign="center" color="text.secondary" paragraph sx={{ mb: 5 }}>
        Get your TF2 server running in minutes
      </Typography>

      <Grid container spacing={3} justifyContent="center">
        {steps.map((item, index) => (
          <Grid size={{ xs: 12, sm: 6, md: 2.4 }} key={index}>
            <Paper
              elevation={2}
              sx={{
                p: 3,
                textAlign: 'center',
                height: '100%',
                transition: 'all 0.3s',
                '&:hover': {
                  elevation: 6,
                  transform: 'scale(1.05)'
                }
              }}
            >
              <Avatar
                sx={{
                  width: 56,
                  height: 56,
                  mx: 'auto',
                  mb: 2,
                  background: 'linear-gradient(45deg, #FF6B35, #F7931E)',
                  fontSize: '1.5rem',
                  fontWeight: 'bold'
                }}
              >
                {item.step}
              </Avatar>
              <Typography variant="h6" fontWeight={600} gutterBottom>
                {item.title}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {item.description}
              </Typography>
            </Paper>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
}
