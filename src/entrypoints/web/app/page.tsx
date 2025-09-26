import {
  BarChart,
  CloudQueue,
  GitHub,
  Language,
  Public,
  Security,
  Speed,
  Timer
} from '@mui/icons-material';
import {
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Container,
  Divider,
  Grid,
  Paper,
  Stack,
  Typography
} from '@mui/material';
import Link from 'next/link';
import DiscordIcon from '../components/DiscordIcon';

const regions = [
  { name: 'São Paulo', flag: '🇧🇷', provider: 'OCI' },
  { name: 'Santiago', flag: '🇨🇱', provider: 'OCI' },
  { name: 'Bogotá', flag: '🇨🇴', provider: 'OCI' },
  { name: 'Chicago', flag: '🇺🇸', provider: 'OCI' },
  { name: 'Frankfurt', flag: '🇩🇪', provider: 'OCI' },
  { name: 'Buenos Aires', flag: '🇦🇷', provider: 'AWS Local Zone' },
  { name: 'Lima', flag: '🇵🇪', provider: 'AWS Local Zone' }
];

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

export default function HomePage() {
  return (
    <Box>
      {/* Hero Section */}
      <Container maxWidth="lg">
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

        <Divider sx={{ my: 6 }} />

        {/* Features Section */}
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

        <Divider sx={{ my: 6 }} />

        {/* How It Works Section */}
        <Box sx={{ mb: 8 }}>
          <Typography variant="h3" component="h2" textAlign="center" fontWeight={600} gutterBottom>
            🧐 How It Works
          </Typography>
          <Typography variant="h6" textAlign="center" color="text.secondary" paragraph sx={{ mb: 5 }}>
            Get your TF2 server running in minutes
          </Typography>

          <Grid container spacing={3} justifyContent="center">
            {[
              { step: '1', title: 'Join Discord', description: 'Join our Discord server or use the bot in partnered guilds' },
              { step: '2', title: 'Run Command', description: 'Execute /create-server sa-saopaulo-1 to deploy' },
              { step: '3', title: 'Select Variant', description: 'Choose your server type (e.g., standard-competitive)' },
              { step: '4', title: 'Get Server Info', description: 'Receive connection details with SDR and direct addresses' },
              { step: '5', title: 'Play!', description: 'Join with friends and start fragging!' }
            ].map((item, index) => (
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

        <Divider sx={{ my: 6 }} />

        {/* Regions Section */}
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

        <Divider sx={{ my: 6 }} />

        {/* Tech Stack Section */}
        <Box sx={{ mb: 8 }}>
          <Typography variant="h3" component="h2" textAlign="center" fontWeight={600} gutterBottom>
            ⚙️ Tech Stack
          </Typography>

          <Grid container spacing={3} justifyContent="center" sx={{ mt: 4 }}>
            {[
              { name: 'Docker', description: 'Containerized server deployments' },
              { name: 'Terraform', description: 'Infrastructure as Code' },
              { name: 'Oracle Cloud', description: 'Primary cloud provider' },
              { name: 'AWS Local Zones', description: 'Ultra-low latency deployment' },
              { name: 'Go', description: 'DDoS protection shield' },
              { name: 'Node.js', description: 'Backend services' },
              { name: 'SQLite', description: 'Local database' },
              { name: 'Discord.js', description: 'Bot integration' }
            ].map((tech, index) => (
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

        <Divider sx={{ my: 6 }} />

        {/* Call to Action */}
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
      </Container>
    </Box>
  );
}
