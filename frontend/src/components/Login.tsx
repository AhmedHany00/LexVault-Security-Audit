import React, { useState, useRef } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import axios from 'axios';
import {
  Box, Typography, TextField, Button, Alert,
  Paper, Avatar, Stack, Divider,
} from '@mui/material';
import { ShieldCheck, Scale, Info } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { sanitizeText } from '../utils/sanitize';
import { validateEmail } from '../utils/validation';
const MAX_ATTEMPTS = 5;
const LOCKOUT_SECS = 30;
export const Login = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();
  const from = (location.state as { from?: { pathname: string } })?.from?.pathname || '/dashboard';
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState({ email: '', password: '' });
  const [apiError, setApiError] = useState('');
  const [loading, setLoading] = useState(false);
  const attemptCount = useRef(0);
  const [lockedOut, setLockedOut] = useState(false);
  const [lockoutSecs, setLockoutSecs] = useState(0);
  const lockoutTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const startLockout = () => {
    setLockedOut(true);
    setLockoutSecs(LOCKOUT_SECS);
    lockoutTimer.current = setInterval(() => {
      setLockoutSecs(prev => {
        if (prev <= 1) {
          if (lockoutTimer.current) clearInterval(lockoutTimer.current);
          setLockedOut(false);
          attemptCount.current = 0;
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name as keyof typeof errors]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
    setApiError('');
  };
  const validate = () => {
    const emailResult = validateEmail(formData.email);
    const newErrors = {
      email: emailResult.valid ? '' : emailResult.message,
      password: formData.password ? '' : 'Password is required.',
    };
    setErrors(newErrors);
    return !newErrors.email && !newErrors.password;
  };
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (lockedOut || !validate()) return;
    setApiError('');
    setLoading(true);
    const payload = {
      email: sanitizeText(formData.email),
      password: formData.password,
    };
    try {
      const res = await axios.post('http://localhost:3000/api/auth/login', payload);
      let fullName: string | undefined;
      try {
        const stored = localStorage.getItem('slms_name_' + formData.email);
        if (stored) {
          const p = JSON.parse(stored);
          fullName = [p.firstName, p.lastName].filter(Boolean).join(' ') || undefined;
        }
      } catch {
      }
      const userRole = (res.data.role || '').toLowerCase();
      login(res.data.token, userRole, formData.email, fullName);
      attemptCount.current = 0;
      navigate(from, { replace: true });
    } catch (err: unknown) {
      attemptCount.current += 1;
      if (attemptCount.current >= MAX_ATTEMPTS) startLockout();
      const msg = (axios.isAxiosError(err) && err.response?.data?.message)
        ? err.response.data.message
        : 'Invalid credentials. Please try again.';
      setApiError(msg);
    } finally {
      setLoading(false);
    }
  };
  return (
    <Box sx={{ minHeight: '100vh', display: 'grid', placeItems: 'center', px: 2, py: 4 }}>
      <Paper elevation={0} sx={{ width: '100%', maxWidth: 1180, overflow: 'hidden', borderRadius: 5, display: 'grid', gridTemplateColumns: { xs: '1fr', md: '0.95fr 1.05fr' } }}>
        <Box sx={{ p: { xs: 4, md: 6 }, bgcolor: 'primary.main', color: 'primary.contrastText', position: 'relative', overflow: 'hidden' }}>
          <Box sx={{ position: 'absolute', inset: 0, background: 'radial-gradient(circle at top right, rgba(176,141,87,0.35), transparent 35%)' }} />
          <Box sx={{ position: 'relative' }}>
            <Avatar sx={{ width: 64, height: 64, bgcolor: 'secondary.main', mb: 3 }}>
              <Scale size={28} />
            </Avatar>
            <Typography variant="h3" sx={{ maxWidth: 420, mb: 2 }}>
              Secure Legal Case & Document Management
            </Typography>
            <Typography sx={{ opacity: 0.88, maxWidth: 460, mb: 4, lineHeight: 1.7 }}>
              Designed for legal teams that need structured case records, protected document handling, and clear audit trails.
            </Typography>
            <Stack spacing={2} sx={{ mb: 4 }}>
              {[
                'Role-based access for lawyers, clients, paralegals, and admins',
                'SHA-256 integrity checks on every secure document download',
                'Professional workflows for case tracking and file management',
              ].map(item => (
                <Stack key={item} direction="row" spacing={1.5} alignItems="flex-start">
                  <ShieldCheck size={18} style={{ marginTop: 3, flexShrink: 0 }} />
                  <Typography sx={{ opacity: 0.9 }}>{item}</Typography>
                </Stack>
              ))}
            </Stack>
            <Typography variant="caption" sx={{ opacity: 0.75 }}>Trusted access portal for a modern law office.</Typography>
          </Box>
        </Box>
        <Box sx={{ p: { xs: 4, md: 6 }, bgcolor: 'background.paper' }}>
          <Box sx={{ maxWidth: 460, mx: 'auto' }}>
            <Typography variant="overline" sx={{ letterSpacing: 3, color: 'secondary.main', fontWeight: 800 }}>
              Client Access
            </Typography>
            <Typography variant="h4" sx={{ mt: 1, mb: 1 }}>
              Sign in to continue
            </Typography>
            <Typography color="text.secondary" sx={{ mb: 3, lineHeight: 1.7 }}>
              Use your registered legal portal credentials to access your workspace.
            </Typography>
            <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
              <Info size={15} color="#b08d57" />
              <Typography variant="caption" color="text.secondary">
                Inputs are sanitized and sessions are stored securely.
              </Typography>
            </Stack>
            {apiError && <Alert severity="error" sx={{ mb: 2 }}>{apiError}</Alert>}
            {lockedOut && <Alert severity="warning" sx={{ mb: 2 }}>Too many failed attempts. Please wait {lockoutSecs}s before trying again.</Alert>}
            <Box component="form" onSubmit={handleLogin} noValidate>
              <TextField
                margin="normal"
                required
                fullWidth
                label="Email address"
                name="email"
                type="email"
                autoComplete="email"
                autoFocus
                value={formData.email}
                onChange={handleChange}
                error={!!errors.email}
                helperText={errors.email}
                inputProps={{ maxLength: 254 }}
              />
              <TextField
                margin="normal"
                required
                fullWidth
                name="password"
                label="Password"
                type="password"
                autoComplete="current-password"
                value={formData.password}
                onChange={handleChange}
                error={!!errors.password}
                helperText={errors.password}
                inputProps={{ maxLength: 128 }}
              />
              <Button
                type="submit"
                fullWidth
                variant="contained"
                sx={{ mt: 3, py: 1.5 }}
                disabled={loading || lockedOut}
              >
                {loading ? 'Signing in…' : lockedOut ? `Locked (${lockoutSecs}s)` : 'Login'}
              </Button>
            </Box>
            <Divider sx={{ my: 3 }} />
            <Typography variant="body2" align="center">
              Don’t have an account?{' '}
              <Link to="/signup" style={{ color: '#0f1f33', fontWeight: 700, textDecoration: 'none' }}>
                Create one here
              </Link>
            </Typography>
          </Box>
        </Box>
      </Paper>
    </Box>
  );
};
