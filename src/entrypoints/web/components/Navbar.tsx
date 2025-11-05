'use client';

import { AppBar, Toolbar, Typography, Box, Button, Container, styled } from '@mui/material';
import { Home, BarChart, GitHub } from '@mui/icons-material';
import Link from 'next/link';
import DiscordIcon from './DiscordIcon';

const StyledAppBar = styled(AppBar)(({ theme }) => ({
  backgroundColor: `${theme.palette.background.paper}f2`,
  backdropFilter: 'blur(10px)',
  boxShadow: `0 2px 20px ${theme.palette.grey[800]}26`,
  borderBottom: `1px solid ${theme.palette.grey[300]}`,
}));

const NavButton = styled(Button)(({ theme }) => ({
  color: theme.palette.text.primary,
  fontWeight: 500,
  textTransform: 'none',
  borderRadius: '8px',
  padding: '8px 16px',
  '&:hover': {
    backgroundColor: `${theme.palette.primary.main}14`,
  },
}));

const ExternalNavButton = styled('a')(({ theme }) => ({
  color: theme.palette.text.primary,
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
    backgroundColor: `${theme.palette.primary.main}14`,
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
              color: 'primary.main',
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
              sx={(theme) => ({
                ml: 1,
                backgroundColor: '#5865F2',
                color: theme.palette.common.white,
                fontWeight: 600,
                textTransform: 'none',
                borderRadius: '8px',
                px: 2,
                '&:hover': {
                  backgroundColor: '#4752C4',
                },
              })}
            >
              Discord
            </Button>
          </Box>
        </Toolbar>
      </Container>
    </StyledAppBar>
  );
}
