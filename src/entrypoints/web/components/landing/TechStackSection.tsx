import {
  Box,
  Grid,
  Paper,
  Typography
} from '@mui/material';

const techStack = [
  { name: 'Docker', description: 'Containerized server deployments' },
  { name: 'Terraform', description: 'Infrastructure as Code' },
  { name: 'Oracle Cloud', description: 'Primary cloud provider' },
  { name: 'AWS Local Zones', description: 'Ultra-low latency deployment' },
  { name: 'Go', description: 'DDoS protection shield' },
  { name: 'Node.js', description: 'Backend services' },
  { name: 'SQLite', description: 'Local database' },
  { name: 'Discord.js', description: 'Bot integration' }
];

export default function TechStackSection() {
  return (
    <Box sx={{ mb: 8 }}>
      <Typography variant="h3" component="h2" textAlign="center" fontWeight={600} gutterBottom>
        ⚙️ Tech Stack
      </Typography>

      <Grid container spacing={3} justifyContent="center" sx={{ mt: 4 }}>
        {techStack.map((tech, index) => (
          <Grid size={{ xs: 6, sm: 4, md: 3 }} key={index}>
            <Paper
              elevation={1}
              sx={{
                p: 2,
                textAlign: 'center',
                transition: 'all 0.3s',
                '&:hover': {
                  elevation: 3
                }
              }}
            >
              <Typography variant="h6" fontWeight={600} gutterBottom>
                {tech.name}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {tech.description}
              </Typography>
            </Paper>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
}
