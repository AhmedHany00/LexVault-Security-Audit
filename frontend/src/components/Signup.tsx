import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import {
  Box, Typography, TextField, Button, Alert,
  Paper, MenuItem, Select, InputLabel, FormControl, FormHelperText, Stack, Divider, Avatar,
} from '@mui/material';
import { UserPlus, Building2, ShieldCheck } from 'lucide-react';
import { PasswordStrengthMeter } from './PasswordStrengthMeter';
import { sanitizeText } from '../utils/sanitize';
import { validateEmail, validatePassword, validateName } from '../utils/validation';
type Role = 'client' | 'lawyer' | 'paralegal' | 'admin';
interface FormData {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  confirmPassword: string;
  role: Role;
}
interface FormErrors {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  confirmPassword: string;
}
export const Signup = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState<FormData>({
    firstName: '', lastName: '', email: '',
    password: '', confirmPassword: '', role: 'client',
  });
  const [errors, setErrors] = useState<FormErrors>({
    firstName: '', lastName: '', email: '', password: '', confirmPassword: '',
  });
  const [apiError, setApiError] = useState('');
  const [loading, setLoading] = useState(false);
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement> | { target: { name: string; value: string } }) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name as keyof FormErrors] !== undefined) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
    setApiError('');
  };
  const validate = () => {
    const firstResult = validateName(formData.firstName, 'First name');
    const lastResult = validateName(formData.lastName, 'Last name');
    const emailResult = validateEmail(formData.email);
    const pwResult = validatePassword(formData.password);
    const confirmMatch = formData.password === formData.confirmPassword;
    const newErrors: FormErrors = {
      firstName: firstResult.valid ? '' : firstResult.message,
      lastName: lastResult.valid ? '' : lastResult.message,
      email: emailResult.valid ? '' : emailResult.message,
      password: pwResult.valid ? '' : pwResult.message,
      confirmPassword: confirmMatch ? '' : 'Passwords do not match.',
    };
    setErrors(newErrors);
    return Object.values(newErrors).every(v => v === '');
  };
  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setApiError('');
    setLoading(true);
    const payload = {
      firstName: sanitizeText(formData.firstName),
      lastName: sanitizeText(formData.lastName),
      email: sanitizeText(formData.email),
      password: formData.password,
      role: formData.role,
    };
    try {
      await axios.post('http://localhost:3000/api/auth/register', payload);
      localStorage.setItem(
        `slms_name_${payload.email}`,
        JSON.stringify({ firstName: payload.firstName, lastName: payload.lastName })
      );
      navigate('/login');
    } catch (err: unknown) {
      const msg = (axios.isAxiosError(err) && err.response?.data?.message)
        ? err.response.data.message
        : 'Registration failed. Please try again.';
      setApiError(msg);
    } finally {
      setLoading(false);
    }
  };
  return (
    <Box sx={{ minHeight: '100vh', display: 'grid', placeItems: 'center', px: 2, py: 4 }}>
      <Paper elevation={0} sx={{ width: '100%', maxWidth: 1180, overflow: 'hidden', borderRadius: 5, display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1.05fr 0.95fr' } }}>
        <Box sx={{ p: { xs: 4, md: 6 }, bgcolor: 'background.paper' }}>
          <Box sx={{ maxWidth: 520, mx: 'auto' }}>
            <Avatar sx={{ width: 64, height: 64, bgcolor: 'secondary.main', mb: 3 }}>
              <UserPlus size={28} />
            </Avatar>
            <Typography variant="h4" sx={{ mb: 1 }}>Create your account</Typography>
            <Typography color="text.secondary" sx={{ mb: 3, lineHeight: 1.7 }}>
              Register once and use the portal for secure case tracking, client communication, and document handling.
            </Typography>
            <Stack spacing={1.5} sx={{ mb: 3 }}>
              {[
                'Professional access for legal teams and clients',
                'Secure session handling and input sanitization',
                'Fast onboarding with role-based permissions',
              ].map(item => (
                <Stack key={item} direction="row" spacing={1.25} alignItems="flex-start">
                  <ShieldCheck size={18} style={{ marginTop: 3 }} />
                  <Typography color="text.secondary">{item}</Typography>
                </Stack>
              ))}
            </Stack>
            <Divider sx={{ mb: 3 }} />
            {apiError && <Alert severity="error" sx={{ mb: 2 }}>{apiError}</Alert>}
            <Box component="form" onSubmit={handleSignup} noValidate>
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
                <TextField
                  required
                  label="First name"
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleChange}
                  error={!!errors.firstName}
                  helperText={errors.firstName}
                  inputProps={{ maxLength: 50 }}
                />
                <TextField
                  required
                  label="Last name"
                  name="lastName"
                  value={formData.lastName}
                  onChange={handleChange}
                  error={!!errors.lastName}
                  helperText={errors.lastName}
                  inputProps={{ maxLength: 50 }}
                />
              </Box>
              <TextField
                required
                sx={{ mt: 2 }}
                label="Email address"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                error={!!errors.email}
                helperText={errors.email}
                inputProps={{ maxLength: 254 }}
              />
              <TextField
                required
                sx={{ mt: 2 }}
                label="Password"
                name="password"
                type="password"
                value={formData.password}
                onChange={handleChange}
                error={!!errors.password}
                helperText={errors.password}
                inputProps={{ maxLength: 128 }}
              />
              <Box sx={{ mt: 1 }}>
                <PasswordStrengthMeter password={formData.password} />
              </Box>
              <TextField
                required
                sx={{ mt: 2 }}
                label="Confirm password"
                name="confirmPassword"
                type="password"
                value={formData.confirmPassword}
                onChange={handleChange}
                error={!!errors.confirmPassword}
                helperText={errors.confirmPassword}
                inputProps={{ maxLength: 128 }}
              />
              <FormControl fullWidth sx={{ mt: 2 }}>
                <InputLabel id="role-label">Role</InputLabel>
                <Select
                  labelId="role-label"
                  name="role"
                  value={formData.role}
                  label="Role"
                  onChange={e => handleChange({ target: { name: 'role', value: e.target.value } })}
                >
                  <MenuItem value="client">Client</MenuItem>
                  <MenuItem value="lawyer">Lawyer</MenuItem>
                  <MenuItem value="paralegal">Paralegal</MenuItem>
                  <MenuItem value="admin">Admin</MenuItem>
                </Select>
                <FormHelperText>
                  Choose the role that matches your responsibilities inside the firm.
                </FormHelperText>
              </FormControl>
              <Button type="submit" fullWidth variant="contained" sx={{ mt: 3, py: 1.5 }} disabled={loading}>
                {loading ? 'Registering…' : 'Create account'}
              </Button>
              <Typography variant="body2" align="center" sx={{ mt: 2 }}>
                Already have an account?{' '}
                <Link to="/login" style={{ color: '#0f1f33', fontWeight: 700, textDecoration: 'none' }}>
                  Sign in here
                </Link>
              </Typography>
            </Box>
          </Box>
        </Box>
        <Box sx={{ p: { xs: 4, md: 6 }, bgcolor: 'primary.main', color: 'primary.contrastText', position: 'relative', overflow: 'hidden' }}>
          <Box sx={{ position: 'absolute', inset: 0, background: 'radial-gradient(circle at top left, rgba(176,141,87,0.35), transparent 35%)' }} />
          <Box sx={{ position: 'relative' }}>
            <Avatar sx={{ width: 56, height: 56, bgcolor: 'rgba(255,255,255,0.12)', mb: 3 }}>
              <Building2 size={24} />
            </Avatar>
            <Typography variant="h4" sx={{ mb: 2 }}>
              Built for a serious legal workflow
            </Typography>
            <Typography sx={{ opacity: 0.88, lineHeight: 1.7, mb: 4 }}>
              The portal keeps case files structured, protects sensitive records, and presents a clean experience for a modern law office.
            </Typography>
            <Stack spacing={2.2}>
              {[
                'Professional navigation and case management',
                'Audit-friendly document handling',
                'Security-first design language for client trust',
              ].map(item => (
                <Stack key={item} direction="row" spacing={1.25} alignItems="flex-start">
                  <ShieldCheck size={18} style={{ marginTop: 3, flexShrink: 0 }} />
                  <Typography sx={{ opacity: 0.9 }}>{item}</Typography>
                </Stack>
              ))}
            </Stack>
          </Box>
        </Box>
      </Paper>
    </Box>
  );
};
