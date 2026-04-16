import { Box, Typography, Button } from '@mui/material';
import { ShieldX } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
export const UnauthorizedPage = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: '#f5f7fa',
        gap: 2,
      }}
    >
      <ShieldX size={64} color="#d32f2f" />
      <Typography variant="h4" fontWeight="bold" color="#d32f2f">
        Access Denied
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ maxWidth: 400, textAlign: 'center' }}>
        You do not have the required permissions to access this page.
        If you believe this is an error, please contact your system administrator.
      </Typography>
      <Button
        variant="contained"
        onClick={() => navigate(isAuthenticated ? '/dashboard' : '/login')}
      >
        {isAuthenticated ? 'Back to Dashboard' : 'Go to Login'}
      </Button>
    </Box>
  );
};
