import { Metadata } from 'next';
import { Box } from '@mui/material';
import { AppRouterCacheProvider } from '@mui/material-nextjs/v14-appRouter';
import ThemeRegistry from './ThemeRegistry';
import Navbar from '../components/Navbar';
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
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <AppRouterCacheProvider>
          <ThemeRegistry>
            <Box sx={{ flexGrow: 1 }}>
              <Navbar />
              {children}
            </Box>
          </ThemeRegistry>
        </AppRouterCacheProvider>
      </body>
    </html>
  );
}
