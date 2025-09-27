import { Metadata } from 'next';
import { Box } from '@mui/material';
import { AppRouterCacheProvider } from '@mui/material-nextjs/v14-appRouter';
import ThemeRegistry from './ThemeRegistry';
import Navbar from '../components/Navbar';
import '../globals.css';

export const metadata: Metadata = {
  title: {
    default: 'TF2 QuickServer',
    template: '%s | TF2 QuickServer'
  },
  description: 'Instantly deploy Team Fortress 2 servers from Discord. Multi-cloud architecture with Oracle Cloud & AWS, DDoS protection, and global deployment in 5 minutes.',
  keywords: [
    'TF2',
    'Team Fortress 2',
    'game server',
    'Discord bot',
    'server hosting',
    'competitive gaming',
    'Oracle Cloud',
    'AWS',
    'Docker',
    'gaming infrastructure',
    'DDoS protection',
    'multi-cloud'
  ],
  authors: [
    { name: 'sonikro', url: 'https://github.com/sonikro' }
  ],
  creator: 'sonikro',
  publisher: 'TF2-QuickServer',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL('https://quickserver.sonikro.com'),
  alternates: {
    canonical: '/',
  },
  openGraph: {
    title: 'TF2 QuickServer',
    description: 'Instantly deploy Team Fortress 2 servers from Discord. Multi-cloud architecture with DDoS protection and global deployment.',
    url: 'https://tf2-quickserver.com',
    siteName: 'TF2 QuickServer',
    images: [
      {
        url: '/assets/logo.png',
        width: 220,
        height: 220,
        alt: 'TF2-QuickServer Logo',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  icons: {
    icon: '/assets/logo.png',
    shortcut: '/assets/logo.png',
    apple: '/assets/logo.png',
  },
  manifest: '/manifest.json',
  category: 'gaming',
  classification: 'Gaming Infrastructure',
  referrer: 'origin-when-cross-origin',
  colorScheme: 'dark light',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#0a0a0a' },
  ],
  viewport: {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 5,
    userScalable: true,
  },
  verification: {
    // Add your verification tokens here when available
    // google: 'your-google-verification-token',
    // yandex: 'your-yandex-verification-token',
    // other: 'your-other-verification-token',
  },
  applicationName: 'TF2 QuickServer',
  generator: 'Next.js',
  abstract: 'Multi-cloud Team Fortress 2 server deployment platform with Discord integration, featuring Oracle Cloud Infrastructure, AWS Local Zones, and advanced DDoS protection for instant competitive gaming server provisioning.',
  archives: ['https://github.com/sonikro/TF2-QuickServer'],
  bookmarks: ['https://github.com/sonikro/TF2-QuickServer'],
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
