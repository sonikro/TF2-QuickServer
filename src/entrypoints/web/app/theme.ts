import { createTheme } from '@mui/material/styles';

const theme = createTheme({
  palette: {
    primary: {
      main: '#5597f9', // Cornflower blue
      light: '#75aafa',
      dark: '#136ef6',
      contrastText: '#fefeff',
    },
    secondary: {
      main: '#136ef6', // Darker cornflower blue
      light: '#5597f9',
      dark: '#0751c0',
      contrastText: '#fefeff',
    },
    error: {
      main: '#dc2626', // Red
      light: '#fca5a5',
      dark: '#991b1b',
    },
    warning: {
      main: '#f59e0b', // Amber/Orange - this was causing your orange text
      light: '#fde68a',
      dark: '#d97706',
    },
    info: {
      main: '#5597f9', // Use your cornflower blue
      light: '#75aafa',
      dark: '#136ef6',
    },
    success: {
      main: '#5597f9', // Use your cornflower blue instead of green
      light: '#75aafa',
      dark: '#136ef6',
    },
    text: {
      primary: '#000000',
      secondary: '#666666',
    },
    background: {
      default: '#fefeff',
      paper: '#fefeff',
    },
    grey: {
      50: '#fefeff',
      100: '#ddeafe',
      200: '#bad5fd',
      300: '#98bffb',
      400: '#75aafa',
      500: '#5597f9',
      600: '#136ef6',
      700: '#0751c0',
      800: '#053680',
      900: '#021b40',
    },
    common: {
      black: '#000000',
      white: '#fefeff',
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
      color: '#5597f9',
      lineHeight: 1.2,
    },
    h2: {
      fontSize: '2.5rem',
      fontWeight: 700,
      color: '#5597f9',
      lineHeight: 1.3,
    },
    h3: {
      fontSize: '2rem',
      fontWeight: 600,
      color: '#5597f9',
      lineHeight: 1.4,
    },
    h4: {
      fontSize: '1.5rem',
      fontWeight: 600,
      color: '#5597f9',
    },
    h5: {
      fontSize: '1.25rem',
      fontWeight: 500,
      color: '#666666',
    },
    h6: {
      fontSize: '1.125rem',
      fontWeight: 500,
      color: '#5597f9',
    },
    body1: {
      fontSize: '1rem',
      color: '#666666',
      lineHeight: 1.6,
    },
    body2: {
      fontSize: '0.875rem',
      color: '#666666',
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
