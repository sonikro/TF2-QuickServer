import { createTheme } from '@mui/material/styles';

const theme = createTheme({
  palette: {
    primary: {
      main: '#000339',
      light: '#E6F0FF',
    },
    secondary: {
      main: '#FF6B35',
      light: '#F7931E',
    },
    text: {
      primary: '#000339',
      secondary: '#5A6473',
    },
    background: {
      default: '#FFFFFF',
      paper: '#FFFFFF',
    },
  },
  typography: {
    fontFamily: [
      'Inter',
      'system-ui',
      '-apple-system',
      'BlinkMacSystemFont',
      '"Segoe UI"',
      'Roboto',
      'sans-serif',
    ].join(','),
    h1: {
      fontSize: '3.5rem',
      fontWeight: 700,
      color: '#000339',
      lineHeight: 1.2,
    },
    h2: {
      fontSize: '2.5rem',
      fontWeight: 700,
      color: '#000339',
      lineHeight: 1.3,
    },
    h3: {
      fontSize: '2rem',
      fontWeight: 600,
      color: '#000339',
      lineHeight: 1.4,
    },
    h4: {
      fontSize: '1.5rem',
      fontWeight: 600,
      color: '#000339',
    },
    h5: {
      fontSize: '1.25rem',
      fontWeight: 500,
      color: '#5A6473',
    },
    h6: {
      fontSize: '1.125rem',
      fontWeight: 500,
      color: '#000339',
    },
    body1: {
      fontSize: '1rem',
      color: '#5A6473',
      lineHeight: 1.6,
    },
    body2: {
      fontSize: '0.875rem',
      color: '#5A6473',
      lineHeight: 1.5,
    },
  },
  components: {
    MuiContainer: {
      styleOverrides: {
        root: {
          paddingLeft: '24px',
          paddingRight: '24px',
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: '12px',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
          border: '1px solid rgba(0, 0, 0, 0.05)',
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: '8px',
          fontWeight: 500,
        },
      },
    },
  },
});

export default theme;
