'use client';

import { AppBar, Toolbar, Typography, Box, Button, Container, styled } from '@mui/material';
import { Home, BarChart, GitHub } from '@mui/icons-material';
import Link from 'next/link';
import DiscordIcon from './DiscordIcon';

const StyledAppBar = styled(AppBar)(({ theme }) => ({
  backgroundColor: 'rgba(255, 255, 255, 0.95)',
  backdropFilter: 'blur(10px)',
  boxShadow: '0 2px 20px rgba(0, 0, 0, 0.1)',
  borderBottom: '1px solid rgba(0, 0, 0, 0.05)',
}));

const NavButton = styled(Button)(({ theme }) => ({
  color: '#000339',
  fontWeight: 500,
  textTransform: 'none',
  borderRadius: '8px',
  padding: '8px 16px',
  '&:hover': {
    backgroundColor: 'rgba(0, 3, 57, 0.08)',
  },
}));

const ExternalNavButton = styled('a')(({ theme }) => ({
  color: '#000339',
  fontWeight: 500,
  textTransform: 'none',
  borderRadius: '8px',
  padding: '8px 16px',
  textDecoration: 'none',
  display: 'inline-flex',
  alignItems: 'center',
  gap: '8px',
  transition: 'background-color 0.2s',
  '&:hover': {
    backgroundColor: 'rgba(0, 3, 57, 0.08)',
  },
}));

export default function Navbar() {
  return (
    <StyledAppBar position="static" elevation={0}>
      <Container maxWidth="lg">
        <Toolbar sx={{ px: 0 }}>
          <Typography 
            variant="h6" 
            component={Link}
            href="/"
            sx={{ 
              flexGrow: 1,
              fontWeight: 700,
              color: '#000339',
              textDecoration: 'none',
              fontSize: '1.5rem'
            }}
          >
            TF2-QuickServer
          </Typography>
          
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Link href="/" passHref>
              <NavButton
                startIcon={<Home />}
              >
                Home
              </NavButton>
            </Link>
            <Link href="/status" passHref>
              <NavButton
                startIcon={<BarChart />}
              >
                Status
              </NavButton>
            </Link>
            <ExternalNavButton
              href="https://github.com/sonikro/TF2-QuickServer"
              target="_blank"
              rel="noopener noreferrer"
            >
              <GitHub />
              GitHub
            </ExternalNavButton>
            <Button
              variant="contained"
              href="https://discord.gg/HfDgMj73cW"
              target="_blank"
              rel="noopener noreferrer"
              startIcon={<DiscordIcon />}
              sx={{
                ml: 1,
                backgroundColor: '#5865F2',
                color: '#fff',
                fontWeight: 600,
                textTransform: 'none',
                borderRadius: '8px',
                px: 2,
                '&:hover': {
                  backgroundColor: '#4752C4',
                },
              }}
            >
              Discord
            </Button>
          </Box>
        </Toolbar>
      </Container>
    </StyledAppBar>
  );
}
