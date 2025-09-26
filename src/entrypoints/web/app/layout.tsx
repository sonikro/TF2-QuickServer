import { Metadata } from 'next';
import { AppBar, Toolbar, Typography, Container, Box } from '@mui/material';
import { AppRouterCacheProvider } from '@mui/material-nextjs/v14-appRouter';
import ThemeRegistry from './ThemeRegistry';
import Link from 'next/link';
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
                  <Link href="/" style={{ color: 'inherit', textDecoration: 'none' }}>
                    <Typography variant="body1">
                      Home
                    </Typography>
                  </Link>
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
