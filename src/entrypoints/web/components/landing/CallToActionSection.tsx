import { BarChart } from '@mui/icons-material';
import {
  Box,
  Button,
  Stack,
  Typography
} from '@mui/material';
import Link from 'next/link';
import DiscordIcon from '../DiscordIcon';

export default function CallToActionSection() {
  return (
    <Box sx={{ textAlign: 'center', py: 6 }}>
      <Typography variant="h4" component="h2" fontWeight={600} gutterBottom>
        Ready to Start Playing?
      </Typography>
      <Typography variant="h6" color="text.secondary" paragraph sx={{ mb: 4 }}>
        Join thousands of players already using TF2-QuickServer
      </Typography>

      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={3}
        justifyContent="center"
      >
        <Button
          variant="contained"
          size="large"
          href="https://discord.gg/HfDgMj73cW"
          target="_blank"
          startIcon={<DiscordIcon />}
          sx={{
            px: 6,
            py: 2,
            borderRadius: '30px',
            background: 'linear-gradient(45deg, #5865F2, #7289DA)',
            fontSize: '1.1rem',
            '&:hover': {
              background: 'linear-gradient(45deg, #4752C4, #677BC4)',
            }
          }}
        >
          Join Discord & Start Playing
        </Button>
        <Button
          variant="outlined"
          size="large"
          component={Link}
          href="/status"
          startIcon={<BarChart />}
          sx={{
            px: 6,
            py: 2,
            borderRadius: '30px',
            borderWidth: 2,
            fontSize: '1.1rem',
            '&:hover': {
              borderWidth: 2,
            }
          }}
        >
          View Server Status
        </Button>
      </Stack>
    </Box>
  );
}
