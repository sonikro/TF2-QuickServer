import { createTheme } from '@mui/material/styles';

const tf2Colors = {
  steelBlue: '#395c78',
  dustyBlue: '#5b7a8c',
  greyBlue: '#768a88',
  greyBrown: '#6b6a65',
  darkBrown: '#34302d',
  brownRed: '#462d26',
  mediumBrown: '#6a4535',
  darkRed: '#913a1e',
  classicRed: '#bd3b3b',
  deepRed: '#9d312f',
  brightOrange: '#f08149',
  warmOrange: '#ef9849',
  lightOrange: '#f5ad87',
  peachOrange: '#f6b98a',
  cream: '#f5e7de',
  beige: '#c1a18a',
  lightBeige: '#dabda0',
};

const theme = createTheme({
  palette: {
    primary: {
      main: tf2Colors.steelBlue,
      light: tf2Colors.dustyBlue,
      dark: tf2Colors.darkBrown,
      contrastText: tf2Colors.cream,
    },
    secondary: {
      main: tf2Colors.classicRed,
      light: tf2Colors.lightOrange,
      dark: tf2Colors.deepRed,
      contrastText: tf2Colors.cream,
    },
    error: {
      main: tf2Colors.classicRed,
      light: tf2Colors.lightOrange,
      dark: tf2Colors.deepRed,
      contrastText: tf2Colors.cream,
    },
    warning: {
      main: tf2Colors.warmOrange,
      light: tf2Colors.peachOrange,
      dark: tf2Colors.brightOrange,
      contrastText: tf2Colors.darkBrown,
    },
    info: {
      main: tf2Colors.dustyBlue,
      light: tf2Colors.greyBlue,
      dark: tf2Colors.steelBlue,
      contrastText: tf2Colors.cream,
    },
    success: {
      main: tf2Colors.mediumBrown,
      light: tf2Colors.beige,
      dark: tf2Colors.brownRed,
      contrastText: tf2Colors.cream,
    },
    text: {
      primary: tf2Colors.darkBrown,
      secondary: tf2Colors.greyBrown,
    },
    background: {
      default: tf2Colors.cream,
      paper: tf2Colors.lightBeige,
    },
    grey: {
      50: tf2Colors.cream,
      100: tf2Colors.lightBeige,
      200: tf2Colors.beige,
      300: tf2Colors.greyBlue,
      400: tf2Colors.dustyBlue,
      500: tf2Colors.steelBlue,
      600: tf2Colors.greyBrown,
      700: tf2Colors.mediumBrown,
      800: tf2Colors.brownRed,
      900: tf2Colors.darkBrown,
    },
    common: {
      black: tf2Colors.darkBrown,
      white: tf2Colors.cream,
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
      color: tf2Colors.steelBlue,
      lineHeight: 1.2,
    },
    h2: {
      fontSize: '2.5rem',
      fontWeight: 700,
      color: tf2Colors.steelBlue,
      lineHeight: 1.3,
    },
    h3: {
      fontSize: '2rem',
      fontWeight: 600,
      color: tf2Colors.dustyBlue,
      lineHeight: 1.4,
    },
    h4: {
      fontSize: '1.5rem',
      fontWeight: 600,
      color: tf2Colors.mediumBrown,
    },
    h5: {
      fontSize: '1.25rem',
      fontWeight: 500,
      color: tf2Colors.greyBrown,
    },
    h6: {
      fontSize: '1.125rem',
      fontWeight: 500,
      color: tf2Colors.darkBrown,
    },
    body1: {
      fontSize: '1rem',
      color: tf2Colors.darkBrown,
      lineHeight: 1.6,
    },
    body2: {
      fontSize: '0.875rem',
      color: tf2Colors.greyBrown,
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
          boxShadow: `0 4px 20px rgba(52, 48, 45, 0.15)`,
          border: `1px solid ${tf2Colors.beige}`,
          backgroundColor: tf2Colors.lightBeige,
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: '8px',
          fontWeight: 500,
          '&.MuiChip-colorPrimary': {
            backgroundColor: tf2Colors.steelBlue,
            color: tf2Colors.cream,
          },
          '&.MuiChip-colorSecondary': {
            backgroundColor: tf2Colors.steelBlue,
            color: tf2Colors.cream,
          },
          '&.MuiChip-colorError': {
            backgroundColor: tf2Colors.classicRed,
            color: tf2Colors.cream,
          },
          '&.MuiChip-colorWarning': {
            backgroundColor: tf2Colors.warmOrange,
            color: tf2Colors.darkBrown,
          },
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: '8px',
          fontWeight: 600,
          textTransform: 'none' as const,
        },
        containedPrimary: {
          backgroundColor: tf2Colors.steelBlue,
          color: tf2Colors.cream,
          '&:hover': {
            backgroundColor: tf2Colors.dustyBlue,
          },
        },
        containedSecondary: {
          backgroundColor: tf2Colors.steelBlue,
          color: tf2Colors.cream,
          '&:hover': {
            backgroundColor: tf2Colors.dustyBlue,
          },
        },
        containedError: {
          backgroundColor: tf2Colors.classicRed,
          color: tf2Colors.cream,
          '&:hover': {
            backgroundColor: tf2Colors.deepRed,
          },
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundColor: tf2Colors.darkBrown,
          color: tf2Colors.cream,
        },
      },
    },
  },
});

export default theme;
