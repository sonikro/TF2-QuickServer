import {
  Box,
  Card,
  CardContent,
  Chip,
  Grid,
  Typography
} from '@mui/material';

const regions = [
  { name: 'São Paulo', flag: '🇧🇷', provider: 'OCI' },
  { name: 'Santiago', flag: '🇨🇱', provider: 'OCI' },
  { name: 'Bogotá', flag: '🇨🇴', provider: 'OCI' },
  { name: 'Chicago', flag: '🇺🇸', provider: 'OCI' },
  { name: 'Frankfurt', flag: '🇩🇪', provider: 'OCI' },
  { name: 'Buenos Aires', flag: '🇦🇷', provider: 'AWS Local Zone' },
  { name: 'Lima', flag: '🇵🇪', provider: 'AWS Local Zone' }
];

export default function RegionsSection() {
  return (
    <Box sx={{ mb: 8 }}>
      <Typography variant="h3" component="h2" textAlign="center" fontWeight={600} gutterBottom>
        🌎 Supported Regions
      </Typography>
      <Typography variant="h6" textAlign="center" color="text.secondary" paragraph sx={{ mb: 5 }}>
        Deploy servers globally with optimal latency
      </Typography>

      <Grid container spacing={2} justifyContent="center">
        {regions.map((region, index) => (
          <Grid size={{ xs: 6, sm: 4, md: 3 }} key={index}>
            <Card
              elevation={2}
              sx={{
                textAlign: 'center',
                transition: 'all 0.3s',
                '&:hover': {
                  elevation: 4,
                  transform: 'translateY(-2px)'
                }
              }}
            >
              <CardContent sx={{ py: 2 }}>
                <Typography variant="h4" sx={{ mb: 1 }}>
                  {region.flag}
                </Typography>
                <Typography variant="h6" fontWeight={600} gutterBottom>
                  {region.name}
                </Typography>
                <Chip
                  label={region.provider}
                  size="small"
                  color={region.provider === 'AWS Local Zone' ? 'warning' : 'primary'}
                  variant="outlined"
                />
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
}
