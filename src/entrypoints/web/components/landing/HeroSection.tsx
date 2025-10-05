import { GitHub } from '@mui/icons-material';
import {
  Box,
  Button,
  Chip,
  Stack,
  Typography
} from '@mui/material';
import DiscordIcon from '../DiscordIcon';

export default function HeroSection() {
  return (
    <Box sx={{ textAlign: 'center', mb: 8, pt: 8 }}>
      <Typography
        variant="h2"
        component="h1"
        fontWeight={700}
        gutterBottom
      >
        🎮 TF2-QuickServer
      </Typography>

      <Typography
        variant="h5"
        color="text.secondary"
        paragraph
        sx={{ mb: 4, maxWidth: '800px', mx: 'auto' }}
      >
        Instantly deploy Team Fortress 2 servers straight from Discord — powered by Docker,
        multi-cloud architecture (Oracle Cloud & AWS), and SDR.
      </Typography>

      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={2}
        justifyContent="center"
        sx={{ mb: 4 }}
      >
        <Button
          variant="contained"
          size="large"
          href="https://discord.gg/HfDgMj73cW"
          target="_blank"
          startIcon={<DiscordIcon />}
          sx={{
            px: 4,
            py: 1.5,
            borderRadius: '25px',
            background: 'linear-gradient(45deg, #5865F2, #7289DA)',
            '&:hover': {
              background: 'linear-gradient(45deg, #4752C4, #677BC4)',
            }
          }}
        >
          Join Discord
        </Button>
        <Button
          variant="outlined"
          size="large"
          href="https://github.com/sonikro/TF2-QuickServer"
          target="_blank"
          startIcon={<GitHub />}
          sx={{
            px: 4,
            py: 1.5,
            borderRadius: '25px',
            borderWidth: 2,
            '&:hover': {
              borderWidth: 2,
            }
          }}
        >
          GitHub Repository
        </Button>
      </Stack>

      <Stack direction="row" spacing={1} justifyContent="center" flexWrap="wrap">
        <Chip label="Docker" color="primary" />
        <Chip label="Multi-Cloud" color="success" />
        <Chip label="DDoS Protected" color="error" />
        <Chip label="Open Source" color="secondary" />
      </Stack>
    </Box>
  );
}
