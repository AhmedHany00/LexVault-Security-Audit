import { createRoot } from 'react-dom/client';
import { CssBaseline, ThemeProvider } from '@mui/material';
import App from './App.tsx';
import { lawFirmTheme } from './theme';
const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);
  root.render(
    <ThemeProvider theme={lawFirmTheme}>
      <CssBaseline />
      <App />
    </ThemeProvider>
  );
} else {
  console.error('[main] Root element #root not found in index.html.');
}
