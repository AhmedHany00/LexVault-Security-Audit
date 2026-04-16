import { createTheme } from '@mui/material/styles';
export const lawFirmTheme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#0f1f33',
      light: '#203a5a',
      dark: '#08111c',
      contrastText: '#f8f5ef',
    },
    secondary: {
      main: '#b08d57',
      light: '#c6a873',
      dark: '#8d6a3d',
      contrastText: '#fffaf0',
    },
    background: {
      default: '#f4efe7',
      paper: '#ffffff',
    },
    text: {
      primary: '#142033',
      secondary: '#5c6678',
    },
    success: { main: '#356f4a' },
    warning: { main: '#ad7b2b' },
    error: { main: '#9f3a3a' },
    info: { main: '#355c8c' },
  },
  shape: { borderRadius: 18 },
  typography: {
    fontFamily: 'Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    h1: { fontFamily: 'Georgia, "Times New Roman", serif', fontWeight: 700 },
    h2: { fontFamily: 'Georgia, "Times New Roman", serif', fontWeight: 700 },
    h3: { fontFamily: 'Georgia, "Times New Roman", serif', fontWeight: 700 },
    h4: { fontFamily: 'Georgia, "Times New Roman", serif', fontWeight: 700 },
    h5: { fontFamily: 'Georgia, "Times New Roman", serif', fontWeight: 700 },
    h6: { fontFamily: 'Georgia, "Times New Roman", serif', fontWeight: 700 },
    button: { textTransform: 'none', fontWeight: 700 },
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: { borderRadius: 999, paddingInline: 20 },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
          border: '1px solid rgba(15,31,51,0.08)',
        },
      },
    },
    MuiTextField: {
      defaultProps: { variant: 'outlined', fullWidth: true },
    },
    MuiDialog: {
      styleOverrides: {
        paper: { borderRadius: 24 },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: { boxShadow: 'none' },
      },
    },
  },
});
