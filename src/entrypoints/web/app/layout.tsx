import { Metadata } from 'next';
import { AppBar, Toolbar, Typography, Container, Box, Button } from '@mui/material';
import { AppRouterCacheProvider } from '@mui/material-nextjs/v14-appRouter';
import ThemeRegistry from './ThemeRegistry';
import Link from 'next/link';
import { Home, BarChart } from '@mui/icons-material';
import '../globals.css';

export const metadata: Metadata = {
  title: 'TF2 QuickServer Manager',
  description: 'Manage and deploy TF2 servers quickly and easily',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <AppRouterCacheProvider>
          <ThemeRegistry>
            <Box sx={{ flexGrow: 1 }}>
              <AppBar position="static">
                <Toolbar>
                  <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
                    TF2 QuickServer Manager
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 2 }}>
                    <Button
                      color="inherit"
                      component={Link}
                      href="/"
                      startIcon={<Home />}
                    >
                      Home
                    </Button>
                    <Button
                      color="inherit"
                      component={Link}
                      href="/status"
                      startIcon={<BarChart />}
                    >
                      Status
                    </Button>
                  </Box>
                </Toolbar>
              </AppBar>
              <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
                {children}
              </Container>
            </Box>
          </ThemeRegistry>
        </AppRouterCacheProvider>
      </body>
    </html>
  );
}
